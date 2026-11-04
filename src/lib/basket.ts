import type { QueryClient } from "@tanstack/react-query";
import type { WatchlistRow } from "avanza-ts";
import { useSyncExternalStore } from "react";

import type { ContextItem } from "./ai/context";
import { InstrumentType } from "./avanza/codes";
import { instrumentQuery } from "./avanza/queries";
import { rebalance, type AddedInstrument } from "./rebalance";
import { getSetting, onRemoteSetting, saveSetting } from "./settings";

/** Saved basket: instruments you want to buy, apart from your holdings and rebalance targets. */
export const basketKey = "basket:items";

/** A basket item: an instrument and its relative weight (2 gets twice the money of 1). */
export type BasketItem = AddedInstrument & { weight: number };

export const fromWatchlistRow = (r: WatchlistRow): BasketItem => ({
  orderbookId: r.id,
  name: r.name,
  type: r.instrumentType,
  isin: r.isin,
  currency: r.currency,
  weight: 1,
});

/**
 * Split `money` over the items by weight, ignoring what you already hold: rebalancing from
 * zero, buy only. `prices` are SEK per share, null for funds (bought in SEK).
 */
export function basketOrders(
  items: readonly BasketItem[],
  prices: readonly (number | null)[],
  money: number,
  minOrder: number,
) {
  const sum = items.reduce((s, it) => s + it.weight, 0) || 1;
  return rebalance(
    items.map((it, i) => ({ value: 0, price: prices[i] ?? null, target: it.weight / sum })),
    { newMoney: money, buyOnly: true, band: 0, minOrder },
  );
}

// One basket per window, shared by the nav rail's popover and the Basket page.
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());
let remote = false;
const subscribe = (l: () => void) => {
  listeners.add(l);
  // Once per window, kept for its lifetime: the basket is always shown in the nav rail.
  if (!remote) onRemoteSetting(basketKey, notify);
  remote = true;
  return () => void listeners.delete(l);
};
const none: BasketItem[] = [];
const getBasket = () => getSetting(basketKey, none);

export function setBasket(next: BasketItem[]) {
  void saveSetting(basketKey, next);
  notify();
}

/** The basket's items; re-renders when any part of the app (or another window) changes it. */
export const useBasketItems = () => useSyncExternalStore(subscribe, getBasket);

/** Adds the ones not in the basket yet; returns how many were new. */
export function addToBasketItems(more: readonly BasketItem[]) {
  const items = getBasket();
  const fresh = more.filter((m) => !items.some((it) => it.orderbookId === m.orderbookId));
  if (fresh.length) setBasket([...items, ...fresh]);
  return fresh.length;
}

/**
 * Adds a right-clicked instrument. Rows don't carry the currency, so it's looked up; a failed
 * lookup throws rather than guessing SEK, which would price a USD stock ~10x too cheap.
 */
export async function addToBasket(
  qc: QueryClient,
  item: Extract<ContextItem, { kind: "instrument" }>,
) {
  const info = await qc.fetchQuery(instrumentQuery(item.id, item.type));
  return addToBasketItems([
    {
      orderbookId: item.id,
      name: item.name,
      type: info.kind === "fund" ? InstrumentType.Fund : (item.type ?? InstrumentType.Stock),
      isin: item.isin ?? info.isin ?? undefined,
      currency: info.currency,
      weight: 1,
    },
  ]);
}
