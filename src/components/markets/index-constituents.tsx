import { useQueries, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import type { IndexConstituent } from "avanza-ts";

import { Change } from "@/components/common/change";
import { CountryFlag } from "@/components/common/country-flag";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { Skeleton } from "@/components/common/skeleton";
import { Heatmap, type HeatTile } from "@/components/markets/heatmap";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { InstrumentType } from "@/lib/avanza/codes";
import { indexConstituentsQuery, instrumentQuery, marketCapsQuery } from "@/lib/avanza/queries";
import { m } from "@/lib/i18n";

// shortcut: one stock-guide read per member (sector, logo ISIN); bigger indices skip it, so
// their tiles keep their market-cap size but have no sectors or logos. Upgrade to a batch
// endpoint if one lists sectors.
const DETAILS_LIMIT = 100;

const col = dataTableColumns<IndexConstituent>();
const columns = col.columns([
  col.accessor("name", {
    header: m.markets.columns.constituent,
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <span className="font-medium">{c.getValue()}</span>
        <CountryFlag code={c.row.original.countryCode} />
      </span>
    ),
  }),
  col.accessor("changePercent", {
    header: m.common.today,
    // Despite its name, Avanza sends a ratio here (0.0389 = +3.89 %), unlike the quote's percent.
    cell: (c) => (c.getValue() == null ? "–" : <Change ratio={c.getValue()!} />),
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
  // Shares the Overview panel's cache (an hour); a failed read just leaves that tile plain.
  const details = useQueries({
    queries: rows.map((c) => ({
      ...instrumentQuery(c.orderbookId, InstrumentType.Stock),
      enabled: view === "map" && rows.length <= DETAILS_LIMIT,
    })),
  });
  const ids = data.map((c) => c.orderbookId);
  const marketCaps = useQuery({
    ...marketCapsQuery(ids),
    enabled: view === "map" && ids.length > 0,
  });
  const loading = marketCaps.isLoading || details.some((d) => d.isLoading);
  const caps = rows.map((c) => marketCaps.data?.[c.orderbookId] ?? 0);
  // A member without a known cap gets the median, so it still shows at a typical size.
  const known = caps.filter((c) => c > 0).sort((a, b) => a - b);
  const typical = known[Math.floor(known.length / 2)] ?? 1;
  const tiles: HeatTile[] = rows.map((c, i) => {
    const info = details[i]?.data;
    return {
      id: c.orderbookId,
      name: c.name,
      ticker: info?.shortName ?? c.name,
      isin: info?.isin,
      // Avanza lists sectors most specific first; group by the broadest ("Industri").
      sector: info?.stock?.sectors.at(-1)?.sectorName,
      weight: caps[i] || typical,
      change: c.changePercent,
    };
  });

  if (rows.length === 0) return <Empty>{m.markets.index.noConstituents}</Empty>;
  if (view === "map")
    return (
      <div className="h-full p-1">
        {loading ? (
          <Skeleton className="h-full min-h-72 w-full rounded-md" />
        ) : (
          <Heatmap tiles={tiles} onPick={(t) => focus(t.id, InstrumentType.Stock)} />
        )}
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
