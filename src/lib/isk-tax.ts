// Swedish ISK tax (schablonskatt). The yearly levy is 30 % of a notional income: the capital base
// above the tax-free allowance times the government bond rate at 30 Nov the year before + 1 pp,
// at least 1.25 %. The base is a quarter of (the value at each quarter's start + the year's
// deposits). The allowance is per person, shared across all ISK and KF.

/** Known rates (already +1 pp) and allowances; later years fall back to the latest one. */
export const iskYears: Record<number, { rate: number; allowance: number }> = {
  2024: { rate: 0.0362, allowance: 0 },
  2025: { rate: 0.0296, allowance: 150_000 },
  // shortcut: 2026 rate is our best figure, the UI lets the user correct it; update yearly.
  2026: { rate: 0.0355, allowance: 300_000 },
};

export function iskYear(year: number) {
  const known = Object.keys(iskYears).map(Number);
  return (
    iskYears[year] ?? iskYears[Math.max(...known.filter((y) => y <= year), Math.min(...known))]!
  );
}

export const quarterStarts = (year: number) =>
  ["01-01", "04-01", "07-01", "10-01"].map((md) => `${year}-${md}`);

export function iskTax({
  quarterValues,
  deposits,
  rate,
  allowance,
}: {
  quarterValues: readonly number[];
  deposits: number;
  rate: number;
  allowance: number;
}) {
  const base = (quarterValues.reduce((sum, v) => sum + v, 0) + deposits) / 4;
  const taxable = Math.max(0, base - allowance);
  const income = taxable * Math.max(rate, 0.0125);
  return { base, taxable, income, tax: income * 0.3 };
}
