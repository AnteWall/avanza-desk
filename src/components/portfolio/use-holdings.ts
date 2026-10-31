import { useQueries, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { lookThroughTypes, type LookThrough } from "@/lib/avanza/look-through";
import { aggregateHoldings, dailyPerformance } from "@/lib/avanza/portfolio";
import { lookThroughQuery, positionsQuery } from "@/lib/avanza/queries";

/** Holdings across all accounts, largest first, plus cash. Suspends while positions load. */
export function useHoldings() {
  const { data } = useSuspenseQuery(positionsQuery);
  return useMemo(
    () => ({ holdings: aggregateHoldings(data), cash: dailyPerformance(data).cash }),
    [data],
  );
}

/**
 * Look-through of every stock, fund and ETF held, keyed by holding. One request per instrument
 * (more for fund-of-funds), cached for a day, so only the first visit fans out. A failed or
 * unsupported instrument is simply missing from the map.
 */
export function useLookThroughs() {
  const { holdings } = useHoldings();
  const supported = holdings.filter((h) => h.orderbookId && lookThroughTypes.has(h.type));
  const results = useQueries({
    queries: supported.map((h) => lookThroughQuery(h.orderbookId!, h.type)),
  });
  const byKey = new Map<string, LookThrough>();
  supported.forEach((h, i) => {
    const data = results[i]?.data;
    if (data) byKey.set(h.key, data);
  });
  return { holdings, byKey, pending: results.some((r) => r.isPending) };
}
