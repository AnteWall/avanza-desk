import { useQuery } from "@tanstack/react-query";

import { Change } from "@/components/common/change";
import { CountryFlag } from "@/components/common/country-flag";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { SignedAmount } from "@/components/common/signed-amount";
import { useLookThroughs } from "@/components/portfolio/use-holdings";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { dividendYields, holdingYield, typeLabel, type Holding } from "@/lib/avanza/portfolio";
import { stockKeyRatiosQuery } from "@/lib/avanza/queries";
import { sessionLabel } from "@/lib/exchanges";
import { formatInteger, formatShare } from "@/lib/format";

type Row = Holding & { sector: string; weight: number; dividendYield?: number };

const dash = "–";

const col = dataTableColumns<Row>();
const columns = col.columns([
  col.accessor("name", {
    header: "Instrument",
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <InstrumentLogo isin={c.row.original.isin} name={c.getValue()} />
        <span className="max-w-48 truncate font-medium">{c.getValue()}</span>
        <CountryFlag code={c.row.original.flagCode} />
      </span>
    ),
  }),
  col.accessor("sector", {
    header: "Sector / type",
    meta: { className: "text-muted-foreground max-w-36 truncate" },
  }),
  col.accessor((h) => h.accounts.join(", "), {
    id: "accounts",
    header: "Accounts",
    meta: { className: "text-muted-foreground max-w-36 truncate" },
  }),
  col.accessor("value", {
    header: "Value",
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "sensitive num font-medium" },
  }),
  col.accessor("weight", {
    header: "Weight",
    cell: (c) => formatShare(c.getValue()),
    meta: { align: "end", className: "num" },
  }),
  col.accessor((h) => (h.value - h.today > 0 ? h.today / (h.value - h.today) : 0), {
    id: "today",
    // The last trading day: "Friday" over a weekend.
    header: () => sessionLabel(new Date()),
    cell: (c) => <Change ratio={c.getValue()} />,
    meta: { align: "end" },
  }),
  col.accessor("profit", {
    header: "P/L",
    cell: (c) => (c.row.original.cost ? <SignedAmount value={c.getValue()} /> : dash),
    meta: { align: "end", className: "sensitive" },
  }),
  col.accessor((h) => (h.cost ? h.profit / h.cost : null), {
    id: "return",
    header: "Return",
    cell: (c) => (c.getValue() == null ? dash : <Change ratio={c.getValue()!} />),
    meta: { align: "end" },
  }),
  col.accessor("dividendYield", {
    header: "Yield",
    cell: (c) => (c.getValue() ? formatShare(c.getValue()!) : dash),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
]);

/** Every instrument once, summed over accounts. Clicking one opens it in the workspace. */
export function HoldingsTable() {
  // Sectors fill in as each look-through arrives; the table doesn't wait for them.
  const { holdings, byKey } = useLookThroughs();
  const { data: ratios } = useQuery(stockKeyRatiosQuery);
  const focus = useFocusInstrument();

  if (holdings.length === 0) return <p className="text-muted-foreground p-3">No holdings.</p>;
  const total = holdings.reduce((sum, h) => sum + h.value, 0);
  const yields = dividendYields(ratios ?? []);
  const rows: Row[] = holdings.map((h) => ({
    ...h,
    sector: (h.type === "STOCK" && byKey.get(h.key)?.sectors[0]?.name) || typeLabel(h.type),
    weight: total ? h.value / total : 0,
    dividendYield: holdingYield(h, yields),
  }));
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(h) => h.key}
      onRowClick={(h) => h.orderbookId && focus(h.orderbookId, h.type)}
      askAbout={(h) => instrumentItem(h.orderbookId, h.name, h.type, h.isin)}
    />
  );
}
