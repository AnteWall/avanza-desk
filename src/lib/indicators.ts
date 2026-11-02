// Technical indicators over a price series. Each returns one value per input point, `null`
// where there isn't enough history yet, so results line up with the candles by index.

export type Bar = { timestamp: number; open: number; high: number; low: number; close: number };
export type Volumed = Bar & { totalVolumeTraded: number };

type Series = (number | null)[];

/** Simple moving average of the last `n` closes. */
export function sma(closes: readonly number[], n: number): Series {
  let sum = 0;
  return closes.map((c, i) => {
    sum += c - (i >= n ? closes[i - n]! : 0);
    return i >= n - 1 ? sum / n : null;
  });
}

/** Exponential moving average, seeded with the first `n` closes' simple average. */
export function ema(closes: readonly number[], n: number): Series {
  const k = 2 / (n + 1);
  let prev: number | null = null;
  return closes.map((c, i) => {
    if (i < n - 1) return null;
    prev =
      prev == null ? closes.slice(0, n).reduce((a, b) => a + b, 0) / n : c * k + prev * (1 - k);
    return prev;
  });
}

/** Wilder's relative strength index (0…100). */
export function rsi(closes: readonly number[], n = 14): Series {
  let gain = 0;
  let loss = 0;
  return closes.map((c, i) => {
    if (i === 0) return null;
    const d = c - closes[i - 1]!;
    const up = Math.max(d, 0);
    const down = Math.max(-d, 0);
    if (i <= n) {
      gain += up / n;
      loss += down / n;
      if (i < n) return null;
    } else {
      gain = (gain * (n - 1) + up) / n;
      loss = (loss * (n - 1) + down) / n;
    }
    return loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  });
}

/** MACD (12/26 EMA difference), its 9-period signal line, and the histogram between them. */
export function macd(closes: readonly number[], fast = 12, slow = 26, signal = 9) {
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  const line = closes.map((_, i) => (f[i] != null && s[i] != null ? f[i]! - s[i]! : null));
  const start = line.findIndex((v) => v != null);
  const sig: Series =
    start < 0
      ? line.map(() => null)
      : [...line.slice(0, start), ...ema(line.slice(start) as number[], signal)];
  return {
    line,
    signal: sig,
    histogram: line.map((v, i) => (v != null && sig[i] != null ? v - sig[i]! : null)),
  };
}

/** Running volume-weighted average of the typical price ((high + low + close) / 3). */
export function vwap(bars: readonly Volumed[]): Series {
  let pv = 0;
  let vol = 0;
  return bars.map((b) => {
    pv += ((b.high + b.low + b.close) / 3) * b.totalVolumeTraded;
    vol += b.totalVolumeTraded;
    return vol > 0 ? pv / vol : null;
  });
}
