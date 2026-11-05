import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { useAccount } from "@/components/layout/use-account";
import type { Focus } from "@/components/workspace/use-focused-instrument";
import { toOrderRow, toStopLossRow } from "@/lib/avanza/loose-records";
import { orderDepthQuery, ordersQuery, quoteQuery, stopLossesQuery } from "@/lib/avanza/queries";
import { formatInteger, formatPrice } from "@/lib/format";
import { m } from "@/lib/i18n";
import { buildLadder, type LadderRow } from "@/lib/ladder";

type Row = LadderRow & { max: number; bestBid?: number; bestAsk?: number };

const qtyBar = (qty: number | undefined, max: number, tone: "up" | "down") =>
  qty != null && (
    <>
      <span
        className={cn(
          "absolute inset-y-1",
          tone === "up" ? "bg-up/15 right-0" : "bg-down/15 left-0",
        )}
        style={{ width: `${max ? (qty / max) * 100 : 0}%` }}
      />
      <span className="relative">{formatInteger(qty)}</span>
    </>
  );

const mine = (qty: number | undefined, tone: "up" | "down") =>
  qty != null && (
    <span
      className={cn(
        "sensitive rounded-sm px-1 font-medium text-white",
        tone === "up" ? "bg-buy" : "bg-sell",
      )}
      title={tone === "up" ? m.workspace.orderBook.yourBuy : m.workspace.orderBook.yourSell}
    >
      {formatInteger(qty)}
    </span>
  );

const col = dataTableColumns<Row>();
const columns = col.columns([
  col.accessor("myBuy", {
    header: m.workspace.orderBook.youBuy,
    cell: (c) => mine(c.getValue(), "up"),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("bidQty", {
    header: m.workspace.orderBook.bidQty,
    cell: (c) => qtyBar(c.getValue(), c.row.original.max, "up"),
    meta: { align: "end", className: "num relative" },
  }),
  col.accessor("price", {
    header: m.common.price,
    cell: (c) => {
      const r = c.row.original;
      const tone =
        r.bestAsk != null && r.price >= r.bestAsk
          ? "text-down"
          : r.bestBid != null && r.price <= r.bestBid
            ? "text-up"
            : "text-muted-foreground";
      return (
        <span className="flex items-center justify-center gap-1.5">
          {r.last && (
            <span
              className="bg-brand size-1.5 rounded-full"
              title={m.workspace.orderBook.lastPrice}
            />
          )}
          <span className={cn("font-medium", tone, r.last && "underline decoration-brand")}>
            {formatPrice(r.price)}
          </span>
          {r.stops != null && (
            <span
              className="text-warning border-warning/50 rounded-sm border px-1 text-xs"
              title={m.workspace.orderBook.stops(r.stops)}
            >
              SL
            </span>
          )}
        </span>
      );
    },
    meta: { className: "num text-center", headerClassName: "text-center" },
  }),
  col.accessor("askQty", {
    header: m.workspace.orderBook.askQty,
    cell: (c) => qtyBar(c.getValue(), c.row.original.max, "down"),
    meta: { className: "num relative" },
  }),
  col.accessor("mySell", {
    header: m.workspace.orderBook.youSell,
    cell: (c) => mine(c.getValue(), "down"),
    meta: { className: "num" },
  }),
]);

/**
 * The book as a vertical price ladder, asks over bids, with your open orders and stop-loss
 * triggers at their prices and a dot on the last price. Read-only: trade in Avanza.
 */
export function LadderTable({ focus }: { focus: Focus }) {
  const { data: depth } = useSuspenseQuery(orderDepthQuery(focus.id));
  // Decorations: without them the ladder is still the book.
  const { data: quote } = useQuery(quoteQuery(focus.id));
  const { data: orders } = useQuery(ordersQuery);
  const { data: stopLosses } = useQuery(stopLossesQuery);
  const { id: account } = useAccount();
  const inScope = (r: { orderbookId?: string; accountId?: string }) =>
    r.orderbookId === focus.id && (!account || !r.accountId || r.accountId === account);

  const myOrders = (orders?.orders ?? []).map(toOrderRow).filter(inScope);
  // Percentage (trailing) triggers move with the price, so they have no fixed rung.
  const stopPrices = (stopLosses ?? [])
    .map(toStopLossRow)
    .filter(inScope)
    .flatMap((s) => (s.trigger && !s.trigger.percent ? [s.trigger.value] : []));
  const rows = buildLadder(depth, myOrders, stopPrices, quote?.last);
  const best = depth.levels?.[0];
  const max = Math.max(0, ...rows.map((r) => Math.max(r.bidQty ?? 0, r.askQty ?? 0)));

  if (rows.length === 0)
    return <p className="text-muted-foreground p-3">{m.workspace.orderBook.empty}</p>;
  return (
    <DataTable
      columns={columns}
      data={rows.map((r) => ({
        ...r,
        max,
        bestBid: best?.buySide?.price,
        bestAsk: best?.sellSide?.price,
      }))}
      getRowId={(r) => String(r.price)}
    />
  );
}
