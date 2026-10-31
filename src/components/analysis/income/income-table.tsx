import { Change } from "@/components/common/change";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { formatInteger, formatShare } from "@/lib/format";
import type { IncomeRow } from "@/lib/income";

const dash = "–";

const col = dataTableColumns<IncomeRow>();
const columns = col.columns([
  col.accessor((r) => r.holding.name, {
    id: "name",
    header: "Instrument",
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <InstrumentLogo isin={c.row.original.holding.isin} name={c.getValue()} />
        <span className="max-w-48 truncate font-medium">{c.getValue()}</span>
      </span>
    ),
  }),
  col.accessor("announced", {
    header: "Announced",
    cell: (c) => (c.getValue() ? formatInteger(c.getValue()) : dash),
    meta: { align: "end", className: "sensitive num text-muted-foreground" },
  }),
  col.accessor("estimated", {
    header: "Estimated",
    cell: (c) => (c.getValue() ? formatInteger(c.getValue()) : dash),
    meta: { align: "end", className: "sensitive num text-muted-foreground" },
  }),
  col.accessor("income", {
    header: "12 months SEK",
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "sensitive num font-medium" },
  }),
  col.accessor("yieldOnCost", {
    header: "Yield on cost",
    cell: (c) => (c.getValue() == null ? dash : formatShare(c.getValue()!)),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("growth", {
    header: "Growth / share",
    cell: (c) => (c.getValue() == null ? dash : <Change ratio={c.getValue()!} />),
    meta: { align: "end" },
  }),
]);

/** Dividend income per holding over the next 12 months, largest first. */
export function IncomeTable({ rows }: { rows: IncomeRow[] }) {
  const focus = useFocusInstrument();
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.holding.key}
      onRowClick={(r) => r.holding.orderbookId && focus(r.holding.orderbookId, r.holding.type)}
      askAbout={(r) =>
        instrumentItem(r.holding.orderbookId, r.holding.name, r.holding.type, r.holding.isin)
      }
    />
  );
}
