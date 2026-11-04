import type { YearSummaryResponse } from "avanza-ts";
import { describe, expect, it } from "vitest";

import { yearRows, yearsSince } from "@/lib/years";

const summary = (startValue: number, currentValue: number, totalDeposits: number) =>
  ({
    development: { startValue, currentValue, totalDeposits, totalDividends: 10 },
    performanceDto: { performanceForPeriod: 12.5 },
  }) as unknown as YearSummaryResponse;

describe("yearRows", () => {
  it("runs deposits up from the first year's start value", () => {
    const rows = yearRows([
      { year: 2024, data: summary(1000, 1500, 300) },
      { year: 2025, data: summary(1500, 2400, 500) },
    ]);
    expect(rows.map((r) => r.deposited)).toEqual([1300, 1800]);
    expect(rows[0]).toMatchObject({ start: 1000, end: 1500, dividends: 10, return: 0.125 });
  });
  it("is empty without summaries", () => expect(yearRows([])).toEqual([]));
});

describe("yearsSince", () => {
  it("lists every year through this one", () =>
    expect(yearsSince("2022-03-01", 2025)).toEqual([2022, 2023, 2024, 2025]));
  it("falls back to this year on a bad date", () => expect(yearsSince("", 2025)).toEqual([2025]));
});
