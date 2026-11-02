import { cn } from "cn";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { infoHeader } from "@/components/common/info-tip";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { OpenOrderButton } from "@/components/rebalance/open-order-button";
import type { RebalanceRow } from "@/components/rebalance/use-rebalance-plan";
import { OrderSide } from "@/lib/avanza/codes";
import { formatInteger } from "@/lib/format";
import type { Order } from "@/lib/rebalance";

type Row = RebalanceRow & { order: Order };

const col = dataTableColumns<Row>();
const columns = col.columns([
  col.accessor((r) => r.order.side, {
    id: "side",
    header: "Order",
    cell: (c) => {
      const buy = c.getValue() === OrderSide.Buy;
      return (
        <span className={cn("font-medium", buy ? "text-up" : "text-down")}>
          {buy ? "Buy" : "Sell"}
        </span>
      );
    },
  }),
  col.accessor("name", {
    header: "Instrument",
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <InstrumentLogo isin={c.row.original.isin} name={c.getValue()} />
        <span className="max-w-56 truncate font-medium">{c.getValue()}</span>
      </span>
    ),
  }),
  col.accessor((r) => r.accounts.join(", "), {
    id: "accounts",
    header: infoHeader(
      "Account",
      "Where you hold it. When it's in several, pick the account in Avanza: selling in an AF account is taxed, in an ISK it isn't.",
    ),
    // Holdings are summed over accounts, but a sell comes from one: AF is taxed, ISK isn't.
    cell: (c) => (
      <span className="block max-w-40 truncate">{c.getValue() || "Pick in Avanza"}</span>
    ),
    meta: { className: "text-muted-foreground" },
  }),
  col.accessor((r) => r.order.shares, {
    id: "shares",
    header: infoHeader(
      "Shares",
      "Whole shares, rounded down so a buy never costs more than planned. Funds trade in SEK, so they have no share count.",
    ),
    cell: (c) => {
      const shares = c.getValue();
      return shares == null ? (
        <span className="text-muted-foreground">in SEK</span>
      ) : (
        formatInteger(Math.abs(shares))
      );
    },
    meta: { align: "end", className: "sensitive num" },
  }),
  col.accessor((r) => r.order.amount, {
    id: "amount",
    header: "Amount SEK",
    cell: (c) => formatInteger(Math.abs(c.getValue())),
    meta: { align: "end", className: "sensitive num font-medium" },
  }),
  col.display({
    id: "open",
    header: "",
    cell: (c) => <OpenOrderButton row={c.row.original} />,
    meta: { align: "end" },
  }),
]);

/**
 * Step 3: the orders that reach the targets. Sells first, since they free the cash for the
 * buys; largest first within each side.
 */
export function OrdersTable({ rows }: { rows: RebalanceRow[] }) {
  const orders = rows
    .filter((r): r is Row => r.order != null)
    .sort(
      (a, b) =>
        Number(a.order.side === OrderSide.Buy) - Number(b.order.side === OrderSide.Buy) ||
        Math.abs(b.order.amount) - Math.abs(a.order.amount),
    );
  if (orders.length === 0)
    return <p className="text-muted-foreground p-3">Nothing to trade: you're on target.</p>;
  return <DataTable columns={columns} data={orders} getRowId={(r) => r.key} />;
}
