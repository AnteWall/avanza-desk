import { Change } from "@/components/common/change";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { formatInteger } from "@/lib/format";
import type { YearRow } from "@/lib/years";

const money = { align: "end", className: "sensitive num text-muted-foreground" } as const;

const col = dataTableColumns<YearRow>();
const columns = col.columns([
  col.accessor("year", {
    header: "Year",
    cell: (c) => <span className="num font-medium">{c.getValue()}</span>,
  }),
  col.accessor("return", {
    header: "Return",
    cell: (c) => <Change ratio={c.getValue()} />,
    meta: { align: "end", className: "num" },
  }),
  col.accessor("deposits", {
    header: "Deposits",
    cell: (c) => formatInteger(c.getValue()),
    meta: money,
  }),
  col.accessor("dividends", {
    header: "Dividends",
    cell: (c) => formatInteger(c.getValue()),
    meta: money,
  }),
  col.accessor("end", {
    header: "Value at end",
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "sensitive num font-medium" },
  }),
]);

/** One row per year, newest first. */
export function YearsTable({ rows }: { rows: readonly YearRow[] }) {
  return (
    <DataTable columns={columns} data={[...rows].reverse()} getRowId={(r) => String(r.year)} />
  );
}
