import { useSuspenseQuery } from "@tanstack/react-query";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Section } from "@/components/workspace/dossier/section";
import { stockDetailsQuery } from "@/lib/avanza/queries";
import type { Dividend } from "@/lib/avanza/stock-details";
import { formatDate, formatPrice } from "@/lib/format";

const SHOWN = 8;

const col = dataTableColumns<Dividend & { upcoming: boolean }>();
const columns = col.columns([
  col.accessor("exDate", {
    header: "Ex-date",
    cell: (c) => formatDate(c.getValue()),
    meta: { className: "num" },
  }),
  col.accessor("paymentDate", {
    header: "Paid",
    cell: (c) => {
      const date = c.getValue();
      return c.row.original.upcoming ? "Upcoming" : date ? formatDate(date) : "–";
    },
    meta: { className: "num text-muted-foreground" },
  }),
  col.accessor("dividendType", {
    header: "Type",
    cell: (c) => c.getValue().toLowerCase().replaceAll("_", " "),
    meta: { className: "text-muted-foreground" },
  }),
  col.accessor("amount", {
    header: "Amount",
    cell: (c) => `${formatPrice(c.getValue())} ${c.row.original.currencyCode}`,
    meta: { align: "end", className: "num font-medium" },
  }),
]);

/** Announced dividends, then the most recent paid ones. */
export function Dividends({ orderbookId }: { orderbookId: string }) {
  const { data } = useSuspenseQuery(stockDetailsQuery(orderbookId));
  const { events = [], pastEvents = [] } = data.dividends ?? {};
  const rows = [
    ...events.map((d) => ({ ...d, upcoming: true })),
    ...pastEvents.map((d) => ({ ...d, upcoming: false })),
  ].slice(0, SHOWN);
  if (rows.length === 0) return null;
  return (
    <Section title="Dividends" flush>
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(d) => `${d.exDate}-${d.dividendType}-${d.amount}`}
      />
    </Section>
  );
}
