import { useSuspenseQuery } from "@tanstack/react-query";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { type Focus } from "@/components/workspace/use-focused-instrument";
import { orderDepthQuery } from "@/lib/avanza/queries";
import { formatInteger, formatPrice } from "@/lib/format";

type Level = {
  bid?: number;
  bidQty?: number;
  bidCum: number;
  ask?: number;
  askQty?: number;
  askCum: number;
};

// Bars and the Σ columns show cumulative volume, so you see how deep the book is before a
// price level, not just the size at it.
const bar = (cum: number, max: number) => `${max ? (cum / max) * 100 : 0}%`;

// The Σ columns only fit when the panel is wide.
const wide = "@max-[24rem]:hidden";

const col = dataTableColumns<Level & { max: number }>();
const columns = col.columns([
  col.accessor("bidCum", {
    header: "Σ",
    cell: (c) => c.row.original.bid != null && formatInteger(c.getValue()),
    meta: { className: `num text-muted-foreground/70 ${wide}`, headerClassName: wide },
  }),
  col.accessor("bidQty", {
    header: "Qty",
    cell: (c) => c.getValue() != null && formatInteger(c.getValue()!),
    meta: { className: "num text-muted-foreground" },
  }),
  col.accessor("bid", {
    header: "Bid",
    cell: (c) =>
      c.getValue() != null && (
        <>
          <span
            className="bg-up/15 absolute inset-y-1 right-0"
            style={{ width: bar(c.row.original.bidCum, c.row.original.max) }}
          />
          <span className="relative">{formatPrice(c.getValue()!)}</span>
        </>
      ),
    meta: { align: "end", className: "num relative font-medium text-up" },
  }),
  col.accessor("ask", {
    header: "Ask",
    cell: (c) =>
      c.getValue() != null && (
        <>
          <span
            className="bg-down/15 absolute inset-y-1 left-0"
            style={{ width: bar(c.row.original.askCum, c.row.original.max) }}
          />
          <span className="relative">{formatPrice(c.getValue()!)}</span>
        </>
      ),
    meta: { className: "num relative font-medium text-down" },
  }),
  col.accessor("askQty", {
    header: "Qty",
    cell: (c) => c.getValue() != null && formatInteger(c.getValue()!),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("askCum", {
    header: "Σ",
    cell: (c) => c.row.original.ask != null && formatInteger(c.getValue()),
    meta: {
      align: "end",
      className: `num text-muted-foreground/70 ${wide}`,
      headerClassName: wide,
    },
  }),
]);

/** Live depth with spread and book imbalance. Suspends while loading. */
export function OrderBookTable({ focus }: { focus: Focus }) {
  const { data: depth } = useSuspenseQuery(orderDepthQuery(focus.id));

  const levels: Level[] = [];
  let bidCum = 0;
  let askCum = 0;
  // Avanza omits `levels` for some instruments, despite the SDK type.
  for (const l of depth.levels ?? []) {
    bidCum += l.buySide?.volume ?? 0;
    askCum += l.sellSide?.volume ?? 0;
    levels.push({
      bid: l.buySide?.price,
      bidQty: l.buySide?.volume,
      bidCum,
      ask: l.sellSide?.price,
      askQty: l.sellSide?.volume,
      askCum,
    });
  }
  const max = Math.max(bidCum, askCum);
  // Book imbalance: share of visible volume on the bid side.
  const bidShare = max ? bidCum / (bidCum + askCum) : null;
  const best = levels[0];
  const spread = best?.ask != null && best.bid != null ? best.ask - best.bid : null;

  if (levels.length === 0)
    return <p className="text-muted-foreground p-3">No orders in the book right now.</p>;
  return (
    <>
      <div className="num text-muted-foreground flex h-7 items-center gap-4 border-b px-3 text-xs">
        {spread != null && (
          <span>
            Spread <span className="text-foreground">{formatPrice(spread)}</span>
          </span>
        )}
        {bidShare != null && (
          <span
            className="flex flex-1 items-center gap-2"
            title={`Visible volume: ${formatInteger(bidCum)} bid, ${formatInteger(askCum)} ask`}
          >
            <span className="text-up">{formatInteger(bidCum)}</span>
            <span className="text-up">{Math.round(bidShare * 100)} %</span>
            <span className="bg-down/30 h-1 flex-1 overflow-hidden rounded-full">
              <span className="bg-up block h-full" style={{ width: `${bidShare * 100}%` }} />
            </span>
            <span className="text-down">{Math.round((1 - bidShare) * 100)} %</span>
            <span className="text-down">{formatInteger(askCum)}</span>
          </span>
        )}
      </div>
      <div className="@container">
        <DataTable columns={columns} data={levels.map((l) => ({ ...l, max }))} />
      </div>
    </>
  );
}
