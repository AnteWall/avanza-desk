import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import type { WatchlistRow } from "avanza-ts";
import { Bell, NotebookPen } from "lucide-react";
import { useEffect, useMemo } from "react";

import { Change } from "@/components/common/change";
import { CountryFlag } from "@/components/common/country-flag";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Flash } from "@/components/common/flash";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { useColumnPicks } from "@/components/common/use-column-picks";
import {
  useFocusedInstrument,
  useFocusInstrument,
} from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { avanza } from "@/lib/avanza/client";
import { applyRowQuote, follow } from "@/lib/avanza/push";
import { positionsQuery, watchlistRowsQuery, watchlistsQuery } from "@/lib/avanza/queries";
import { formatCompact, formatInteger, formatPercent, formatPrice } from "@/lib/format";
import { watchlistColumns } from "@/lib/watchlist-columns";

type Row = WatchlistRow & { held: boolean };

const price = (v: number | null | undefined) => (v ? formatPrice(v) : "–");
const priceColumn = (id: string, header: string, get: (q: Row["quote"]) => number) =>
  col.accessor((r) => get(r.quote), {
    id,
    header,
    cell: (c) => price(c.getValue()),
    meta: { align: "end", className: "num" },
  });

const col = dataTableColumns<Row>();
const allColumns = col.columns([
  col.accessor("shortName", {
    // Explicit: key-accessor columns carry no `id` on their definition, and the filter below needs one.
    id: "instrument",
    header: "Instrument",
    cell: (c) => {
      const { held, tools, isin, flagCode } = c.row.original;
      return (
        <span className="flex items-center gap-1.5">
          <InstrumentLogo isin={isin} name={c.getValue()} />
          <span className="font-medium">{c.getValue()}</span>
          <CountryFlag code={flagCode} />
          {held && <span className="bg-brand size-1.5 rounded-full" title="In your portfolio" />}
          {tools.hasAlert && <Bell className="text-muted-foreground size-3" aria-label="Alert" />}
          {tools.hasNote && (
            <NotebookPen className="text-muted-foreground size-3" aria-label="Note" />
          )}
        </span>
      );
    },
  }),
  col.accessor((r) => r.quote.lastPrice, {
    id: "last",
    header: "Last",
    cell: (c) => <Flash value={c.getValue()}>{formatPrice(c.getValue())}</Flash>,
    meta: { align: "end", className: "num" },
  }),
  col.accessor((r) => r.quote.changePercent, {
    id: "change",
    header: "+/-",
    // Avanza sends percent units (1.23), Change takes a ratio.
    cell: (c) => <Change ratio={c.getValue() / 100} />,
    meta: { align: "end" },
  }),
  col.accessor((r) => r.quote.change, {
    id: "changeAbs",
    header: "Change",
    cell: (c) => (
      <span className={c.getValue() > 0 ? "text-up" : c.getValue() < 0 ? "text-down" : ""}>
        {formatPrice(c.getValue())}
      </span>
    ),
    meta: { align: "end", className: "num" },
  }),
  priceColumn("bid", "Bid", (q) => q.buyPrice),
  priceColumn("ask", "Ask", (q) => q.sellPrice),
  col.accessor(
    (r) => {
      const { buyPrice: b, sellPrice: a } = r.quote;
      return b > 0 && a > 0 ? (a - b) / ((a + b) / 2) : null;
    },
    {
      id: "spread",
      header: "Spread",
      cell: (c) => (c.getValue() == null ? "–" : formatPercent(c.getValue()!).replace("+", "")),
      meta: { align: "end", className: "num text-muted-foreground" },
    },
  ),
  priceColumn("high", "High", (q) => q.highestPrice),
  priceColumn("low", "Low", (q) => q.lowestPrice),
  priceColumn("close", "Prev close", (q) => q.closingPrice),
  col.accessor((r) => r.quote.totalVolumeTraded, {
    id: "volume",
    header: "Volume",
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor((r) => r.quote.totalValueTraded, {
    id: "turnover",
    header: "Turnover",
    cell: (c) => formatCompact(c.getValue()),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
]);

/** Rows of one watchlist (the first when `watchListId` is unknown). Suspends while loading. */
export function WatchlistTable({ watchListId }: { watchListId: string | null }) {
  const focused = useFocusedInstrument();
  const focus = useFocusInstrument();
  const { data: watchlists } = useSuspenseQuery(watchlistsQuery);
  const watchlist = watchlists.find((w) => w.watchListId === watchListId) ?? watchlists[0];
  const listId = watchlist?.watchListId ?? "";
  // The cached array itself: stable across renders, so the stream only reopens when it changes.
  const ids = watchlist?.orderbookIds;
  const { data: rows } = useSuspenseQuery(watchlistRowsQuery(listId, ids ?? []));
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!ids?.length) return;
    const { queryKey } = watchlistRowsQuery(listId, ids);
    return follow(
      "watchlist quotes",
      (signal) => avanza.push.quotes(ids, { signal }),
      (q) => queryClient.setQueryData(queryKey, (old) => applyRowQuote(old, q)),
    );
  }, [listId, ids, queryClient]);
  // Decoration only: a failed positions load just hides the "held" dots.
  const { data: positions } = useQuery(positionsQuery);
  const held = new Set(positions?.withOrderbook.map((p) => p.instrument.orderbook?.id));
  const shown = useColumnPicks(watchlistColumns);
  // Memoized so TanStack keeps the same column references between ticks.
  const columns = useMemo(
    () =>
      allColumns.filter((c) => c.id === "instrument" || c.id === "last" || shown.includes(c.id!)),
    [shown],
  );

  if (rows.length === 0)
    return <p className="text-muted-foreground p-3">This watchlist is empty.</p>;
  return (
    <DataTable
      columns={columns}
      data={rows.map((r) => ({ ...r, held: held.has(r.id) }))}
      getRowId={(r) => r.id}
      selectedRowId={focused?.id}
      onRowClick={(r) => focus(r.id, r.instrumentType)}
      askAbout={(r) => instrumentItem(r.id, r.name, r.instrumentType)}
    />
  );
}
