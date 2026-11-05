import { X } from "lucide-react";

import type { BasketRow } from "@/components/basket/use-basket";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { infoHeader } from "@/components/common/info-tip";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { instrumentItem } from "@/lib/ai/context";
import { formatDecimal, formatShare, parseDecimal } from "@/lib/format";
import { m } from "@/lib/i18n";

const col = dataTableColumns<BasketRow>();
const columns = col.columns([
  col.accessor("name", {
    header: m.common.instrument,
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <InstrumentLogo isin={c.row.original.isin} name={c.getValue()} />
        <span className="max-w-56 truncate font-medium">{c.getValue()}</span>
        {c.row.original.owned && (
          <span className="text-muted-foreground text-xs">{m.basket.table.owned}</span>
        )}
      </span>
    ),
  }),
  col.accessor((r) => r.item.weight, {
    id: "weight",
    header: infoHeader(m.basket.table.weight, m.basket.table.weightTip),
    cell: (c) => (
      <Input
        inputMode="decimal"
        aria-label={m.basket.table.weightAria(c.row.original.name)}
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
    header: infoHeader(m.basket.table.share, m.basket.table.shareTip),
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
        aria-label={m.basket.table.remove(c.row.original.name)}
        title={m.basket.table.removeTitle}
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
