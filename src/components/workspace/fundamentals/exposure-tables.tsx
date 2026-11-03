import { CountryFlag } from "@/components/common/country-flag";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { formatShare } from "@/lib/format";

/** One line of a fund's or ETF's breakdown; `weight` is a fraction (0.05 = 5 %). */
export type ExposureRow = {
  name: string;
  weight: number;
  countryCode?: string;
  orderbookId?: string;
  type?: string;
};

const col = dataTableColumns<ExposureRow>();
const weightColumns = (header: string) =>
  col.columns([
    col.accessor("name", {
      header,
      cell: (c) => (
        <span className="flex items-center gap-1.5">
          <span className="font-medium">{c.getValue()}</span>
          <CountryFlag code={c.row.original.countryCode} />
        </span>
      ),
    }),
    col.accessor("weight", {
      header: "Weight",
      cell: (c) => formatShare(c.getValue()),
      meta: { align: "end", className: "num font-medium" },
    }),
  ]);
const holdingColumns = weightColumns("Holdings");
const countryColumns = weightColumns("Countries");
const sectorColumns = weightColumns("Sectors");

const byWeight = (rows: readonly ExposureRow[]) => [...rows].sort((a, b) => b.weight - a.weight);

/** Largest holdings, countries and sectors side by side; holdings open in the workspace. */
export function ExposureTables({
  holdings,
  countries,
  sectors,
}: {
  holdings: readonly ExposureRow[];
  countries: readonly ExposureRow[];
  sectors: readonly ExposureRow[];
}) {
  const focus = useFocusInstrument();
  return (
    <div className="grid divide-y @4xl:grid-cols-[2fr_1fr_1fr] @4xl:divide-x @4xl:divide-y-0">
      {holdings.length > 0 && (
        <DataTable
          columns={holdingColumns}
          data={byWeight(holdings)}
          getRowId={(h) => h.orderbookId ?? h.name}
          onRowClick={(h) => h.orderbookId && focus(h.orderbookId, h.type)}
        />
      )}
      {countries.length > 0 && (
        <DataTable columns={countryColumns} data={byWeight(countries)} getRowId={(c) => c.name} />
      )}
      {sectors.length > 0 && (
        <DataTable columns={sectorColumns} data={byWeight(sectors)} getRowId={(c) => c.name} />
      )}
    </div>
  );
}
