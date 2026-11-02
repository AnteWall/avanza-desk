import type { PositionListResponse, WatchlistRow } from "avanza-ts";

import { InstrumentType } from "./codes";

/** A stock you hold on any account or keep on a watchlist. `value` is SEK held (0 if watched). */
export type UniverseStock = {
  orderbookId: string;
  name: string;
  isin?: string;
  flagCode?: string;
  currency: string;
  held: boolean;
  watched: boolean;
  value: number;
};

/** Held stocks first (largest first), then watched ones; each orderbook once. */
export function buildUniverse(
  positions: PositionListResponse,
  rows: readonly WatchlistRow[],
): UniverseStock[] {
  const byId = new Map<string, UniverseStock>();
  for (const p of positions.withOrderbook) {
    const ob = p.instrument.orderbook;
    if (!ob?.id || p.instrument.type !== InstrumentType.Stock) continue;
    const s = byId.get(ob.id) ?? {
      orderbookId: ob.id,
      name: p.instrument.name,
      isin: p.instrument.isin ?? undefined,
      flagCode: ob.flagCode ?? undefined,
      currency: p.instrument.currency,
      held: true,
      watched: false,
      value: 0,
    };
    s.value += p.value.value;
    byId.set(ob.id, s);
  }
  for (const r of rows) {
    if (r.instrumentType !== InstrumentType.Stock) continue;
    const s = byId.get(r.id);
    if (s) s.watched = true;
    else
      byId.set(r.id, {
        orderbookId: r.id,
        name: r.name,
        isin: r.isin,
        flagCode: r.flagCode,
        currency: r.currency,
        held: false,
        watched: true,
        value: 0,
      });
  }
  return [...byId.values()].sort((a, b) => +b.held - +a.held || b.value - a.value);
}
