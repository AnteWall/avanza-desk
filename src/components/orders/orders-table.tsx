import { useSuspenseQuery } from "@tanstack/react-query";
import type { OrdersResponse } from "avanza-ts";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { Side } from "@/components/common/side";
import { useAccount } from "@/components/layout/use-account";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { toOrderRow, type OrderRow } from "@/lib/avanza/loose-records";
import { ordersQuery } from "@/lib/avanza/queries";
import { formatDate, formatDateTime, formatInteger, formatPrice } from "@/lib/format";
import { m } from "@/lib/i18n";

const dash = "–";

const col = dataTableColumns<OrderRow>();
const columns = col.columns([
  col.accessor("time", {
    header: m.orders.columns.placed,
    cell: (c) => (c.getValue() ? formatDateTime(c.getValue()!) : dash),
    meta: { className: "num text-muted-foreground" },
  }),
  col.accessor("name", { header: m.common.instrument, meta: { className: "font-medium" } }),
  col.accessor("side", {
    header: m.orders.columns.side,
    cell: (c) => <Side side={c.getValue()} />,
  }),
  col.accessor("volume", {
    header: m.orders.columns.filled,
    cell: (c) =>
      c.getValue() == null
        ? dash
        : `${formatInteger(c.row.original.filled ?? 0)} / ${formatInteger(c.getValue()!)}`,
    meta: { align: "end", className: "sensitive num" },
  }),
  col.accessor("price", {
    header: m.orders.columns.limit,
    cell: (c) =>
      c.getValue() == null
        ? dash
        : `${formatPrice(c.getValue()!)} ${c.row.original.currency ?? ""}`,
    meta: { align: "end", className: "num font-medium" },
  }),
  col.accessor("state", {
    header: m.orders.columns.state,
    cell: (c) => c.getValue()?.toLowerCase().replaceAll("_", " ") ?? dash,
    meta: { className: "text-muted-foreground" },
  }),
  col.accessor("validUntil", {
    header: m.orders.columns.validUntil,
    cell: (c) => (c.getValue() ? formatDate(c.getValue()!) : dash),
    meta: { className: "num text-muted-foreground" },
  }),
  col.accessor("account", {
    header: m.common.account,
    cell: (c) => c.getValue() ?? dash,
    meta: { className: "text-muted-foreground" },
  }),
]);

const emptyText: Record<keyof OrdersResponse, string> = m.orders.empty;

/** One of Avanza's order lists; clicking an order focuses its instrument. Suspends. */
export function OrdersTable({ list }: { list: keyof OrdersResponse }) {
  const { data } = useSuspenseQuery(ordersQuery);
  const focus = useFocusInstrument();
  const { id: account } = useAccount();
  // shortcut: rows without a readable account id are kept; filter server-side if the SDK adds it.
  const rows = data[list]
    .map(toOrderRow)
    .filter((r) => !account || !r.accountId || r.accountId === account);

  if (rows.length === 0) return <Empty>{emptyText[list]}</Empty>;
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
