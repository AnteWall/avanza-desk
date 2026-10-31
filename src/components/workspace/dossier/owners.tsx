import { useSuspenseQuery } from "@tanstack/react-query";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Section } from "@/components/workspace/dossier/section";
import { stockDetailsQuery } from "@/lib/avanza/queries";
import { formatDate, formatShare } from "@/lib/format";

type Owner = { name: string; percentOfCapital: number; percentOfVotes: number };

// Percent units.
const col = dataTableColumns<Owner>();
const columns = col.columns([
  col.accessor("name", { header: "Owner", meta: { className: "font-medium" } }),
  col.accessor("percentOfCapital", {
    header: "Capital",
    cell: (c) => formatShare(c.getValue() / 100),
    meta: { align: "end", className: "num font-medium" },
  }),
  col.accessor("percentOfVotes", {
    header: "Votes",
    cell: (c) => formatShare(c.getValue() / 100),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
]);

/** The largest owners by share of capital, with their voting power. */
export function Owners({ orderbookId }: { orderbookId: string }) {
  const { data } = useSuspenseQuery(stockDetailsQuery(orderbookId));
  const owners = data.companyOwners;
  if (!owners?.owners.length) return null;
  const rows = [...owners.owners].sort((a, b) => b.percentOfCapital - a.percentOfCapital);
  return (
    <Section title="Major owners" aside={`as of ${formatDate(owners.updated)}`} flush>
      <DataTable columns={columns} data={rows} getRowId={(o) => o.name} />
    </Section>
  );
}
