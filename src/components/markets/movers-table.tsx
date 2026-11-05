import { useSuspenseQuery } from "@tanstack/react-query";
import type { MoverStock } from "avanza-ts";

import { Change } from "@/components/common/change";
import { CountryFlag } from "@/components/common/country-flag";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { gainersLosersQuery } from "@/lib/avanza/queries";
import { formatCompact, formatPrice } from "@/lib/format";
import { m } from "@/lib/i18n";

const dash = "–";

const col = dataTableColumns<MoverStock>();
const columns = col.columns([
  col.accessor("name", {
    header: m.markets.columns.stock,
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <span className="font-medium">{c.getValue()}</span>
        <CountryFlag code={c.row.original.countryCode} />
      </span>
    ),
  }),
  col.accessor("lastPrice", {
    header: m.common.last,
    cell: (c) => (c.getValue() == null ? dash : formatPrice(c.getValue()!)),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("oneDayChangePercent", {
    header: m.common.today,
    // The stock filter sends ratios (0.8035 = +80.35 %), unlike quotes.
    cell: (c) => (c.getValue() == null ? dash : <Change ratio={c.getValue()!} />),
    meta: { align: "end" },
  }),
  col.accessor("totalValueTraded", {
    header: m.common.turnover,
    cell: (c) => (c.getValue() == null ? dash : formatCompact(c.getValue()!)),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
]);

/** Today's biggest gainers or losers on Avanza's default stock list. Suspends. */
export function MoversTable({ list }: { list: "gainers" | "losers" }) {
  const { data } = useSuspenseQuery(gainersLosersQuery);
  const focus = useFocusInstrument();

  if (data[list].length === 0) return <Empty>{m.markets.movers.empty}</Empty>;
  return (
    <DataTable
      columns={columns}
      data={[...data[list]]}
      getRowId={(s) => s.orderbookId}
      onRowClick={(s) => focus(s.orderbookId, s.type)}
      askAbout={(s) => instrumentItem(s.orderbookId, s.name, s.type)}
    />
  );
}
