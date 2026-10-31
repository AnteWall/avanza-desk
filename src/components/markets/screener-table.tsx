import { useSuspenseQuery } from "@tanstack/react-query";
import type { ScreenedStock } from "avanza-ts";

import { Change } from "@/components/common/change";
import { CountryFlag } from "@/components/common/country-flag";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { screenStocksQuery } from "@/lib/avanza/queries";
import { formatCompact, formatInteger, formatPrice, formatShare } from "@/lib/format";

const dash = "–";
const num = (value: number | undefined, format: (v: number) => string) =>
  value == null ? dash : format(value);
// Avanza sends percentages in percent units; Change and formatShare take ratios.
const change = (value: number | undefined) =>
  value == null ? dash : <Change ratio={value / 100} />;

const col = dataTableColumns<ScreenedStock>();
const columns = col.columns([
  col.accessor("name", {
    header: "Stock",
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <span className="max-w-48 truncate font-medium">{c.getValue()}</span>
        <CountryFlag code={c.row.original.countryCode} />
      </span>
    ),
  }),
  col.accessor("lastPrice", {
    header: "Last",
    cell: (c) => num(c.getValue(), formatPrice),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("oneDayChangePercent", {
    header: "Today",
    cell: (c) => change(c.getValue()),
    meta: { align: "end" },
  }),
  col.accessor("startOfYearChangePercent", {
    header: "YTD",
    cell: (c) => change(c.getValue()),
    meta: { align: "end" },
  }),
  col.accessor("priceEarningsRatio", {
    header: "P/E",
    cell: (c) => num(c.getValue(), formatPrice),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("directYield", {
    header: "Yield",
    cell: (c) => num(c.getValue(), (v) => formatShare(v / 100)),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("marketCapitalization", {
    header: "Market cap",
    cell: (c) => num(c.getValue(), formatCompact),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("numberOfOwners", {
    header: "Owners",
    cell: (c) => num(c.getValue(), formatInteger),
    meta: { align: "end", className: "num font-medium" },
  }),
]);

/** Stocks whose name matches `name`, most owned on Avanza first (top 100). Suspends. */
export function ScreenerTable({ name }: { name: string }) {
  const { data } = useSuspenseQuery(screenStocksQuery(name));
  const focus = useFocusInstrument();

  if (data.stocks.length === 0) return <Empty>No stocks match.</Empty>;
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
