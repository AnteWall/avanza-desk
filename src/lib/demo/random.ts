// Seeded randomness so every demo run (and every screenshot) shows the same numbers.

/** mulberry32: a tiny, fast PRNG; `seed` picks the sequence. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stable seed from any string (an orderbook id, a URL). */
export function seedOf(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/**
 * `n` prices of a random walk that ends exactly at `end`: generated forward, then scaled so the
 * last point lands on today's price. `vol` is the daily standard deviation as a fraction.
 */
export function walk(seed: number, n: number, end: number, { drift = 0.0004, vol = 0.015 } = {}) {
  const r = rng(seed);
  const out = [1];
  for (let i = 1; i < n; i++) {
    // Box–Muller for a normal step.
    const z = Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
    out.push(out[i - 1] * Math.exp(drift + vol * z));
  }
  const scale = end / out[n - 1];
  return out.map((v) => v * scale);
}

export const round = (value: number, decimals = 2) => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};
