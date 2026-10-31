import { expect, test } from "vitest";

import { bySignalRank, deriveSignals } from "./signals";

const DAY = 24 * 60 * 60_000;
const now = Date.parse("2026-10-31T12:00:00Z");
const plain = (s: string) => s.replace(/\s/g, " ");

const trade = (date: string, totalValue: number, extra = {}) => ({
  transactionDate: date,
  totalValue,
  currency: "SEK",
  marketTransaction: true,
  equityProgram: false,
  ...extra,
});

test("nets recent insider market trades and ignores equity programs and old trades", () => {
  const insiders = {
    transactions: [
      trade("2026-10-20", 3_000_000),
      trade("2026-10-25", -1_000_000),
      trade("2026-10-26", -9_000_000, { equityProgram: true }),
      trade("2026-08-01", -9_000_000),
    ],
  } as never;
  const [s] = deriveSignals("x", { insiders }, now);
  expect(s).toMatchObject({ kind: "insider", date: "2026-10-25", tone: "up" });
  expect(plain(s!.text)).toContain("net bought 2 mn SEK");
  expect(s!.score).toBeCloseTo(Math.log10(2e6) - 5);
});

test("short interest change in percentage points, fractions or percent units alike", () => {
  const series = (a: number, b: number) => ({
    shortSellingHistory: [
      { timestamp: now - 20 * DAY, ratio: a },
      { timestamp: now, ratio: b },
    ],
  });
  const [pct] = deriveSignals("x", { shorts: series(1.5, 2.5) as never }, now);
  expect(pct).toMatchObject({ kind: "short", tone: "down", score: 2 });
  const [frac] = deriveSignals("x", { shorts: series(0.015, 0.025) as never }, now);
  expect(frac!.score).toBeCloseTo(2);
  expect(deriveSignals("x", { shorts: series(1.5, 1.7) as never }, now)).toEqual([]);
});

test("owners, target and consensus moves; flat or short history gives nothing", () => {
  const owners = {
    ownersPoints: [
      { timestamp: now - 8 * DAY, numberOfOwners: 1000 },
      { timestamp: now, numberOfOwners: 1100 },
    ],
  } as never;
  const target = [
    { day: "2026-10-05", value: 100 },
    { day: "2026-10-31", value: 95 },
  ];
  const consensus = [
    { day: "2026-10-05", value: 0.4 },
    { day: "2026-10-31", value: 0.45 },
  ];
  const kinds = deriveSignals("x", { owners, target, consensus }, now).map((s) => [s.kind, s.tone]);
  expect(kinds).toEqual([
    ["owners", "up"],
    ["target", "down"],
  ]);
  expect(deriveSignals("x", { target: target.slice(1) }, now)).toEqual([]);
});

test("reports within a week, ranked newest first", () => {
  const events = [
    { eventType: "QUARTERLY_REPORT", timestamp: now + 2 * DAY },
    { eventType: "DIVIDEND", timestamp: now + DAY },
    { eventType: "ANNUAL_REPORT", timestamp: now + 30 * DAY },
  ];
  const signals = deriveSignals("x", { events }, now);
  expect(signals.map((s) => s.text)).toEqual(["Reports in 2 days"]);
  const ranked = [
    { ...signals[0]!, date: "2026-10-01" },
    { ...signals[0]!, date: "2026-10-02", score: 1 },
    { ...signals[0]!, date: "2026-10-02", score: 3 },
  ].sort(bySignalRank);
  expect(ranked.map((s) => s.score)).toEqual([3, 1, 1]);
});
