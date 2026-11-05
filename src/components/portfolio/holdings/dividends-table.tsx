import { useSuspenseQuery } from "@tanstack/react-query";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { useHoldings } from "@/components/portfolio/use-holdings";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import type { Holding } from "@/lib/avanza/portfolio";
import { stockKeyRatiosQuery } from "@/lib/avanza/queries";
import { formatInteger, formatPrice, formatShare } from "@/lib/format";
import { m } from "@/lib/i18n";

type Row = {
  holding: Holding;
  date: string | null;
  perShare?: number;
  currency?: string;
  perYear: number | null;
  dividendYield: number;
  yearly: number;
};

const dash = "–";

const col = dataTableColumns<Row>();
const columns = col.columns([
  col.accessor((r) => r.holding.name, {
    id: "name",
    header: m.common.instrument,
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <InstrumentLogo isin={c.row.original.holding.isin} name={c.getValue()} />
        <span className="max-w-48 truncate font-medium">{c.getValue()}</span>
      </span>
    ),
  }),
  col.accessor("date", {
    header: m.portfolio.dividends.next,
    cell: (c) => c.getValue() ?? dash,
    meta: { className: "num" },
  }),
  col.accessor("perShare", {
    header: m.portfolio.dividends.perShare,
    cell: (c) =>
      c.getValue() == null ? dash : `${formatPrice(c.getValue()!)} ${c.row.original.currency}`,
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor((r) => (r.perShare == null ? null : r.perShare * r.holding.volume), {
    id: "payout",
    header: m.portfolio.dividends.nextPayout,
    cell: (c) =>
      c.getValue() == null ? dash : `${formatInteger(c.getValue()!)} ${c.row.original.currency}`,
    meta: { align: "end", className: "sensitive num font-medium" },
  }),
  col.accessor("perYear", {
    header: m.portfolio.dividends.perYear,
    cell: (c) => (c.getValue() ? `${c.getValue()}×` : dash),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("dividendYield", {
    header: m.common.yield,
    cell: (c) => formatShare(c.getValue()),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("yearly", {
    header: m.portfolio.dividends.yearly,
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "sensitive num font-medium" },
  }),
]);

/** Dividend-paying stocks, next payout first, with an estimate of yearly income. */
export function DividendsTable() {
  const { holdings } = useHoldings({ grouped: true });
  const { data: ratios } = useSuspenseQuery(stockKeyRatiosQuery);
  const focus = useFocusInstrument();

  const byPosition = new Map(ratios.map((r) => [r.positionId, r]));
  const rows: Row[] = [];
  for (const holding of holdings) {
    const r = holding.positionIds.map((id) => byPosition.get(id)).find(Boolean);
    // Avanza sends the yield in percent units.
    const dividendYield = (r?.relativeYearlyDividend.value ?? 0) / 100;
    if (!r || (dividendYield <= 0 && !r.nextDividendDate)) continue;
    rows.push({
      holding,
      date: r.nextDividendDate,
      perShare: r.nextDividend?.value,
      currency: r.nextDividend?.unit,
      perYear: r.dividendsPerYear,
      dividendYield,
      yearly: holding.value * dividendYield,
    });
  }
  // ISO dates sort as strings; no date (not announced) goes last.
  rows.sort((a, b) => (a.date ?? "~").localeCompare(b.date ?? "~"));

  if (rows.length === 0)
    return <p className="text-muted-foreground p-3">{m.portfolio.dividends.empty}</p>;
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
