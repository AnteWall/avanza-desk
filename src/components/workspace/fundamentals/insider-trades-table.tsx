import type { InsiderTrade } from "avanza-ts";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { formatDate, formatInteger, formatPrice } from "@/lib/format";

const col = dataTableColumns<InsiderTrade>();
const columns = col.columns([
  col.accessor("transactionDate", {
    header: "Date",
    cell: (c) => formatDate(c.getValue()),
    meta: { className: "num text-muted-foreground" },
  }),
  col.accessor("insiderName", { header: "Insider", meta: { className: "font-medium" } }),
  col.accessor("insiderPosition", {
    header: "Role",
    meta: { className: "max-w-48 truncate text-muted-foreground" },
  }),
  col.accessor("transactionType", {
    header: "Type",
    cell: (c) => c.getValue().toLowerCase().replaceAll("_", " "),
  }),
  col.accessor("quantity", {
    header: "Qty",
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("price", {
    header: "Price",
    cell: (c) => formatPrice(c.getValue()),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("totalValue", {
    header: "Value",
    cell: (c) => `${formatInteger(c.getValue())} ${c.row.original.currency}`,
    meta: { align: "end", className: "num font-medium" },
  }),
]);

/** Reported insider transactions, newest first. */
export function InsiderTradesTable({ trades }: { trades: readonly InsiderTrade[] }) {
  const rows = [...trades].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(t) => `${t.transactionDate}-${t.insiderName}-${t.quantity}-${t.price}`}
    />
  );
}
