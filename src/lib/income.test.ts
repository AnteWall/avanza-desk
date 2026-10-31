import type { Dividend, UpcomingDividend } from "avanza-ts";
import { expect, test } from "vitest";

import type { Holding } from "@/lib/avanza/portfolio";

import { forecastIncome } from "./income";

const holding = (isin: string, volume: number, cost: number) =>
  ({ key: isin, isin, name: isin, volume, cost, value: cost }) as Holding;
const paid = (isin: string, date: string, perShare: number) =>
  ({ isin, date, amountPerShareInSek: perShare, stockRedemptionPayment: false }) as Dividend;
const upcoming = (isin: string, date: string, perShare: number) =>
  ({ isin, date, amountPerShareInSek: perShare }) as UpcomingDividend;

test("announced dividends replace last year's payout; others repeat a year later", () => {
  const { months, rows } = forecastIncome(
    [holding("A", 10, 1000), holding("B", 100, 0)],
    // Same payout listed for two accounts: counted once, for the volume held now.
    [upcoming("A", "2027-04-20", 6), upcoming("A", "2027-04-20", 6)],
    [
      paid("A", "2026-04-15", 5),
      paid("A", "2025-04-15", 4),
      paid("B", "2026-02-10", 1),
      paid("B", "2024-02-10", 9), // older than two years: no projection, no growth base
    ],
    "2026-10-31",
  );
  expect(months).toHaveLength(12);
  expect(months[0]!.month).toBe("2026-10");
  expect(months.find((m) => m.month === "2027-04")).toMatchObject({ announced: 60, estimated: 0 });
  expect(months.find((m) => m.month === "2027-02")).toMatchObject({ announced: 0, estimated: 100 });
  const a = rows.find((r) => r.holding.isin === "A")!;
  expect(a).toMatchObject({ income: 60, yieldOnCost: 0.06 });
  expect(a.growth).toBeCloseTo(0.25);
  expect(rows.find((r) => r.holding.isin === "B")).toMatchObject({
    income: 100,
    yieldOnCost: null,
    growth: null,
  });
});
