import type { OrderDepth } from "avanza-ts";

import { OrderSide } from "./codes";

/**
 * Walks the visible book to estimate a market order: buys take the ask side, sells the bid
 * side. `filled` is below `quantity` when the visible depth runs out.
 */
export function estimateFill(depth: OrderDepth | undefined, side: OrderSide, quantity: number) {
  let filled = 0;
  let cost = 0;
  let levels = 0;
  for (const level of depth?.levels ?? []) {
    const s = side === OrderSide.Buy ? level.sellSide : level.buySide;
    if (!s || filled >= quantity) break;
    const take = Math.min(s.volume, quantity - filled);
    filled += take;
    cost += take * s.price;
    levels++;
  }
  return { filled, averagePrice: filled ? cost / filled : null, cost, levels };
}
