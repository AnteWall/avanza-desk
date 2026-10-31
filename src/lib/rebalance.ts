/** Setting holding the saved target weights (0…1) by holding key. */
export const targetsKey = "rebalance:targets";

/** A holding to rebalance: SEK value, units held and its target share (0…1) of the total. */
export type Position = { key: string; type: string; value: number; volume: number; target: number };

/**
 * The trade per holding, in SEK (`amount`, + buy / − sell) and for listed instruments in whole
 * shares (`shares`, rounded toward zero so a buy never exceeds the money). Funds trade in SEK.
 */
export type Trade = { key: string; desired: number; amount: number; shares: number | null };

/**
 * Trades that move the holdings to their targets after adding `newMoney` SEK. `buyOnly` never
 * sells: the new money goes to underweight holdings in proportion to how far below target each
 * is, and none of them past its target.
 */
export function rebalance(
  positions: readonly Position[],
  newMoney: number,
  buyOnly: boolean,
): Trade[] {
  const total = positions.reduce((s, p) => s + p.value, 0) + newMoney;
  const gaps = positions.map((p) => p.target * total - p.value);
  const deficit = gaps.reduce((s, g) => s + Math.max(g, 0), 0);
  const scale = buyOnly && deficit > newMoney ? newMoney / deficit : 1;
  return positions.map((p, i) => {
    const gap = gaps[i]!;
    const raw = buyOnly ? Math.max(gap, 0) * scale : gap;
    const price = p.volume > 0 ? p.value / p.volume : 0;
    if (p.type === "FUND" || price <= 0)
      return { key: p.key, desired: p.value + gap, amount: raw, shares: null };
    const shares = Math.trunc(raw / price);
    return { key: p.key, desired: p.value + gap, amount: shares * price, shares };
  });
}
