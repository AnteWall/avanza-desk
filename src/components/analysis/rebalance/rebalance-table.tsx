import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink } from "lucide-react";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { SignedAmount } from "@/components/common/signed-amount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InstrumentType, OrderSide } from "@/lib/avanza/codes";
import { avanzaOrderUrl } from "@/lib/avanza/links";
import type { Holding } from "@/lib/avanza/portfolio";
import { formatInteger, formatShare } from "@/lib/format";
import type { Trade } from "@/lib/rebalance";

export type RebalanceRow = {
  holding: Holding;
  weight: number;
  target: number;
  trade: Trade;
  setTarget: (target: number) => void;
};

const col = dataTableColumns<RebalanceRow>();
const columns = col.columns([
  col.accessor((r) => r.holding.name, {
    id: "name",
    header: "Instrument",
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <InstrumentLogo isin={c.row.original.holding.isin} name={c.getValue()} />
        <span className="max-w-48 truncate font-medium">{c.getValue()}</span>
      </span>
    ),
  }),
  col.accessor((r) => r.holding.value, {
    id: "value",
    header: "Value SEK",
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "sensitive num" },
  }),
  col.accessor("weight", {
    header: "Weight",
    cell: (c) => formatShare(c.getValue()),
    meta: { align: "end", className: "num text-muted-foreground" },
  }),
  col.accessor("target", {
    header: "Target %",
    cell: (c) => (
      <Input
        type="number"
        min={0}
        max={100}
        step={0.5}
        aria-label={`Target for ${c.row.original.holding.name}`}
        className="num ml-auto h-6 w-20 text-right"
        // Uncontrolled: a controlled number input fights half-typed values like "12.".
        defaultValue={Math.round(c.getValue() * 1000) / 10}
        onChange={(e) => {
          const v = e.currentTarget.valueAsNumber;
          if (Number.isFinite(v)) c.row.original.setTarget(Math.max(0, v) / 100);
        }}
      />
    ),
    meta: { align: "end" },
  }),
  col.accessor((r) => r.trade.desired, {
    id: "desired",
    header: "Target SEK",
    cell: (c) => formatInteger(c.getValue()),
    meta: { align: "end", className: "sensitive num text-muted-foreground" },
  }),
  col.accessor((r) => r.trade.amount, {
    id: "amount",
    header: "Trade SEK",
    // `|| 0` turns a rounded -0 into 0, which would otherwise print as "−0".
    cell: (c) => <SignedAmount value={Math.round(c.getValue()) || 0} className="font-medium" />,
    meta: { align: "end", className: "sensitive" },
  }),
  col.accessor((r) => r.trade.shares, {
    id: "shares",
    header: "Order",
    cell: (c) => {
      const { holding, trade } = c.row.original;
      const shares = c.getValue();
      const amount = Math.round(trade.amount);
      const size = shares ?? amount;
      if (!size) return "–";
      const side = size > 0 ? OrderSide.Buy : OrderSide.Sell;
      const label =
        shares == null
          ? `${size > 0 ? "Buy" : "Sell"} for ${formatInteger(Math.abs(amount))} SEK`
          : `${size > 0 ? "Buy" : "Sell"} ${formatInteger(Math.abs(shares))}`;
      if (!holding.orderbookId) return label;
      // Funds open the fund page; stocks prefill the share count.
      const url = avanzaOrderUrl(
        holding.orderbookId,
        holding.name,
        side,
        holding.type === InstrumentType.Fund,
        shares == null ? undefined : Math.abs(shares),
      );
      return (
        <Button
          variant="outline"
          size="xs"
          title="Open in Avanza"
          onClick={() => void openUrl(url)}
        >
          {label}
          <ExternalLink data-icon="inline-end" />
        </Button>
      );
    },
    meta: { align: "end", className: "sensitive num" },
  }),
]);

/** Holdings with their weight, an editable target and the trade that reaches it. */
export function RebalanceTable({ rows }: { rows: RebalanceRow[] }) {
  return <DataTable columns={columns} data={rows} getRowId={(r) => r.holding.key} />;
}
