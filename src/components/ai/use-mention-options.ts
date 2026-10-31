import { useQuery } from "@tanstack/react-query";

import type { ContextItem } from "@/lib/ai/context";
import { aggregateHoldings } from "@/lib/avanza/portfolio";
import { positionsQuery, searchQuery } from "@/lib/avanza/queries";

const LIMIT = 8;

type Instrument = Extract<ContextItem, { kind: "instrument" }>;

/**
 * Instruments for an "@query" in the message box: your holdings first (from the cache the
 * portfolio already loaded), then Avanza's search once the query is two letters long.
 */
export function useMentionOptions(query: string | undefined): Instrument[] {
  const q = query?.trim().toLowerCase() ?? "";
  const { data: positions } = useQuery({ ...positionsQuery, enabled: query !== undefined });
  const { data: hits } = useQuery({
    ...searchQuery(q),
    enabled: q.length >= 2,
    placeholderData: (previous) => previous,
  });
  if (query === undefined) return [];

  const held: Instrument[] = (positions ? aggregateHoldings(positions) : [])
    .filter((h) => h.orderbookId && h.name.toLowerCase().includes(q))
    .map((h) => ({
      kind: "instrument",
      id: h.orderbookId!,
      type: h.type,
      name: h.name,
      isin: h.isin,
    }));
  const found: Instrument[] = (q.length >= 2 ? (hits ?? []) : [])
    .filter((h) => h.orderBookId && !held.some((i) => i.id === h.orderBookId))
    .map((h) => ({ kind: "instrument", id: h.orderBookId!, type: h.type, name: h.title }));
  return [...held, ...found].slice(0, LIMIT);
}
