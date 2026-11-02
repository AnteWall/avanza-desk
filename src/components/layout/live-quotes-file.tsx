import { useQueries, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import type { WatchlistRow } from "avanza-ts";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { useLiveQuotesPath } from "@/components/layout/use-live-quotes-path";
import { avanza } from "@/lib/avanza/client";
import { applyRowQuote, follow } from "@/lib/avanza/push";
import { watchlistRowsQuery, watchlistsQuery } from "@/lib/avanza/queries";
import { toCsv, writeCsv } from "@/lib/csv";
import { quoteRows } from "@/lib/live-quotes-file";
import { getRefreshIntervals } from "@/lib/refresh-intervals";

const rowsOf = (results: UseQueryResult<readonly WatchlistRow[]>[]) =>
  results.flatMap((r) => r.data ?? []);

/**
 * Keeps the live quotes file (Settings › Data) up to date: every watchlist's quotes, streamed,
 * written at most once per its refresh interval. Renders nothing; off until a file is picked.
 */
export function LiveQuotesFile() {
  const path = useLiveQuotesPath();
  const queryClient = useQueryClient();
  const { data: watchlists = [] } = useQuery({ ...watchlistsQuery, enabled: !!path });
  const rows = useQueries({
    queries: watchlists.map((w) => ({
      ...watchlistRowsQuery(w.watchListId, w.orderbookIds),
      enabled: !!path,
      // The stream moves prices; the poll catches what it doesn't carry.
      refetchInterval: 60_000,
    })),
    combine: rowsOf,
  });

  // The cached list is stable until it really changes, so the stream doesn't reopen per render.
  useEffect(() => {
    const ids = [...new Set(watchlists.flatMap((w) => w.orderbookIds))];
    if (!path || ids.length === 0) return;
    return follow(
      "quotes file",
      (signal) => avanza.push.quotes(ids, { signal }),
      (q) => {
        for (const w of watchlists) {
          if (!w.orderbookIds.includes(q.orderbookId)) continue;
          const { queryKey } = watchlistRowsQuery(w.watchListId, w.orderbookIds);
          queryClient.setQueryData(queryKey, (old) => applyRowQuote(old, q));
        }
      },
    );
  }, [path, watchlists, queryClient]);

  // Throttled: the latest rows are written once per interval (Settings › Data), however fast
  // quotes tick. Read at each write, so a changed interval applies from the next one.
  const latest = useRef(rows);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    latest.current = rows;
    if (!path || rows.length === 0 || timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = undefined;
      writeCsv(path, toCsv(quoteRows(latest.current))).catch((error) =>
        toast.error("Couldn't write the live quotes file", {
          id: "live-quotes-file",
          description: String(error),
        }),
      );
    }, getRefreshIntervals().quotesFile);
  }, [path, rows]);
  useEffect(() => () => clearTimeout(timer.current), []);

  return null;
}
