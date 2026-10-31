import { expect, test } from "vitest";

import type { Holding } from "@/lib/avanza/portfolio";

import {
  describeRule,
  evaluateRules,
  ltvRatio,
  measure,
  suggestRules,
  unfired,
  type AlertRule,
  type RuleState,
  type StockFacts,
} from "./alert-rules";

const holding = (key: string, value: number, today: number, cost: number): Holding =>
  ({
    key,
    orderbookId: key,
    name: key,
    type: "STOCK",
    value,
    today,
    cost,
    profit: value - cost,
  }) as Holding;

const rule = (
  kind: AlertRule["kind"],
  threshold: number,
  extra: Partial<AlertRule> = {},
): AlertRule => ({
  id: kind,
  kind,
  threshold,
  created: "2026-10-30",
  ...extra,
});

const state = (s: Partial<RuleState> = {}): RuleState => ({
  holdings: [],
  ltv: [],
  stocks: new Map(),
  targets: {},
  signals: [],
  session: "Today",
  ...s,
});

const keys = (r: AlertRule, s: RuleState) => evaluateRules([r], s).map((f) => f.key);

test("holding conditions fire per holding, or only for the target", () => {
  const s = state({ holdings: [holding("a", 80, -20, 100), holding("b", 20, 1, 20)] });
  expect(keys(rule("day-move", 15), s)).toEqual(["day-move:a"]); // -20 of 100
  expect(keys(rule("loss", 20), s)).toEqual(["loss:a"]);
  expect(keys(rule("weight", 50), s)).toEqual(["weight:a"]);
  expect(keys(rule("weight", 10, { target: { id: "b", name: "b" } }), s)).toEqual(["weight:b"]);
  expect(keys(rule("weight", 50, { target: { id: "b", name: "b" } }), s)).toEqual([]);
});

test("day moves only notify while the session runs today", () => {
  const s = state({ holdings: [holding("a", 80, -20, 100)], session: "Friday" });
  expect(keys(rule("day-move", 15), s)).toEqual([]);
  expect(measure(rule("day-move", 15), s)[0]!.text).toMatch(/ on Friday$/);
});

test("drift compares weights to saved rebalance targets", () => {
  const s = state({
    holdings: [holding("a", 70, 0, 70), holding("b", 30, 0, 30)],
    targets: { a: 0.5 },
  });
  expect(measure(rule("drift", 5), s).map((m) => [m.key, Math.round(m.value * 100)])).toEqual([
    ["drift:a", 20],
  ]);
  expect(keys(rule("drift", 25), s)).toEqual([]);
});

test("stock rules read facts: held stocks by default, any stock when targeted", () => {
  const stocks = new Map<string, StockFacts>([
    ["h", { name: "H", held: true, short: 0.06, upside: 0.3, dayChange: 0.01 }],
    ["w", { name: "W", held: false, short: 0.08, dayChange: -0.07 }],
  ]);
  const s = state({ stocks });
  expect(keys(rule("short", 5), s)).toEqual(["short:h"]);
  expect(keys(rule("short", 5, { target: { id: "w", name: "W" } }), s)).toEqual(["short:w"]);
  expect(keys(rule("upside", 25), s)).toEqual(["upside:h"]);
  expect(keys(rule("day-move", 5, { target: { id: "w", name: "W" } }), s)).toEqual(["day-move:w"]);
  expect(
    keys(
      rule("ltv", 40),
      state({
        ltv: [
          { accountId: "x", value: 0.45 },
          { accountId: "y", value: 0.3 },
        ],
      }),
    ),
  ).toEqual(["ltv:x"]);
});

test("signal rule: held (or target), kind filter, strong enough, dated after the rule", () => {
  const signal = (date: string, score: number, held = true, kind = "insider") =>
    ({ orderbookId: held ? "s" : "w", kind, date, score, held, name: "S", text: "t" }) as never;
  const s = state({
    signals: [
      signal("2026-10-31", 3),
      signal("2026-10-29", 3),
      signal("2026-10-31", 1),
      signal("2026-10-31", 4, false),
      signal("2026-10-31", 4, true, "short"),
    ],
  });
  expect(keys(rule("signal", 2), s)).toEqual([
    "signal:s:insider:2026-10-31",
    "signal:s:short:2026-10-31",
  ]);
  expect(keys(rule("signal", 2, { signalKind: "short" }), s)).toEqual([
    "signal:s:short:2026-10-31",
  ]);
  expect(keys(rule("signal", 2, { target: { id: "w", name: "W" } }), s)).toEqual([
    "signal:w:insider:2026-10-31",
  ]);
});

test("describes rules in plain words", () => {
  expect(describeRule(rule("day-move", 2.5, { target: { id: "v", name: "Volvo B" } }))).toBe(
    "Volvo B moves 2,5 % or more in a day",
  );
  expect(describeRule(rule("signal", 2, { signalKind: "insider" }))).toBe(
    "A held stock gets a signal (insider trades) scoring 2 or more",
  );
});

test("suggests rules from your numbers and skips covered ones", () => {
  const s = state({
    holdings: [holding("a", 230, 0, 200), holding("b", 770, 0, 700)].sort(
      (x, y) => y.value - x.value,
    ),
    stocks: new Map([["a", { name: "a", held: true, short: 0.042 }]]),
    ltv: [{ accountId: "x", value: 0.22 }],
  });
  const kinds = (rules: AlertRule[]) =>
    suggestRules(s, rules).map((r) => `${r.kind}:${r.threshold}:${r.target?.id ?? ""}`);
  expect(kinds([])).toEqual(["signal:2:", "day-move:5:", "weight:85:b", "ltv:40:", "short:7:a"]);
  expect(kinds([rule("signal", 3), rule("weight", 50)])).toEqual([
    "day-move:5:",
    "ltv:40:",
    "short:7:a",
  ]);
});

test("conditions re-fire daily, signals once, old entries pruned", () => {
  const cond = { key: "c", once: false, title: "", body: "" };
  const sig = { key: "s", once: true, title: "", body: "" };
  const first = unfired([cond, sig], { old: "2026-01-01" }, "2026-10-30");
  expect(first.fresh).toHaveLength(2);
  expect(first.next).toEqual({ c: "2026-10-30", s: "2026-10-30" });
  expect(unfired([cond, sig], first.next, "2026-10-30").fresh).toEqual([]);
  expect(unfired([cond, sig], first.next, "2026-10-31").fresh).toEqual([cond]);
});

test("loan-to-value reads its unit from the account's own numbers", () => {
  const credit = (currentLtv: number, used: number, collateral: number) =>
    ({
      currentLtv,
      currentUsedCredit: used,
      currentTotalPotentialCollateralValue: collateral,
    }) as Parameters<typeof ltvRatio>[0];
  // 120 % as a ratio stays 120 %, not 1.2 %; 0.8 % in percent stays 0.8 %, not 80 %.
  expect(ltvRatio(credit(1.2, 120, 100))).toBe(1.2);
  expect(ltvRatio(credit(0.8, -8, 1000))).toBeCloseTo(0.008);
  expect(ltvRatio(credit(30, 300, 700))).toBeCloseTo(0.3);
  expect(ltvRatio(credit(0, 0, 1000))).toBe(0);
  expect(ltvRatio(credit(45, 0, 0))).toBeCloseTo(0.45);
});
