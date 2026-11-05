import { useSuspenseQuery } from "@tanstack/react-query";
import type { MarketTrade } from "avanza-ts";
import { cn } from "cn";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { type Focus } from "@/components/workspace/use-focused-instrument";
import { marketTradesQuery } from "@/lib/avanza/queries";
import { formatInteger, formatPrice, formatTime } from "@/lib/format";
import { m } from "@/lib/i18n";

// `tick`: did the price go up or down from the previous trade, like a tape's up/down ticks.
type Row = MarketTrade & { key: string; tick: number };

const col = dataTableColumns<Row>();
const columns = col.columns([
  col.accessor("dealTime", {
    header: m.workspace.orderBook.time,
    cell: (c) => formatTime(c.getValue()),
    meta: { className: "num text-muted-foreground" },
  }),
  col.accessor("price", {
    header: m.common.price,
    cell: (c) => (
      <span
        className={cn(
          c.row.original.tick === 1 && "text-up",
          c.row.original.tick === -1 && "text-down",
          c.row.original.cancelled && "line-through",
        )}
      >
        {formatPrice(c.getValue())}
      </span>
    ),
    meta: { align: "end", className: "num font-medium" },
  }),
  col.accessor("volume", {
    header: m.common.quantity,
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("buyer", {
    header: m.workspace.orderBook.buyer,
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("seller", {
    header: m.workspace.orderBook.seller,
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
]);

/** Today's trade tape, newest first. Suspends while loading. */
export function TradesTable({ focus }: { focus: Focus }) {
  const { data } = useSuspenseQuery(marketTradesQuery(focus.id));
  const trades = [...data].sort((a, b) => b.dealTime - a.dealTime);
  const rows = trades.map((t, i) => ({
    ...t,
    key: `${t.dealTime}-${i}`,
    tick: i + 1 < trades.length ? Math.sign(t.price - trades[i + 1]!.price) : 0,
  }));

  if (rows.length === 0) return <Empty>{m.workspace.orderBook.noTrades}</Empty>;
  return <DataTable columns={columns} data={rows} getRowId={(r) => r.key} />;
}
