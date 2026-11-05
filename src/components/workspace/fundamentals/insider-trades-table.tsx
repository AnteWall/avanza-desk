import type { InsiderTrade } from "avanza-ts";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { formatDate, formatInteger, formatPrice } from "@/lib/format";
import { m } from "@/lib/i18n";

const col = dataTableColumns<InsiderTrade>();
const columns = col.columns([
  col.accessor("transactionDate", {
    header: m.common.date,
    cell: (c) => formatDate(c.getValue()),
    meta: { className: "num text-muted-foreground" },
  }),
  col.accessor("insiderName", {
    header: m.workspace.insiders.insider,
    meta: { className: "font-medium" },
  }),
  col.accessor("insiderPosition", {
    header: m.workspace.insiders.role,
    meta: { className: "max-w-48 truncate text-muted-foreground" },
  }),
  col.accessor("transactionType", {
    header: m.common.type,
    cell: (c) =>
      m.workspace.insiders.types[c.getValue()] ?? c.getValue().toLowerCase().replaceAll("_", " "),
  }),
  col.accessor("quantity", {
    header: m.common.quantity,
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("price", {
    header: m.common.price,
    cell: (c) => formatPrice(c.getValue()),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("totalValue", {
    header: m.common.value,
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
      getRowId={(t, i) => `${t.transactionDate}-${t.insiderName}-${t.quantity}-${t.price}-${i}`}
    />
  );
}
