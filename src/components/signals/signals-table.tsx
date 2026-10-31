import { useSuspenseQuery } from "@tanstack/react-query";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { SignalTone } from "@/components/signals/signal-tone";
import { useSignals, type StockSignal } from "@/components/signals/use-signals";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { universeQuery } from "@/lib/avanza/queries";
import { formatDate } from "@/lib/format";

const col = dataTableColumns<StockSignal>();
const columns = col.columns([
  col.accessor("date", {
    header: "Date",
    cell: (c) => formatDate(c.getValue()),
    meta: { className: "num text-muted-foreground" },
  }),
  col.accessor((r) => r.stock.name, {
    id: "name",
    header: "Stock",
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <InstrumentLogo isin={c.row.original.stock.isin} name={c.getValue()} />
        <span className="max-w-40 truncate font-medium">{c.getValue()}</span>
      </span>
    ),
  }),
  col.accessor("text", {
    header: "Signal",
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <SignalTone tone={c.row.original.tone} />
        {c.getValue()}
      </span>
    ),
  }),
  col.accessor((r) => (r.stock.held ? "Held" : "Watched"), {
    id: "source",
    header: "",
    meta: { className: "text-muted-foreground text-xs" },
  }),
]);

/** Ranked signals for held (or also watched) stocks. */
export function SignalsTable({ heldOnly }: { heldOnly: boolean }) {
  const { data: universe } = useSuspenseQuery(universeQuery);
  const { signals, pending } = useSignals(universe);
  const focus = useFocusInstrument();
  const rows = heldOnly ? signals.filter((s) => s.stock.held) : signals;

  if (rows.length === 0)
    return pending ? <TableSkeleton rows={8} columns={4} /> : <Empty>No signals right now.</Empty>;
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => `${r.orderbookId}:${r.kind}:${r.date}`}
      onRowClick={(r) => focus(r.orderbookId, "STOCK")}
      askAbout={(r) => instrumentItem(r.orderbookId, r.stock.name, "STOCK", r.stock.isin)}
    />
  );
}
