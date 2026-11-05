import { useSuspenseQuery } from "@tanstack/react-query";
import type { ScreenedStock } from "avanza-ts";

import { Change } from "@/components/common/change";
import { CountryFlag } from "@/components/common/country-flag";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { infoHeader } from "@/components/common/info-tip";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { screenStocksQuery } from "@/lib/avanza/queries";
import { formatCompact, formatInteger, formatPrice, formatShare } from "@/lib/format";
import { m } from "@/lib/i18n";

const dash = "–";
const num = (value: number | undefined, format: (v: number) => string) =>
  value == null ? dash : format(value);
// The stock filter sends price changes and yield as ratios (0.0274 = 2.74 %), unlike quotes.
const change = (value: number | undefined) => (value == null ? dash : <Change ratio={value} />);

const col = dataTableColumns<ScreenedStock>();
const columns = col.columns([
  col.accessor("name", {
    header: m.markets.columns.stock,
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <span className="max-w-48 truncate font-medium">{c.getValue()}</span>
        <CountryFlag code={c.row.original.countryCode} />
      </span>
    ),
  }),
  col.accessor("lastPrice", {
    header: m.common.last,
    cell: (c) => num(c.getValue(), formatPrice),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("oneDayChangePercent", {
    header: m.common.today,
    cell: (c) => change(c.getValue()),
    meta: { align: "end" },
  }),
  col.accessor("startOfYearChangePercent", {
    header: m.markets.columns.ytd,
    cell: (c) => change(c.getValue()),
    meta: { align: "end" },
  }),
  col.accessor("priceEarningsRatio", {
    header: infoHeader(m.markets.screener.pe, m.markets.screener.peTip),
    cell: (c) => num(c.getValue(), formatPrice),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("directYield", {
    header: infoHeader(m.common.yield, m.markets.screener.yieldTip),
    cell: (c) => num(c.getValue(), formatShare),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("marketCapitalization", {
    header: infoHeader(m.markets.screener.marketCap, m.markets.screener.marketCapTip),
    cell: (c) => num(c.getValue(), formatCompact),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("numberOfOwners", {
    header: m.markets.columns.owners,
    cell: (c) => num(c.getValue(), formatInteger),
    meta: { align: "end", className: "num font-medium" },
  }),
]);

/** Stocks whose name matches `name`, most owned on Avanza first (top 100). Suspends. */
export function ScreenerTable({ name }: { name: string }) {
  const { data } = useSuspenseQuery(screenStocksQuery(name));
  const focus = useFocusInstrument();

  if (data.stocks.length === 0) return <Empty>{m.markets.screener.empty}</Empty>;
  return (
    <DataTable
      columns={columns}
      data={[...data.stocks]}
      getRowId={(s) => s.orderbookId}
      onRowClick={(s) => focus(s.orderbookId, s.type)}
      askAbout={(s) => instrumentItem(s.orderbookId, s.name, s.type)}
    />
  );
}
