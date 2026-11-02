import type { OrderDepth } from "avanza-ts";

import { TransactionSide } from "@/lib/avanza/codes";

// A price ladder: one row per price, highest first, with the book's volume on each side and
// your own open orders and stop-loss triggers at the prices they sit at.

export type LadderRow = {
  price: number;
  bidQty?: number;
  askQty?: number;
  /** Your open (unfilled) buy and sell volume at this price. */
  myBuy?: number;
  mySell?: number;
  /** Stop-loss orders that trigger at this price. */
  stops?: number;
  last?: boolean;
};

export type LadderOrder = { price?: number; side?: string; volume?: number; filled?: number };

// Prices arrive as floats; a millionths key keeps 12.3 and 12.300000001 on one row.
const keyOf = (p: number) => Math.round(p * 1e6);

export function buildLadder(
  depth: OrderDepth | undefined,
  orders: readonly LadderOrder[],
  stopPrices: readonly number[],
  last?: number | null,
): LadderRow[] {
  const rows = new Map<number, LadderRow>();
  const at = (price: number) => {
    const k = keyOf(price);
    let row = rows.get(k);
    if (!row) rows.set(k, (row = { price }));
    return row;
  };
  for (const l of depth?.levels ?? []) {
    if (l.buySide) at(l.buySide.price).bidQty = l.buySide.volume;
    if (l.sellSide) at(l.sellSide.price).askQty = l.sellSide.volume;
  }
  for (const o of orders) {
    if (o.price == null || o.volume == null) continue;
    const open = o.volume - (o.filled ?? 0);
    if (open <= 0) continue;
    const row = at(o.price);
    if (o.side === TransactionSide.Sell) row.mySell = (row.mySell ?? 0) + open;
    else row.myBuy = (row.myBuy ?? 0) + open;
  }
  for (const p of stopPrices) at(p).stops = (at(p).stops ?? 0) + 1;
  if (last != null) at(last).last = true;
  return [...rows.values()].sort((a, b) => b.price - a.price);
}
