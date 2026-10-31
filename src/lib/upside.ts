/** Morningstar sends fair value as text ("123.45", sometimes "1 234,5"); undefined if unparsable. */
export function parseFairValue(text: string | null | undefined) {
  if (!text) return undefined;
  const n = Number(text.replace(/[\s ]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** How far `target` is above `price`, as a ratio; undefined without both. */
export const upside = (price: number | null | undefined, target: number | undefined) =>
  price && target ? target / price - 1 : undefined;

/** Largest target upside first; rows without one last, by fair-value upside. */
export const byUpside = (
  a: { targetUpside?: number; fairUpside?: number },
  b: { targetUpside?: number; fairUpside?: number },
) =>
  (b.targetUpside ?? -Infinity) - (a.targetUpside ?? -Infinity) ||
  (b.fairUpside ?? -Infinity) - (a.fairUpside ?? -Infinity);
