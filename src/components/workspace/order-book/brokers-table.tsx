import { useSuspenseQuery } from "@tanstack/react-query";
import type { BrokerTradeSummary } from "avanza-ts";
import { cn } from "cn";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { useMarketOpen, type Focus } from "@/components/workspace/use-focused-instrument";
import { brokerSummaryQuery } from "@/lib/avanza/queries";
import { formatInteger } from "@/lib/format";

const col = dataTableColumns<BrokerTradeSummary>();
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
]);

/** Volume each broker bought and sold today, biggest net buyer first. Suspends. */
export function BrokersTable({ focus }: { focus: Focus }) {
  const live = useMarketOpen(focus);
  const { data } = useSuspenseQuery(brokerSummaryQuery(focus.id, live));
  const rows = [...data].sort((a, b) => b.netBuyVolume - a.netBuyVolume);

  if (rows.length === 0) return <Empty>No broker statistics today.</Empty>;
  return <DataTable columns={columns} data={rows} getRowId={(r) => r.brokerCode} />;
}
