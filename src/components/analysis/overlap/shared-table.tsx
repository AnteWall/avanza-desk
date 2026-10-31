import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { formatInteger } from "@/lib/format";
import type { Shared } from "@/lib/overlap";

const col = dataTableColumns<Shared>();
const columns = col.columns([
  col.accessor("name", {
    header: "Company",
    meta: { className: "max-w-64 truncate font-medium" },
  }),
  col.accessor((r) => r.sources.join(", "), {
    id: "via",
    header: "Through",
    meta: { className: "max-w-96 truncate text-muted-foreground" },
  }),
  col.accessor("value", {
    header: "Exposure SEK",
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "sensitive num font-medium" },
  }),
]);

/** Underlying companies reached through several holdings, largest exposure first. */
export function SharedTable({ rows }: { rows: Shared[] }) {
  const focus = useFocusInstrument();
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.key}
      onRowClick={(r) => r.orderbookId && focus(r.orderbookId, "STOCK")}
    />
  );
}
