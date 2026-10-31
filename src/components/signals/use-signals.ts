import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";

import { fundamentalsQuery } from "@/lib/avanza/queries";
import type { UniverseStock } from "@/lib/avanza/universe";
import { bySignalRank, deriveSignals, type Signal } from "@/lib/signals";
import { snapshotSeriesQuery, stockholmDay } from "@/lib/snapshots";

export type StockSignal = Signal & { stock: UniverseStock };

// Module scope keeps it stable, so TanStack only recombines when a result changes.
const dataOf = <T>(results: UseQueryResult<T>[]) => ({
  data: results.map((r) => r.data),
  pending: results.some((r) => r.isPending),
  // "Now" for the derivation: when the data was read, which keeps rendering pure.
  updatedAt: Math.max(0, ...results.map((r) => r.dataUpdatedAt)),
});

/**
 * Signals for `stocks`, ranked. Fundamentals are the same hour-cached reads the dossier uses;
 * a stock whose read fails just has no signals. `enabled: false` makes no requests.
 */
export function useSignals(stocks: readonly UniverseStock[], enabled = true) {
  const {
    data: fundamentals,
    pending,
    updatedAt,
  } = useQueries({
    queries: stocks.map((s) => ({ ...fundamentalsQuery(s.orderbookId), enabled })),
    combine: dataOf,
  });
  // Day-precise is enough here; the snapshot query key stays stable all day.
  const from = stockholmDay(new Date(updatedAt - 31 * 24 * 60 * 60_000));
  const ready = enabled && updatedAt > 0;
  const { data: target } = useQuery({ ...snapshotSeriesQuery("target", from), enabled: ready });
  const { data: consensus } = useQuery({
    ...snapshotSeriesQuery("consensus", from),
    enabled: ready,
  });

  const signals = useMemo(() => {
    if (updatedAt === 0) return [];
    return stocks
      .flatMap((stock, i) =>
        deriveSignals(
          stock.orderbookId,
          {
            ...fundamentals[i],
            target: target?.get(stock.orderbookId),
            consensus: consensus?.get(stock.orderbookId),
          },
          updatedAt,
        ).map((s): StockSignal => ({ ...s, stock })),
      )
      .sort(bySignalRank);
  }, [stocks, fundamentals, target, consensus, updatedAt]);
  return { signals, pending };
}
