import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { ScreenedStock } from "avanza-ts";

import { Change } from "@/components/common/change";
import { CountryFlag } from "@/components/common/country-flag";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { forumStatsQuery, trendingStocksQuery, universeQuery } from "@/lib/avanza/queries";
import { formatInteger, formatPrice } from "@/lib/format";

const dash = "–";
const shown = 30;

/** New Placera forum posts lately; fetched per row so the list itself shows at once. */
function ForumPosts({ orderbookId }: { orderbookId: string }) {
  const { data } = useQuery(forumStatsQuery(orderbookId));
  return data ? formatInteger(data.newPosts) : dash;
}

const col = dataTableColumns<ScreenedStock>();
const columns = col.columns([
  col.accessor("name", {
    header: "Stock",
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <span className="max-w-48 truncate font-medium">{c.getValue()}</span>
        <CountryFlag code={c.row.original.countryCode} />
      </span>
    ),
  }),
  col.accessor("lastPrice", {
    header: "Last",
    cell: (c) => (c.getValue() == null ? dash : formatPrice(c.getValue()!)),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("oneWeekChangePercent", {
    header: "Week",
    // The stock filter sends ratios (0.0078 = +0.78 %), unlike quotes.
    cell: (c) => (c.getValue() == null ? dash : <Change ratio={c.getValue()!} />),
    meta: { align: "end" },
  }),
  col.accessor("ownersChangeOneWeekAbsolute", {
    header: "New owners",
    cell: (c) => (c.getValue() == null ? dash : formatInteger(c.getValue()!)),
    meta: { align: "end", className: "num font-medium" },
  }),
  // Owner changes are ratios too.
  col.accessor("ownersChangeOneWeek", {
    header: "Owners 1W",
    cell: (c) => (c.getValue() == null ? dash : <Change ratio={c.getValue()!} />),
    meta: { align: "end" },
  }),
  col.accessor("ownersChangeOneMonth", {
    header: "Owners 1M",
    cell: (c) => (c.getValue() == null ? dash : <Change ratio={c.getValue()!} />),
    meta: { align: "end" },
  }),
  col.accessor("numberOfOwners", {
    header: "Owners",
    cell: (c) => (c.getValue() == null ? dash : formatInteger(c.getValue()!)),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.display({
    id: "forum",
    header: "Forum posts",
    cell: (c) => <ForumPosts orderbookId={c.row.original.orderbookId} />,
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
]);

/** Stocks gaining Avanza owners fastest this week, minus ones you hold or watch. Suspends. */
export function TrendingTable() {
  const { data } = useSuspenseQuery(trendingStocksQuery);
  const { data: universe } = useSuspenseQuery(universeQuery);
  const focus = useFocusInstrument();

  const yours = new Set(universe.map((s) => s.orderbookId));
  const stocks = data.stocks.filter((s) => !yours.has(s.orderbookId)).slice(0, shown);

  if (stocks.length === 0) return <Empty>Nothing new is trending.</Empty>;
  return (
    <DataTable
      columns={columns}
      data={stocks}
      getRowId={(s) => s.orderbookId}
      onRowClick={(s) => focus(s.orderbookId, s.type)}
      askAbout={(s) => instrumentItem(s.orderbookId, s.name, s.type)}
    />
  );
}
