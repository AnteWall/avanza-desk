import { useSuspenseQuery } from "@tanstack/react-query";
import type { Dividend } from "avanza-ts";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { StatList } from "@/components/workspace/chart/stat-list";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { paidDividendsQuery } from "@/lib/avanza/queries";
import { formatDate, formatInteger, formatPrice } from "@/lib/format";

const dash = "–";

const col = dataTableColumns<Dividend>();
const columns = col.columns([
  col.accessor("date", {
    header: "Paid",
    cell: (c) => formatDate(c.getValue()),
    meta: { className: "num text-muted-foreground" },
  }),
  col.accessor((d) => d.orderbook?.name ?? d.instrumentName, {
    id: "instrument",
    header: "Instrument",
    meta: { className: "font-medium" },
  }),
  col.accessor("volume", {
    header: "Shares",
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "sensitive num" },
  }),
  col.accessor("amountPerShare", {
    header: "Per share",
    cell: (c) =>
      c.getValue() ? `${formatPrice(c.getValue()!.value)} ${c.getValue()!.currency}` : dash,
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("amountInSek", {
    header: "Received SEK",
    cell: (c) => formatPrice(c.getValue()),
    meta: { align: "end", className: "sensitive num font-medium" },
  }),
]);

/** Dividends paid out to you, newest first, with a total per year. Suspends. */
export function PaidDividendsTable() {
  const { data } = useSuspenseQuery(paidDividendsQuery);
  const focus = useFocusInstrument();
  const rows = [...data].sort((a, b) => b.date.localeCompare(a.date));

  const perYear = new Map<string, number>();
  for (const d of rows)
    perYear.set(d.date.slice(0, 4), (perYear.get(d.date.slice(0, 4)) ?? 0) + d.amountInSek);

  if (rows.length === 0) return <Empty>No dividends received yet.</Empty>;
  return (
    <div className="flex flex-col">
      <div className="border-b p-3">
        <StatList
          stats={[...perYear].slice(0, 6).map(([year, sum]) => ({
            label: year,
            value: `${formatInteger(sum)} SEK`,
            className: "sensitive",
          }))}
        />
      </div>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(d) => `${d.date}-${d.isin}-${d.accountId}`}
        onRowClick={(d) => d.orderbook && focus(d.orderbook.id, d.orderbook.type)}
      />
    </div>
  );
}
