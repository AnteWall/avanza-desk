import type { Exposure } from "@/lib/avanza/portfolio";

/** A holding with its underlying holdings as fractions of its value (from look-through). */
export type Source = {
  key: string;
  name: string;
  type: string;
  value: number;
  parts: readonly Exposure[];
};

export type Pair = { a: Source; b: Source; overlap: number };

export type Shared = {
  key: string;
  name: string;
  orderbookId?: string;
  /** Your SEK exposure to it, directly and through funds. */
  value: number;
  sources: string[];
};

const partKey = (e: Exposure) => e.key ?? e.name;

const isFund = (s: Source) => s.type === "FUND" || s.type === "EXCHANGE_TRADED_FUND";

/**
 * Overlap of every pair of funds/ETFs: Σ min(weight in A, weight in B) over shared holdings.
 * Funds disclose only their largest holdings, so this is a lower bound. Largest first.
 */
export function fundPairs(sources: readonly Source[]): Pair[] {
  const funds = sources.filter((s) => isFund(s) && s.parts.length);
  const weights = funds.map((f) => {
    const m = new Map<string, number>();
    for (const p of f.parts) m.set(partKey(p), (m.get(partKey(p)) ?? 0) + p.weight);
    return m;
  });
  const pairs: Pair[] = [];
  for (let i = 0; i < funds.length; i++)
    for (let j = i + 1; j < funds.length; j++) {
      let overlap = 0;
      for (const [k, w] of weights[i]!) overlap += Math.min(w, weights[j]!.get(k) ?? 0);
      if (overlap > 0) pairs.push({ a: funds[i]!, b: funds[j]!, overlap });
    }
  return pairs.sort((x, y) => y.overlap - x.overlap);
}

/** Underlying holdings you reach through two or more holdings (funds, or a fund and the stock). */
export function sharedHoldings(sources: readonly Source[]): Shared[] {
  const byKey = new Map<string, Shared>();
  for (const s of sources)
    for (const p of s.parts) {
      const key = partKey(p);
      const sh = byKey.get(key) ?? {
        key,
        name: p.name,
        orderbookId: p.orderbookId,
        value: 0,
        sources: [],
      };
      sh.value += s.value * p.weight;
      if (!sh.sources.includes(s.name)) sh.sources.push(s.name);
      byKey.set(key, sh);
    }
  return [...byKey.values()].filter((s) => s.sources.length > 1).sort((a, b) => b.value - a.value);
}
