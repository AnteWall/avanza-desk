import type { QueryClient } from "@tanstack/react-query";
import type { SearchHit } from "avanza-ts";

import { OrderSide } from "@/lib/avanza/codes";
import { instrumentQuery } from "@/lib/avanza/queries";

/** Setting holding the saved target weights (0…1) by holding key; suffixed `:<group id>` per group. */
export const targetsKey = "rebalance:targets";

/** Setting holding instruments added to the plan that you don't hold yet; suffixed like targets. */
export const addedKey = "rebalance:added";

/** An instrument you don't hold, added to the plan so it can be bought. Its key is the orderbook id. */
export type AddedInstrument = {
  orderbookId: string;
  name: string;
  type: string;
  isin?: string;
  currency: string;
};

/** A search hit as an instrument to add, with the ISIN (for the logo) and currency (for the SEK price). */
export async function toAdded(qc: QueryClient, hit: SearchHit): Promise<AddedInstrument> {
  const info = await qc
    .fetchQuery(instrumentQuery(hit.orderBookId!, hit.type))
    .catch(() => undefined);
  return {
    orderbookId: hit.orderBookId!,
    name: hit.title,
    type: hit.type,
    isin: info?.isin ?? undefined,
    currency: info?.currency ?? hit.price?.currency ?? "SEK",
  };
}

/**
 * Something to rebalance: its SEK value, its target share (0…1) of the total, and its SEK price
 * per share. A null price trades in SEK instead of shares (funds, or a price not known yet).
 */
export type Position = { value: number; price: number | null; target: number };

/**
 * An order: `amount` in whole SEK (+ buy / − sell) and `shares` in whole shares (rounded toward
 * zero so a buy never exceeds the money), or null when it trades in SEK.
 */
export type Order = { side: OrderSide; amount: number; shares: number | null };

/** How to rebalance; `band` and `minOrder` keep small drifts and tiny orders out of the plan. */
export type RebalanceOptions = {
  /** SEK added to the portfolio before rebalancing. */
  newMoney: number;
  /** Never sell: only the new money is invested. */
  buyOnly: boolean;
  /** Leave a position alone while it is within this many points (0…1) of its target. */
  band: number;
  /** Skip trades smaller than this, in SEK. */
  minOrder: number;
};

/** Setting holding the band and smallest order, shared by every group. */
export const optionsKey = "rebalance:options";
export const defaultOptions = { band: 0, minOrder: 500 };

/**
 * Trades that move the positions outside the band back to their targets. Buys never spend more
 * than the new money plus what the sells free up: when they would, every buy shrinks by the
 * same factor (in buy-only mode that splits the new money in proportion to each shortfall). What
 * isn't spent, from the band, skipped orders or rounding to whole shares, stays as cash.
 */
export function rebalance(
  positions: readonly Position[],
  options: RebalanceOptions,
): (Order | null)[] {
  const { newMoney, buyOnly, band, minOrder } = options;
  const total = positions.reduce((s, p) => s + p.value, 0) + newMoney;
  const gaps = positions.map((p) => p.target * total - p.value);
  const wanted = gaps.map((g) =>
    (buyOnly && g < 0) || Math.abs(g) <= band * total || Math.abs(g) < minOrder ? 0 : g,
  );
  const cash = newMoney - wanted.reduce((s, w) => s + Math.min(w, 0), 0);
  const buys = wanted.reduce((s, w) => s + Math.max(w, 0), 0);
  const scale = buys > cash ? cash / buys : 1;
  return positions.map((p, i) => {
    const w = wanted[i]!;
    const raw = w > 0 ? w * scale : w;
    const shares = p.price && p.price > 0 ? Math.trunc(raw / p.price) || 0 : null;
    // `|| 0` turns a rounded -0 into 0.
    const amount = Math.round(shares == null ? raw : shares * p.price!) || 0;
    if (!amount) return null;
    return { side: amount > 0 ? OrderSide.Buy : OrderSide.Sell, amount, shares };
  });
}
