import { useSuspenseQuery } from "@tanstack/react-query";
import type { BrokerTradeSummary } from "avanza-ts";
import { cn } from "cn";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { useMarketOpen, type Focus } from "@/components/workspace/use-focused-instrument";
import { brokerSummaryQuery } from "@/lib/avanza/queries";
import { formatInteger, formatShare } from "@/lib/format";

type Row = BrokerTradeSummary & { share: number };

const col = dataTableColumns<Row>();
const columns = col.columns([
  col.accessor("brokerCode", {
    header: "Broker",
    cell: (c) => <span title={c.row.original.brokerName}>{c.getValue()}</span>,
    meta: { className: "num font-medium" },
  }),
  col.accessor("buyVolume", {
    header: "Bought",
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("sellVolume", {
    header: "Sold",
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("netBuyVolume", {
    header: "Net",
    cell: (c) => (
      <span className={cn(c.getValue() > 0 && "text-up", c.getValue() < 0 && "text-down")}>
        {c.getValue() > 0 && "+"}
        {formatInteger(c.getValue())}
      </span>
    ),
    meta: { align: "end", className: "num font-medium" },
  }),
  col.accessor("share", {
    header: "Of volume",
    cell: (c) => (
      <>
        <span
          className="bg-muted-foreground/15 absolute inset-y-1 right-0"
          style={{ width: `${c.getValue() * 100}%` }}
        />
        <span className="relative">{formatShare(c.getValue())}</span>
      </>
    ),
    meta: { align: "end", className: "num relative text-muted-foreground" },
  }),
]);

/** Volume each broker bought and sold today, biggest net buyer first. Suspends. */
export function BrokersTable({ focus }: { focus: Focus }) {
  const live = useMarketOpen(focus);
  const { data } = useSuspenseQuery(brokerSummaryQuery(focus.id, live));
  // Every share traded has a buyer and a seller, so the day's volume is the bought total.
  const volume = data.reduce((sum, b) => sum + b.buyVolume, 0);
  const rows = [...data]
    .sort((a, b) => b.netBuyVolume - a.netBuyVolume)
    .map((b) => ({ ...b, share: volume ? (b.buyVolume + b.sellVolume) / (2 * volume) : 0 }));
  const top3 = [...rows]
    .sort((a, b) => b.share - a.share)
    .slice(0, 3)
    .reduce((sum, b) => sum + b.share, 0);
  const buyer = rows[0];
  const seller = rows.at(-1);

  if (rows.length === 0) return <Empty>No broker statistics today.</Empty>;
  return (
    <>
      <div className="num text-muted-foreground flex h-7 items-center gap-4 border-b px-3 text-xs">
        <span>
          Top 3 <span className="text-foreground">{formatShare(top3)}</span> of volume
        </span>
        {buyer && buyer.netBuyVolume > 0 && (
          <span title={buyer.brokerName}>
            Net buyer <span className="text-up">{buyer.brokerCode}</span>
          </span>
        )}
        {seller && seller.netBuyVolume < 0 && (
          <span title={seller.brokerName}>
            Net seller <span className="text-down">{seller.brokerCode}</span>
          </span>
        )}
      </div>
      <DataTable columns={columns} data={rows} getRowId={(r) => r.brokerCode} />
    </>
  );
}
