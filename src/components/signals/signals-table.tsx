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
import type { Signal, SignalKind } from "@/lib/signals";

/** What each kind of signal means, for someone who hasn't followed insiders or short sellers. */
const meaning: Record<SignalKind, string> = {
  insider:
    "Insiders are the company's executives and board members. Buying their own stock is often read as confidence; selling can have many reasons, like taxes or a house.",
  short:
    "Short interest is the share of the stock investors have borrowed and sold, betting the price will fall. Rising means more are pessimistic.",
  owners:
    "How fast the number of Avanza customers who own the stock is changing. Popularity, not a verdict on the company.",
  target:
    "The average price analysts expect the stock to reach in about a year. A raised target means they've grown more optimistic.",
  consensus: "The share of analysts who recommend buying the stock.",
  report:
    "The company publishes its results soon. Prices often move more than usual around a report.",
};

const reads: Record<Signal["tone"], string> = {
  up: "Good sign",
  down: "Warning sign",
  neutral: "Heads-up",
};

const col = dataTableColumns<StockSignal>();
const columns = col.columns([
  col.accessor("date", {
    header: "Date",
    cell: (c) => formatDay(c.getValue()),
    meta: { className: "text-muted-foreground" },
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
        <InfoTip label={c.getValue()}>{meaning[c.row.original.kind]}</InfoTip>
      </span>
    ),
  }),
  col.accessor((r) => reads[r.tone], {
    id: "reads",
    header: "Reads as",
    meta: { className: "text-muted-foreground" },
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
      onRowClick={(r) => focus(r.orderbookId, InstrumentType.Stock)}
      askAbout={(r) =>
        instrumentItem(r.orderbookId, r.stock.name, InstrumentType.Stock, r.stock.isin)
      }
    />
  );
}
