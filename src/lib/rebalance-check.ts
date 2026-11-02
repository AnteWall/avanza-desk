import type { ReturnPoint } from "@/lib/benchmark";

/** Trading days in a year and a month, for annualising daily numbers. */
const YEAR_DAYS = 252;
const MONTH_DAYS = 21;
export const DAY = 24 * 60 * 60_000;

/** Growth factors of several instruments on shared days: `growth[i][t]`, each 1 on day 0. */
export type Growth = { timestamps: number[]; growth: number[][] };

/**
 * Line up rebased return series (ratios from 0) on one calendar: from the day the youngest one
 * starts, over every day any of them has a price, carrying the last price over days one lacks
 * (holidays differ between markets; funds price on other days than stocks).
 * Each instrument is rebased to 1 on the first shared day.
 */
export function alignGrowth(series: readonly (readonly ReturnPoint[])[]): Growth {
  const day = (t: number) => Math.round(t / DAY);
  const start = Math.max(...series.map((s) => day(s[0]!.timestamp)));
  const days = [...new Set(series.flatMap((s) => s.map((p) => day(p.timestamp))))]
    .filter((d) => d >= start)
    .sort((a, b) => a - b);
  const growth = series.map((s) => {
    const byDay = new Map(s.map((p) => [day(p.timestamp), 1 + p.value]));
    // The last price at or before the start: what day 0 is measured from.
    let last = 1 + s[0]!.value;
    for (const p of s) if (day(p.timestamp) <= start) last = 1 + p.value;
    const base = last;
    return days.map((d) => {
      last = byDay.get(d) ?? last;
      return last / base;
    });
  });
  return { timestamps: days.map((d) => d * DAY), growth };
}

/**
 * Value of a portfolio bought on day 0 and left alone (no rebalancing along the way): `weights`
 * of the money in each instrument, the rest (1 − Σ weights) in cash at 0 %. Starts at 1.
 */
export function holdValue(weights: readonly number[], g: Growth): number[] {
  const cash = 1 - weights.reduce((s, w) => s + w, 0);
  return g.timestamps.map((_, t) =>
    weights.reduce((s, w, i) => (w ? s + w * g.growth[i]![t]! : s), cash),
  );
}

/** Day-to-day simple returns of a value or growth series. */
export const dailyReturns = (values: readonly number[]) =>
  values.slice(1).map((v, t) => v / values[t]! - 1);

const mean = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0) / (xs.length || 1);

/** Sample standard deviation; 0 under two values. */
function std(xs: readonly number[]) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Largest fall from a peak, as a positive fraction (0.2 = fell 20 %). */
export function maxDrawdown(values: readonly number[]) {
  let peak = -Infinity;
  let worst = 0;
  for (const v of values) {
    peak = Math.max(peak, v);
    worst = Math.max(worst, 1 - v / peak);
  }
  return worst;
}

/** What one held portfolio did: total return, yearly volatility, worst fall, return per risk. */
export function historyStats(values: readonly number[]) {
  const r = dailyReturns(values);
  const ret = (values.at(-1) ?? 1) / (values[0] ?? 1) - 1;
  const vol = std(r) * Math.sqrt(YEAR_DAYS);
  const yearly = r.length ? (1 + ret) ** (YEAR_DAYS / r.length) - 1 : 0;
  return { ret, vol, maxDrawdown: maxDrawdown(values), sharpe: vol ? yearly / vol : 0 };
}

/** How far apart two held portfolios moved: yearly std of their daily return difference. */
export function trackingError(a: readonly number[], b: readonly number[]) {
  const ra = dailyReturns(a);
  const rb = dailyReturns(b);
  return std(ra.map((x, t) => x - rb[t]!)) * Math.sqrt(YEAR_DAYS);
}

/** Sample covariance matrix of daily returns, one row per instrument. */
export function covariance(returns: readonly (readonly number[])[]): number[][] {
  const means = returns.map(mean);
  const n = returns[0]?.length ?? 0;
  return returns.map((a, i) =>
    returns.map((b, j) => {
      let s = 0;
      for (let t = 0; t < n; t++) s += (a[t]! - means[i]!) * (b[t]! - means[j]!);
      return s / (n - 1);
    }),
  );
}

/** Σw: each instrument's covariance with the portfolio. */
const marginal = (w: readonly number[], cov: readonly (readonly number[])[]) =>
  cov.map((row) => row.reduce((s, c, j) => s + c * w[j]!, 0));

/** Expected daily volatility of `w` from the covariance: √(wᵀΣw). */
export function portfolioVol(w: readonly number[], cov: readonly (readonly number[])[]) {
  const m = marginal(w, cov);
  return Math.sqrt(
    Math.max(
      0,
      w.reduce((s, wi, i) => s + wi * m[i]!, 0),
    ),
  );
}

/**
 * Each instrument's share of the portfolio's risk (variance): wᵢ(Σw)ᵢ / wᵀΣw. Sums to 1; a
 * holding that moves against the rest gets a negative share.
 */
export function riskShares(w: readonly number[], cov: readonly (readonly number[])[]) {
  const m = marginal(w, cov);
  const parts = w.map((wi, i) => wi * m[i]!);
  const total = parts.reduce((s, p) => s + p, 0);
  return parts.map((p) => (total ? p / total : 0));
}

/** How many equal holdings the weights are worth: (Σw)² / Σw². 10 even ones → 10. */
export function effectiveHoldings(w: readonly number[]) {
  const sum = w.reduce((s, x) => s + x, 0);
  const sq = w.reduce((s, x) => s + x * x, 0);
  return sq ? (sum * sum) / sq : 0;
}

/** Fewer daily returns than this and yearly figures from them are mostly noise. */
export const MIN_DAYS = 60;

/** Yearly volatility from a daily one. */
export const yearly = (dailyVol: number) => dailyVol * Math.sqrt(YEAR_DAYS);

/** A loss a month exceeds about 1 time in 20 (normal approximation), as a fraction. */
export const badMonth = (dailyVol: number) => 1.65 * dailyVol * Math.sqrt(MONTH_DAYS);
