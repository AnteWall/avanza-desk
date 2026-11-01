import type { Transaction } from "avanza-ts";
import { expect, test } from "vitest";

import { profileTrades } from "./trading-profile";

const TODAY = "2026-10-31";
let n = 0;
const tx = (type: "BUY" | "SELL", isin: string, date: string, volume: number, price: number) =>
  ({
    id: String(n++),
    type,
    isin,
    orderbook: { id: `ob-${isin}`, name: isin, type: "STOCK" },
    date,
    tradeDate: date,
    cancelled: false,
    account: { id: "isk" },
    volume: { value: type === "SELL" ? -volume : volume },
    amount: { value: (type === "SELL" ? 1 : -1) * volume * price },
    commission: { value: 1 },
  }) as unknown as Transaction;

test("matches sells to buys first in, first out and reports realized result", () => {
  const p = profileTrades(
    [
      tx("BUY", "A", "2026-01-02", 10, 100),
      tx("BUY", "A", "2026-02-02", 10, 120),
      tx("SELL", "A", "2026-03-02", 15, 110),
      tx("SELL", "B", "2026-03-02", 5, 50), // no buy in range: skipped
      { ...tx("BUY", "A", "2026-03-03", 1, 1), cancelled: true },
    ],
    TODAY,
  );
  expect(p.trades).toBe(4);
  expect(p.closed).toBe(2);
  expect(p.realized).toBe(10 * 10 - 5 * 10);
  expect(p.winRate).toBe(0.5);
});

test("finds held losers, a profit-taking band and buy-backs", () => {
  const txs: Transaction[] = [];
  for (let i = 0; i < 8; i++) {
    const isin = `W${i}`;
    txs.push(tx("BUY", isin, "2025-01-06", 10, 100), tx("SELL", isin, "2025-02-05", 10, 115 + i));
  }
  for (let i = 0; i < 4; i++) {
    const isin = `L${i}`;
    txs.push(tx("BUY", isin, "2025-01-06", 10, 100), tx("SELL", isin, "2025-12-02", 10, 70));
  }
  // Sold W0 and W1 at 115/116, bought back at 120 a week later; one more trip on W2.
  txs.push(
    tx("BUY", "W0", "2025-02-12", 10, 120),
    tx("BUY", "W1", "2025-02-12", 10, 120),
    tx("BUY", "W2", "2025-02-12", 10, 117),
  );
  const { findings } = profileTrades(txs, TODAY);
  // The 12 opening buys and 8 winning sells fall in two weeks: bursts too. Habits worth
  // changing come first; bursts can't compare returns (every closed lot was bought then).
  expect(findings.map((f) => [f.id, f.status, f.advice?.tone])).toEqual([
    ["holding", "found", "change"],
    ["round-trips", "found", "change"],
    ["profit-taking", "found", "watch"],
    ["bursts", "found", "watch"],
  ]);
  expect(findings[0]!.advice!.text).toMatch(/median −30,00\s%\safter 330 days/);
  expect(findings[0]!.measures[2]).toMatchObject({ label: "Losers vs winners", value: "11,00×" });
  expect(findings[1]!.impact).toBeCloseTo(-(50 + 40 + 0));
  expect(findings[1]!.evidence.map((e) => [e.isin, e.days, e.result])).toEqual([
    ["W0", 7, -50],
    ["W1", 7, -40],
    ["W2", 7, 0],
  ]);
  // Winners and losers both listed, the biggest loss first.
  expect(findings[0]!.evidence).toHaveLength(12);
  expect(findings[0]!.evidence[0]).toMatchObject({ days: 330, result: -300 });
  expect(findings[3]!.impact).toBe(-20);
});

test("explains every check it did not flag", () => {
  const { findings } = profileTrades(
    [tx("BUY", "A", "2026-01-02", 1, 10), tx("SELL", "A", "2026-01-03", 1, 9)],
    TODAY,
  );
  expect(findings.map((f) => [f.id, f.status])).toEqual([
    ["round-trips", "clear"],
    ["bursts", "clear"],
    ["holding", "too-few"],
    ["profit-taking", "too-few"],
  ]);
  // Nothing to judge yet, so no advice; the clear checks still say keep it up.
  expect(findings.map((f) => f.advice?.tone)).toEqual(["keep", "keep", undefined, undefined]);
  expect(findings[2]!.detail).toBe(
    "It needs at least 4 winning and 4 losing sells; you have 0 and 1.",
  );
  expect(findings.every((f) => f.impact === undefined && f.rule && f.measures.length)).toBe(true);
});

test("compares the last 12 months with before, and lists each year", () => {
  const txs: Transaction[] = [];
  // 2024: four quick buy-backs at a higher price, a habit worth changing.
  for (let i = 0; i < 4; i++) {
    const isin = `R${i}`;
    txs.push(
      tx("BUY", isin, "2024-03-04", 10, 100),
      tx("SELL", isin, "2024-05-06", 10, 110),
      tx("BUY", isin, "2024-05-13", 10, 115),
    );
  }
  // The last 12 months: eight plain trades, no buy-backs.
  for (let i = 0; i < 4; i++) {
    const isin = `P${i}`;
    txs.push(tx("BUY", isin, "2026-02-02", 10, 100), tx("SELL", isin, "2026-06-01", 10, 105));
  }
  const trips = profileTrades(txs, TODAY).findings.find((f) => f.id === "round-trips")!;
  expect(trips.trend).toMatchObject({
    direction: "better",
    recent: "0",
    beforeTone: "change",
    recentTone: "keep",
  });
  expect(trips.history.map((p) => [p.label, p.status, p.metric])).toEqual([
    ["2026", "clear", "0"],
    ["2025", "clear", "–"], // no trades that year
    ["2024", "found", expect.any(String)],
  ]);
});
