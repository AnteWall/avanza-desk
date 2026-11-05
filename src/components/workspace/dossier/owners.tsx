import { useSuspenseQuery } from "@tanstack/react-query";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Section } from "@/components/workspace/dossier/section";
import { stockDetailsQuery } from "@/lib/avanza/queries";
import { formatDate, formatShare } from "@/lib/format";
import { m } from "@/lib/i18n";

type Owner = { name: string; percentOfCapital: number; percentOfVotes: number };

// Percent units.
const col = dataTableColumns<Owner>();
const columns = col.columns([
  col.accessor("name", { header: m.workspace.owners.owner, meta: { className: "font-medium" } }),
  col.accessor("percentOfCapital", {
    header: m.workspace.owners.capital,
    cell: (c) => formatShare(c.getValue() / 100),
    meta: { align: "end", className: "num font-medium" },
  }),
  col.accessor("percentOfVotes", {
    header: m.workspace.owners.votes,
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
    <Section
      title={m.workspace.owners.title}
      aside={m.workspace.dossier.asOf(formatDate(owners.updated))}
      flush
    >
      <DataTable columns={columns} data={rows} getRowId={(o) => o.name} />
    </Section>
  );
}
