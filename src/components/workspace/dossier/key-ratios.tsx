import { useQuery, useSuspenseQuery } from "@tanstack/react-query";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { StatList } from "@/components/workspace/chart/stat-list";
import { Section } from "@/components/workspace/dossier/section";
import type { Instrument } from "@/lib/avanza/instrument";
import { sectorAnalysisQuery, stockAnalysisQuery } from "@/lib/avanza/queries";
import { vsAverage } from "@/lib/avanza/stock-details";
import { formatPercent, formatPrice, formatShare } from "@/lib/format";

type Row = {
  label: string;
  now: number | null;
  average: number | null;
  sector: number | null;
  format: (v: number) => string;
};

// Keys shared by Avanza's analysis and sector endpoints; ROE comes as a fraction.
const ratios: { key: string; label: string; format?: (v: number) => string }[] = [
  { key: "priceEarningsRatio", label: "P/E" },
  { key: "evEbitRatio", label: "EV/EBIT" },
  { key: "priceSalesRatio", label: "P/S" },
  { key: "priceBookRatio", label: "P/B" },
  { key: "earningsPerShare", label: "EPS" },
  { key: "returnOnEquityRatio", label: "ROE", format: formatShare },
  { key: "netDebtEbitdaRatio", label: "Net debt / EBITDA" },
];

const value = (format: Row["format"]) => (v: number | null) => (v == null ? "–" : format(v));

const col = dataTableColumns<Row>();
const columns = col.columns([
  col.accessor("label", { header: "Ratio", meta: { className: "font-medium" } }),
  col.accessor("now", {
    header: "Now",
    cell: (c) => value(c.row.original.format)(c.getValue()),
    meta: { align: "end", className: "num font-medium" },
  }),
  col.accessor("average", {
    header: "Own average",
    cell: (c) => value(c.row.original.format)(c.getValue()),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.display({
    id: "vs",
    header: "Now vs average",
    cell: (c) => {
      const delta = vsAverage(c.row.original.now, c.row.original.average);
      return delta == null ? "–" : formatPercent(delta);
    },
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("sector", {
    header: "Sector",
    cell: (c) => value(c.row.original.format)(c.getValue()),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
]);

/** Valuation and profitability today, against the stock's own history and its sector. */
export function KeyRatios({ instrument }: { instrument: Instrument }) {
  const id = instrument.orderbookId;
  const { data: analysis } = useSuspenseQuery(stockAnalysisQuery(id));
  // The sector comparison is a bonus column; without it the table still reads.
  const { data: sector } = useQuery(sectorAnalysisQuery(id));
  const ki = instrument.stock?.keyIndicators;

  const rows: Row[] = ratios.flatMap(({ key, label, format = formatPrice }) => {
    const own = analysis.keyRatiosByYear[key];
    if (own?.latest == null) return [];
    const peer = sector?.indicators.find((i) => i.key === key)?.snapshot.average ?? null;
    return [{ label, now: own.latest, average: own.average, sector: peer, format }];
  });

  const share = (v: number | undefined) => (v == null ? "–" : formatShare(v));
  const extra = ki
    ? [
        { label: "Gross margin", value: share(ki.grossMargin) },
        { label: "Operating margin", value: share(ki.operatingProfitMargin) },
        { label: "Net margin", value: share(ki.netMargin) },
        { label: "ROCE", value: share(ki.returnOnCapitalEmployed) },
        { label: "Equity ratio", value: share(ki.equityRatio) },
        { label: "Beta", value: ki.beta == null ? "–" : formatPrice(ki.beta) },
        { label: "Volatility", value: share(ki.volatility) },
      ]
    : [];

  if (rows.length === 0 && !ki) return null;
  return (
    <Section title="Key ratios" aside={sector && `Sector: ${sector.sectorName}`} flush>
      {rows.length > 0 && <DataTable columns={columns} data={rows} getRowId={(r) => r.label} />}
      <div className="p-3">
        <StatList stats={extra} />
      </div>
    </Section>
  );
}
