import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type {
  MarketTrade,
  OrderDepth,
  PushOrderDepth,
  PushQuote,
  PushTrade,
  StockQuote,
  WatchlistRow,
} from "avanza-ts";
import { toast } from "sonner";

import { isUnauthorized } from "./client";
import { errorMessage } from "./error-message";

// Push events write into the same query keys the REST reads fill (src/lib/avanza/queries.ts),
// so panels don't know whether a value came from a fetch or the stream.

/**
 * Feeds every event of an `avanza.push` stream to `onEvent`; returns the effect cleanup that
 * ends it. The SDK reconnects by itself and only throws for good (4xx, malformed data): then a
 * toast says so and stays up, since that data no longer updates.
 */
export function follow<T>(
  name: string,
  open: (signal: AbortSignal) => AsyncIterable<T>,
  onEvent: (e: T) => void,
) {
  const controller = new AbortController();
  void (async () => {
    try {
      for await (const event of open(controller.signal)) onEvent(event);
    } catch (error) {
      if (controller.signal.aborted) return;
      console.warn(`push stream for ${name} stopped`, error);
      // A 401 opens the sign-in overlay through the polled queries; no toast for that.
      if (isUnauthorized(error)) return;
      // One toast per kind of stream, however many instruments it covered.
      toast.error(`Live ${name} stopped`, {
        id: `push-${name}`,
        description: errorMessage(error),
        duration: Infinity,
        closeButton: true,
      });
    }
  })();
  return () => controller.abort();
}

/** Refetches the given keys, joining reads already in flight. */
export const refetch =
  (client: QueryClient, ...queryKeys: QueryKey[]) =>
  () =>
    queryKeys.forEach(
      (queryKey) => void client.refetchQueries({ queryKey }, { cancelRefetch: false }),
    );

// `null` is a real value (no trade yet); only fields missing from the event keep the old one.
const or = <T>(next: T | undefined, old: T) => (next === undefined ? old : next);

export function applyQuote(old: StockQuote | undefined, q: PushQuote): StockQuote | undefined {
  if (!old) return old;
  return {
    ...old,
    buy: or(q.buyPrice, old.buy),
    sell: or(q.sellPrice, old.sell),
    last: or(q.lastPrice, old.last),
    highest: or(q.highestPrice, old.highest),
    lowest: or(q.lowestPrice, old.lowest),
    change: or(q.change, old.change),
    changePercent: or(q.changePercent, old.changePercent),
    spread: or(q.spreadPercent, old.spread),
    timeOfLast: or(q.lastPriceUpdated, old.timeOfLast),
    totalValueTraded: or(q.totalValueTraded, old.totalValueTraded),
    totalVolumeTraded: or(q.totalVolumeTraded, old.totalVolumeTraded),
    updated: q.updated ?? old.updated,
    volumeWeightedAveragePrice: or(q.volumeWeightedAveragePrice, old.volumeWeightedAveragePrice),
  };
}

/** Watchlist rows already use the push field names for their numbers. */
export function applyRowQuote(rows: readonly WatchlistRow[] | undefined, q: PushQuote) {
  return rows?.map((r) => {
    if (r.id !== q.orderbookId) return r;
    const quote = { ...r.quote };
    for (const key of numericRowFields) {
      const next = q[key];
      if (typeof next === "number") quote[key] = next;
    }
    return { ...r, quote };
  });
}

const numericRowFields = [
  "lastPrice",
  "change",
  "changePercent",
  "highestPrice",
  "lowestPrice",
  "buyPrice",
  "sellPrice",
  "totalVolumeTraded",
  "totalValueTraded",
] as const;

const side = (price: number | null | undefined, volume: number | null | undefined) =>
  price == null ? null : { price, volume: volume ?? 0, priceString: String(price) };

/** A push depth event carries the whole book. */
export function applyDepth(d: PushOrderDepth): OrderDepth {
  return {
    receivedTime: Date.now(),
    levels: d.levels.map((l) => ({
      buySide: side(l.buyPrice, l.buyVolume),
      sellSide: side(l.sellPrice, l.sellVolume),
    })),
  };
}

/** Adds a pushed trade to the tape unless the REST read already has it (a reconnect replays). */
export function applyTrade(trades: readonly MarketTrade[] | undefined, t: PushTrade) {
  if (!trades || t.dealTime === undefined || t.price === undefined || t.volume === undefined) {
    return trades;
  }
  const seen = trades.some(
    (x) => x.dealTime === t.dealTime && x.price === t.price && x.volume === t.volume,
  );
  if (seen) return trades;
  // Broker codes arrive in the event's extra fields when Avanza sends them.
  const trade: MarketTrade = {
    buyer: typeof t.buyer === "string" ? t.buyer : "",
    seller: typeof t.seller === "string" ? t.seller : "",
    matchedOnMarket: t.matchedOnMarket !== false,
    cancelled: t.cancelled === true,
    dealTime: t.dealTime,
    price: t.price,
    volume: t.volume,
  };
  return [trade, ...trades].slice(0, MAX_TAPE);
}

/** Newest trades kept: the push adds every trade of the day and the table renders them all. */
const MAX_TAPE = 500;
