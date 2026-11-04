import { X } from "lucide-react";

import type { BasketRow } from "@/components/basket/use-basket";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { infoHeader } from "@/components/common/info-tip";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { instrumentItem } from "@/lib/ai/context";
import { formatDecimal, formatShare, parseDecimal } from "@/lib/format";

const col = dataTableColumns<BasketRow>();
const columns = col.columns([
  col.accessor("name", {
    header: "Instrument",
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <InstrumentLogo isin={c.row.original.isin} name={c.getValue()} />
        <span className="max-w-56 truncate font-medium">{c.getValue()}</span>
        {c.row.original.owned && <span className="text-muted-foreground text-xs">Owned</span>}
      </span>
    ),
  }),
  col.accessor((r) => r.item.weight, {
    id: "weight",
    header: infoHeader(
      "Weight",
      "How much of the money it gets compared to the others: 2 gets twice as much as 1, 0 gets nothing. Saved as you type.",
    ),
    cell: (c) => (
      <Input
        inputMode="decimal"
        aria-label={`Weight for ${c.row.original.name}`}
        className="num ml-auto h-6 w-16 text-right"
        // Uncontrolled: a controlled input fights half-typed values like "1,".
        defaultValue={formatDecimal(c.getValue())}
        onChange={(e) => {
          const v = parseDecimal(e.currentTarget.value);
          if (Number.isFinite(v)) c.row.original.setWeight(Math.max(v, 0));
        }}
      />
    ),
    meta: { align: "end" },
  }),
  col.accessor("target", {
    header: infoHeader("Share", "Its share of the money: its weight over all weights."),
    cell: (c) => formatShare(c.getValue()),
    meta: { align: "end", className: "num" },
  }),
  col.display({
    id: "remove",
    header: "",
    cell: (c) => (
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Remove ${c.row.original.name} from the basket`}
        title="Remove from the basket"
        onClick={c.row.original.remove}
      >
        <X />
      </Button>
    ),
    meta: { align: "end" },
  }),
]);

/** The basket's instruments with their weights and resulting shares of the money. */
export function BasketTable({ rows }: { rows: BasketRow[] }) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      getRowId={(r) => r.key}
      askAbout={(r) => instrumentItem(r.orderbookId, r.name, r.type, r.isin)}
    />
  );
}
