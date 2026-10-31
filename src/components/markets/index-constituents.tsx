import { useSuspenseQuery } from "@tanstack/react-query";
import type { IndexConstituent } from "avanza-ts";

import { Change } from "@/components/common/change";
import { CountryFlag } from "@/components/common/country-flag";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { indexConstituentsQuery } from "@/lib/avanza/queries";

const col = dataTableColumns<IndexConstituent>();
const columns = col.columns([
  col.accessor("name", {
    header: "Constituent",
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <span className="font-medium">{c.getValue()}</span>
        <CountryFlag code={c.row.original.countryCode} />
      </span>
    ),
  }),
  col.accessor("changePercent", {
    header: "Today",
    // Avanza sends percent units; Change takes a ratio.
    cell: (c) => (c.getValue() == null ? "–" : <Change ratio={c.getValue()! / 100} />),
    meta: { align: "end" },
  }),
]);

/** An index's members, best performer first. Suspends while loading. */
export function IndexConstituents({ orderbookId }: { orderbookId: string }) {
  const { data } = useSuspenseQuery(indexConstituentsQuery(orderbookId));
  const focus = useFocusInstrument();
  const rows = [...data].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));

  if (rows.length === 0) return <Empty>Avanza lists no constituents for this index.</Empty>;
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(c) => c.orderbookId}
      onRowClick={(c) => focus(c.orderbookId, "STOCK")}
      askAbout={(c) => instrumentItem(c.orderbookId, c.name, "STOCK")}
    />
  );
}
