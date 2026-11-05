import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { formatInteger, formatShare } from "@/lib/format";
import { m } from "@/lib/i18n";
import type { Pair } from "@/lib/overlap";

const col = dataTableColumns<Pair>();
const columns = col.columns([
  col.accessor((r) => r.a.name, {
    id: "a",
    header: m.common.fund,
    meta: { className: "max-w-64 truncate font-medium" },
  }),
  col.accessor((r) => r.b.name, {
    id: "b",
    header: m.analysis.overlap.overlapsWith,
    meta: { className: "max-w-64 truncate font-medium" },
  }),
  col.accessor("overlap", {
    header: m.analysis.overlap.overlap,
    cell: (c) => formatShare(c.getValue()),
    meta: { align: "end", className: "num font-medium" },
  }),
  // The SEK you hold twice: the overlap share of the smaller position.
  col.accessor((r) => r.overlap * Math.min(r.a.value, r.b.value), {
    id: "sek",
    header: m.analysis.overlap.duplicated,
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "sensitive num text-muted-foreground" },
  }),
]);

/** Pairs of held funds/ETFs, most overlapping first. */
export function PairsTable({ rows }: { rows: Pair[] }) {
  return <DataTable columns={columns} data={rows} getRowId={(r) => `${r.a.key}:${r.b.key}`} />;
}
