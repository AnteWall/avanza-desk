import { notifyManager, useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";

import { avanza } from "@/lib/avanza/client";
import { applyChartQuote, applyPositionQuote, applyQuote, follow } from "@/lib/avanza/push";
import { positionsQuery, priceChartQuery, quoteQuery } from "@/lib/avanza/queries";

/**
 * One quote stream for every instrument you hold or have a quote or today chart of on screen.
 * Each tick moves that instrument's quote, positions (holdings, daily P&L) and today's chart.
 */
export function QuoteFeed() {
  const queryClient = useQueryClient();
  const cache = queryClient.getQueryCache();
  // A sorted id list as a string: stable between cache events, so the stream only reopens
  // when the set of instruments changes.
  const ids = useSyncExternalStore(
    (onChange) => cache.subscribe(notifyManager.batchCalls(onChange)),
    () => {
      const set = new Set<string>();
      const positions = queryClient.getQueryData(positionsQuery.queryKey);
      for (const p of positions?.withOrderbook ?? []) {
        if (p.instrument.orderbook) set.add(p.instrument.orderbook.id);
      }
      for (const q of cache.getAll()) {
        const [scope, id, kind, period] = q.queryKey;
        const watched = kind === "quote" || (kind === "chart" && period === "today");
        if (scope === "instrument" && typeof id === "string" && watched && q.getObserversCount())
          set.add(id);
      }
      return [...set].sort().join(",");
    },
  );

  useEffect(() => {
    if (!ids) return;
    return follow(
      "quotes",
      (signal) => avanza.push.quotes(ids.split(","), { signal }),
      (q) => {
        const id = q.orderbookId;
        queryClient.setQueryData(quoteQuery(id).queryKey, (old) => applyQuote(old, q));
        queryClient.setQueryData(priceChartQuery(id, "today", false).queryKey, (old) =>
          applyChartQuote(old, q),
        );
        queryClient.setQueryData(positionsQuery.queryKey, (old) => applyPositionQuote(old, q));
      },
    );
  }, [ids, queryClient]);

  return null;
}
