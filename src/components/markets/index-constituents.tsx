import { useSuspenseQuery } from "@tanstack/react-query";
import type { IndexConstituent } from "avanza-ts";

import { Change } from "@/components/common/change";
import { CountryFlag } from "@/components/common/country-flag";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { Heatmap } from "@/components/markets/heatmap";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { InstrumentType } from "@/lib/avanza/codes";
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

/** An index's members, best performer first, as a table or a heatmap. Suspends while loading. */
export function IndexConstituents({
  orderbookId,
  view,
}: {
  orderbookId: string;
  view: "list" | "map";
}) {
  const { data } = useSuspenseQuery(indexConstituentsQuery(orderbookId));
  const focus = useFocusInstrument();
  const rows = [...data].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
  const tiles = rows.map((c) => ({
    id: c.orderbookId,
    name: c.name,
    // Avanza sends percent units; tiles take a ratio.
    change: c.changePercent == null ? null : c.changePercent / 100,
  }));

  if (rows.length === 0) return <Empty>Avanza lists no constituents for this index.</Empty>;
  if (view === "map")
    return (
      <div className="p-1">
        <Heatmap tiles={tiles} onPick={(t) => focus(t.id, InstrumentType.Stock)} />
      </div>
    );
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(c) => c.orderbookId}
      onRowClick={(c) => focus(c.orderbookId, InstrumentType.Stock)}
      askAbout={(c) => instrumentItem(c.orderbookId, c.name, InstrumentType.Stock)}
    />
  );
}
