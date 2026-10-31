import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { avanza } from "@/lib/avanza/client";
import { follow, refetch } from "@/lib/avanza/push";
import { positionsQuery, totalValuesQuery } from "@/lib/avanza/queries";

/**
 * Refetches orders, deals and stop losses when their push stream reports a change, and
 * holdings after a deal. Their events have no captured shape yet, so they only trigger reads.
 */
export function TradingFeed() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const orders = refetch(queryClient, ["orders"]);
    const deals = refetch(
      queryClient,
      ["orders"],
      positionsQuery.queryKey,
      totalValuesQuery.queryKey,
    );
    const stopLosses = refetch(queryClient, ["orders", "stop-losses"]);
    const stops = [
      follow("orders", (signal) => avanza.push.orders({ signal }), orders),
      follow("deals", (signal) => avanza.push.deals({ signal }), deals),
      follow("stop losses", (signal) => avanza.push.stopLosses({ signal }), stopLosses),
    ];
    return () => stops.forEach((stop) => stop());
  }, [queryClient]);

  return null;
}
