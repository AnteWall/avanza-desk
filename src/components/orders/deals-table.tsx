import { useSuspenseQuery } from "@tanstack/react-query";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { Side } from "@/components/common/side";
import { useAccount } from "@/components/layout/use-account";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { toDealRow, type OrderRow } from "@/lib/avanza/loose-records";
import { dealsQuery } from "@/lib/avanza/queries";
import { formatInteger, formatPrice, formatTime } from "@/lib/format";
import { m } from "@/lib/i18n";

const dash = "–";

const col = dataTableColumns<OrderRow>();
const columns = col.columns([
  col.accessor("time", {
    header: m.orders.columns.time,
    cell: (c) => (c.getValue() ? formatTime(c.getValue()!) : dash),
    meta: { className: "num text-muted-foreground" },
  }),
  col.accessor("name", { header: m.common.instrument, meta: { className: "font-medium" } }),
  col.accessor("side", {
    header: m.orders.columns.side,
    cell: (c) => <Side side={c.getValue()} />,
  }),
  col.accessor("volume", {
    header: m.common.quantity,
    cell: (c) => (c.getValue() == null ? dash : formatInteger(c.getValue()!)),
    meta: { align: "end", className: "sensitive num" },
  }),
  col.accessor("price", {
    header: m.common.price,
    cell: (c) => (c.getValue() == null ? dash : formatPrice(c.getValue()!)),
    meta: { align: "end", className: "num font-medium" },
  }),
  col.accessor((r) => (r.price != null && r.volume != null ? r.price * r.volume : null), {
    id: "amount",
    header: m.orders.columns.amount,
    cell: (c) =>
      c.getValue() == null
        ? dash
        : `${formatPrice(c.getValue()!)} ${c.row.original.currency ?? ""}`,
    meta: { align: "end", className: "sensitive num" },
  }),
  col.accessor("account", {
    header: m.common.account,
    cell: (c) => c.getValue() ?? dash,
    meta: { className: "text-muted-foreground" },
  }),
]);

/** Today's executed deals, listed and fund, newest first. Suspends while loading. */
export function DealsTable() {
  const { data } = useSuspenseQuery(dealsQuery);
  const focus = useFocusInstrument();
  const { id: account } = useAccount();
  // shortcut: rows without a readable account id are kept; filter server-side if the SDK adds it.
  const rows = [...data.deals, ...data.fundDeals]
    .map(toDealRow)
    .filter((r) => !account || !r.accountId || r.accountId === account)
    .sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""));

  if (rows.length === 0) return <Empty>{m.orders.empty.deals}</Empty>;
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.id}
      onRowClick={(r) => r.orderbookId && focus(r.orderbookId, r.type)}
      askAbout={(r) => instrumentItem(r.orderbookId, r.name, r.type)}
    />
  );
}
