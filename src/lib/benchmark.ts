/** A cumulative return in percent units (Avanza's relative series), or a rebased ratio. */
export type ReturnPoint = { timestamp: number; value: number };
/** Money into the portfolio (positive) or out of it (negative) on `date` (epoch ms). */
export type CashFlow = { date: number; amount: number };

/** Percent-unit cumulative returns as ratios that start at 0, whatever the series' own base. */
export function rebase(points: readonly ReturnPoint[]): ReturnPoint[] {
  const base = 1 + (points[0]?.value ?? 0) / 100;
  return points.map((p) => ({ timestamp: p.timestamp, value: (1 + p.value / 100) / base - 1 }));
}

/** Growth factor of a rebased series at `t`: the last point at or before it (the first if earlier). */
function growthAt(series: readonly ReturnPoint[], t: number) {
  let g = 1 + (series[0]?.value ?? 0);
  for (const p of series) {
    if (p.timestamp > t) break;
    g = 1 + p.value;
  }
  return g;
}

/** What the cash flows would be worth at the series' end had each gone into it on its date. */
export function simulate(flows: readonly CashFlow[], series: readonly ReturnPoint[]) {
  const end = 1 + (series.at(-1)?.value ?? 0);
  return flows.reduce((sum, f) => sum + (f.amount * end) / growthAt(series, f.date), 0);
}

const YEAR = 365.25 * 24 * 60 * 60_000;

/**
 * Annualized money-weighted return (XIRR). `flows` are from the investor's side: money paid in
 * is negative, money out (and the end value) positive. `null` when no rate balances them.
 */
export function xirr(flows: readonly CashFlow[]): number | null {
  if (flows.length < 2) return null;
  const t0 = Math.min(...flows.map((f) => f.date));
  const npv = (r: number) =>
    flows.reduce((sum, f) => sum + f.amount / (1 + r) ** ((f.date - t0) / YEAR), 0);
  let lo = -0.99;
  let hi = 10;
  if (Math.sign(npv(lo)) === Math.sign(npv(hi))) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (Math.sign(npv(mid)) === Math.sign(npv(lo))) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
