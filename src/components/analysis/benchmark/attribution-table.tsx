import { useSuspenseQuery } from "@tanstack/react-query";
import type { InsightsPeriod } from "avanza-ts";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { SignedAmount } from "@/components/common/signed-amount";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { insightsQuery } from "@/lib/avanza/queries";
import { formatPercent } from "@/lib/format";
import { m } from "@/lib/i18n";

type Row = {
  isin: string;
  name: string;
  orderbookId: string;
  type: string;
  development: number;
  dividends: number;
  total: number;
  share: number;
};

const amount = (c: { getValue: () => number }) => <SignedAmount value={c.getValue()} />;

const col = dataTableColumns<Row>();
const columns = col.columns([
  col.accessor("name", {
    header: m.common.instrument,
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <InstrumentLogo isin={c.row.original.isin} name={c.getValue()} />
        <span className="max-w-48 truncate font-medium">{c.getValue()}</span>
      </span>
    ),
  }),
  col.accessor("development", {
    header: m.analysis.benchmark.price,
    cell: amount,
    meta: { align: "end", className: "sensitive" },
  }),
  col.accessor("dividends", {
    header: m.common.dividends,
    cell: amount,
    meta: { align: "end", className: "sensitive" },
  }),
  col.accessor("total", {
    header: m.analysis.benchmark.total,
    cell: amount,
    meta: { align: "end", className: "sensitive font-medium" },
  }),
  col.accessor("share", {
    header: m.analysis.benchmark.ofResult,
    cell: (c) => formatPercent(c.getValue()),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
]);

/** What each position earned over the period (price and dividends), biggest contributor first. */
export function AttributionTable({ period }: { period: InsightsPeriod }) {
  const { data } = useSuspenseQuery(insightsQuery(period));
  const focus = useFocusInstrument();
  const positions = data.developmentResponse.instruments.flatMap((g) => g.positions);
  const sum = positions.reduce((s, p) => s + p.outcome.total, 0);
  const rows: Row[] = positions
    .map((p) => ({
      isin: p.isin,
      name: p.shortName,
      orderbookId: p.link.orderbookId,
      type: p.link.type,
      development: p.outcome.development,
      dividends: p.outcome.dividends,
      total: p.outcome.total,
      share: sum ? p.outcome.total / sum : 0,
    }))
    .sort((a, b) => b.total - a.total);
  if (rows.length === 0)
    return <p className="text-muted-foreground p-3">{m.analysis.benchmark.empty}</p>;
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.isin}
      onRowClick={(r) => focus(r.orderbookId, r.type)}
    />
  );
}
