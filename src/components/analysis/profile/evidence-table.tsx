import { Change } from "@/components/common/change";
import { CountryFlag } from "@/components/common/country-flag";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { SignedAmount } from "@/components/common/signed-amount";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { formatDate, formatInteger } from "@/lib/format";
import { m } from "@/lib/i18n";
import type { Evidence, Finding } from "@/lib/trading-profile";

const col = dataTableColumns<Evidence>();
const columns = col.columns([
  col.accessor("name", {
    header: m.common.instrument,
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <InstrumentLogo isin={c.row.original.isin} name={c.getValue()} />
        <span className="max-w-48 truncate font-medium">{c.getValue()}</span>
        <CountryFlag code={c.row.original.flagCode} />
      </span>
    ),
  }),
  col.accessor("from", {
    header: m.analysis.profile.from,
    cell: (c) => formatDate(c.getValue()),
    meta: { className: "num text-muted-foreground" },
  }),
  col.accessor("to", {
    header: m.analysis.profile.to,
    cell: (c) => formatDate(c.getValue()),
    meta: { className: "num text-muted-foreground" },
  }),
  col.accessor("days", {
    header: m.analysis.profile.days,
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("change", {
    header: m.analysis.profile.change,
    cell: (c) => <Change ratio={c.getValue()} />,
    meta: { align: "end" },
  }),
  col.accessor("result", {
    header: m.analysis.profile.result,
    cell: (c) => <SignedAmount value={c.getValue()} />,
    meta: { align: "end", className: "sensitive font-medium" },
  }),
]);

/** The trades behind a check, worst result first; a row opens the stock. */
export function EvidenceTable({ finding }: { finding: Finding }) {
  const focus = useFocusInstrument();
  return (
    <>
      {finding.evidence.length === 0 ? (
        <Empty>{m.analysis.profile.noEvidence}</Empty>
      ) : (
        <DataTable
          columns={columns}
          data={finding.evidence}
          getRowId={(e) => e.id}
          onRowClick={(e) => e.orderbookId && focus(e.orderbookId, e.type)}
          askAbout={(e) => instrumentItem(e.orderbookId, e.name, e.type, e.isin)}
        />
      )}
    </>
  );
}
