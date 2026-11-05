import { useSuspenseQuery } from "@tanstack/react-query";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { InfoTip } from "@/components/common/info-tip";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { SignalTone } from "@/components/signals/signal-tone";
import { useSignals, type StockSignal } from "@/components/signals/use-signals";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { InstrumentType } from "@/lib/avanza/codes";
import { universeQuery } from "@/lib/avanza/queries";
import { formatDay } from "@/lib/format";
import { m } from "@/lib/i18n";
import type { Signal, SignalKind } from "@/lib/signals";

/** What each kind of signal means, for someone who hasn't followed insiders or short sellers. */
const meaning: Record<SignalKind, string> = m.signals.table.meaning;
const reads: Record<Signal["tone"], string> = m.signals.table.reads;

const col = dataTableColumns<StockSignal>();
const columns = col.columns([
  col.accessor("date", {
    header: m.common.date,
    cell: (c) => formatDay(c.getValue()),
    meta: { className: "text-muted-foreground" },
  }),
  col.accessor((r) => r.stock.name, {
    id: "name",
    header: m.signals.table.stock,
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <InstrumentLogo isin={c.row.original.stock.isin} name={c.getValue()} />
        <span className="max-w-40 truncate font-medium">{c.getValue()}</span>
      </span>
    ),
  }),
  col.accessor("text", {
    header: m.signals.table.signal,
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <SignalTone tone={c.row.original.tone} />
        {c.getValue()}
        <InfoTip label={c.getValue()}>{meaning[c.row.original.kind]}</InfoTip>
      </span>
    ),
  }),
  col.accessor((r) => reads[r.tone], {
    id: "reads",
    header: m.signals.table.readsAs,
    meta: { className: "text-muted-foreground" },
  }),
  col.accessor((r) => (r.stock.held ? m.signals.panel.held : m.signals.panel.watched), {
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
    return pending ? (
      <TableSkeleton rows={8} columns={4} />
    ) : (
      <Empty>{m.signals.table.empty}</Empty>
    );
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => `${r.orderbookId}:${r.kind}:${r.date}`}
      onRowClick={(r) => focus(r.orderbookId, InstrumentType.Stock)}
      askAbout={(r) =>
        instrumentItem(r.orderbookId, r.stock.name, InstrumentType.Stock, r.stock.isin)
      }
    />
  );
}
