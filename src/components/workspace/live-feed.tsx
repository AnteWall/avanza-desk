import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useFocusedInstrument, useMarketOpen } from "@/components/workspace/use-focused-instrument";
import { avanza } from "@/lib/avanza/client";
import { applyDepth, applyQuote, applyTrade, follow } from "@/lib/avanza/push";
import { marketTradesQuery, orderDepthQuery, quoteQuery } from "@/lib/avanza/queries";

/** Streams the focused instrument's quote, order book and trade tape while its market is open. */
export function LiveFeed() {
  const focus = useFocusedInstrument();
  const live = useMarketOpen(focus);
  const queryClient = useQueryClient();
  const id = focus?.id;

  useEffect(() => {
    if (!id || !live) return;
    const quoteKey = quoteQuery(id).queryKey;
    const depthKey = orderDepthQuery(id).queryKey;
    const tradesKey = marketTradesQuery(id).queryKey;
    const stops = [
      follow(
        "quotes",
        (signal) => avanza.push.quote(id, { signal }),
        (q) => queryClient.setQueryData(quoteKey, (old) => applyQuote(old, q)),
      ),
      follow(
        "order book",
        (signal) => avanza.push.orderDepth(id, { signal }),
        (d) => queryClient.setQueryData(depthKey, applyDepth(d)),
      ),
      follow(
        "trades",
        (signal) => avanza.push.trades(id, { signal }),
        (t) => queryClient.setQueryData(tradesKey, (old) => applyTrade(old, t)),
      ),
    ];
    return () => stops.forEach((stop) => stop());
  }, [id, live, queryClient]);

  return null;
}
