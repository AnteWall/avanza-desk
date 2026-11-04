import type { YearSummaryResponse } from "avanza-ts";

/** One calendar year of the whole portfolio, amounts in SEK. */
export type YearRow = {
  year: number;
  start: number;
  end: number;
  deposits: number;
  dividends: number;
  /** Avanza's return for the year, as a ratio. */
  return: number;
  /** Money put in so far: the first year's start value plus every deposit up to this year's end. */
  deposited: number;
};

/** Year summaries (oldest first) as rows, with deposits running up across the years. */
export function yearRows(summaries: readonly { year: number; data: YearSummaryResponse }[]) {
  let deposited = summaries[0]?.data.development.startValue ?? 0;
  return summaries.map(({ year, data: { development: d, performanceDto: p } }): YearRow => {
    deposited += d.totalDeposits;
    return {
      year,
      start: d.startValue,
      end: d.currentValue,
      deposits: d.totalDeposits,
      dividends: d.totalDividends,
      // Avanza sends percent units.
      return: p.performanceForPeriod / 100,
      deposited,
    };
  });
}

/** Calendar years from the year of `earliest` (yyyy-MM-dd…) through `thisYear`. */
export function yearsSince(earliest: string, thisYear: number) {
  const first = Math.min(Number(earliest.slice(0, 4)) || thisYear, thisYear);
  return Array.from({ length: thisYear - first + 1 }, (_, i) => first + i);
}
