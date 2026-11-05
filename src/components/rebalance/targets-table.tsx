import { cn } from "cn";
import { X } from "lucide-react";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { infoHeader } from "@/components/common/info-tip";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { useGroupMenu } from "@/components/portfolio/holdings/use-group-menu";
import type { RebalanceRow } from "@/components/rebalance/use-rebalance-plan";
import { WeightBar } from "@/components/rebalance/weight-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { instrumentItem } from "@/lib/ai/context";
import {
  formatDecimal,
  formatInteger,
  formatSignedShare,
  formatShare,
  parseDecimal,
} from "@/lib/format";
import { m } from "@/lib/i18n";

// Drift alerts suggest 5 %; mark the same as worth acting on.
const FAR = 0.05;

type Row = RebalanceRow & { scale: number };

const col = dataTableColumns<Row>();
const columns = col.columns([
  col.accessor("name", {
    header: infoHeader(m.common.instrument, m.rebalance.targets.columns.instrumentTip),
    cell: (c) => {
      const { isin, remove } = c.row.original;
      return (
        <span className="flex items-center gap-1.5">
          <InstrumentLogo isin={isin} name={c.getValue()} />
          <span className="max-w-56 truncate font-medium">{c.getValue()}</span>
          {remove && (
            <>
              <span className="text-muted-foreground text-xs">{m.rebalance.targets.added}</span>
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label={m.rebalance.targets.remove(c.getValue())}
                title={m.rebalance.targets.removeTitle}
                onClick={remove}
              >
                <X />
              </Button>
            </>
          )}
        </span>
      );
    },
  }),
  col.accessor("value", {
    header: m.rebalance.targets.columns.value,
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "sensitive num text-muted-foreground" },
  }),
  col.accessor("weight", {
    header: infoHeader(m.rebalance.targets.columns.now, m.rebalance.targets.columns.nowTip),
    cell: (c) => formatShare(c.getValue()),
    meta: { align: "end", className: "num" },
  }),
  col.accessor("target", {
    header: infoHeader(m.rebalance.targets.columns.target, m.rebalance.targets.columns.targetTip),
    cell: (c) => (
      <span className="flex items-center justify-end gap-1">
        <Input
          // Text, not number: a number input shows "4.5" and won't take Swedish "4,5".
          inputMode="decimal"
          aria-label={m.rebalance.targets.targetAria(c.row.original.name)}
          className="num h-6 w-16 text-right"
          // Uncontrolled: a controlled input fights half-typed values like "12,".
          defaultValue={formatDecimal(Math.round(c.getValue() * 1000) / 10)}
          onChange={(e) => {
            const v = parseDecimal(e.currentTarget.value);
            if (Number.isFinite(v)) c.row.original.setTarget(Math.min(Math.max(v, 0), 100) / 100);
          }}
        />
        <span className="text-muted-foreground">%</span>
      </span>
    ),
    meta: { align: "end" },
  }),
  col.display({
    id: "bar",
    header: infoHeader(m.rebalance.targets.columns.bar, m.rebalance.targets.columns.barTip),
    cell: (c) => {
      const { weight, target, scale } = c.row.original;
      return <WeightBar weight={weight} target={target} scale={scale} />;
    },
    meta: { align: "end" },
  }),
  col.accessor((r) => r.weight - r.target, {
    id: "drift",
    header: infoHeader(m.rebalance.targets.columns.drift, m.rebalance.targets.columns.driftTip),
    cell: (c) => {
      const drift = c.getValue();
      if (Math.abs(drift) < 0.0005)
        return <span className="text-muted-foreground">{m.rebalance.targets.onTarget}</span>;
      // Bright when it gets an order, muted when the tolerance or minimum order skips it.
      const tone =
        Math.abs(drift) >= FAR ? "text-warning" : !c.row.original.order && "text-muted-foreground";
      return (
        <span
          className={cn(tone)}
          title={c.row.original.order ? undefined : m.rebalance.targets.noOrder}
        >
          {formatSignedShare(drift)}
        </span>
      );
    },
    meta: { align: "end", className: "num" },
  }),
]);

/** Step 2: each instrument's weight now, its editable target, and how far apart they are. */
export function TargetsTable({ rows }: { rows: RebalanceRow[] }) {
  const scale = Math.max(...rows.map((r) => Math.max(r.weight, r.target)));
  const groupMenu = useGroupMenu();
  return (
    <>
      <DataTable
        columns={columns}
        data={rows.map((r) => ({ ...r, scale }))}
        getRowId={(r) => r.key}
        askAbout={(r) => instrumentItem(r.orderbookId, r.name, r.type, r.isin)}
        rowMenu={(selected) => groupMenu.menu(selected.map((r) => r.key))}
      />
      {groupMenu.dialog}
    </>
  );
}
