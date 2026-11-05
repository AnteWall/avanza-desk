import { cn } from "cn";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { infoHeader } from "@/components/common/info-tip";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { OpenOrderButton } from "@/components/rebalance/open-order-button";
import type { RebalanceRow } from "@/components/rebalance/use-rebalance-plan";
import { OrderSide } from "@/lib/avanza/codes";
import { formatInteger } from "@/lib/format";
import { m } from "@/lib/i18n";
import type { Order } from "@/lib/rebalance";

type Row = RebalanceRow & { order: Order };

const col = dataTableColumns<Row>();
const columns = col.columns([
  col.accessor((r) => r.order.side, {
    id: "side",
    header: m.rebalance.orders.columns.order,
    cell: (c) => {
      const buy = c.getValue() === OrderSide.Buy;
      return (
        <span className={cn("font-medium", buy ? "text-up" : "text-down")}>
          {buy ? m.common.buy : m.common.sell}
        </span>
      );
    },
  }),
  col.accessor("name", {
    header: m.common.instrument,
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <InstrumentLogo isin={c.row.original.isin} name={c.getValue()} />
        <span className="max-w-56 truncate font-medium">{c.getValue()}</span>
      </span>
    ),
  }),
  col.accessor((r) => r.accounts.join(", "), {
    id: "accounts",
    header: infoHeader(m.common.account, m.rebalance.orders.columns.accountTip),
    // Holdings are summed over accounts, but a sell comes from one: AF is taxed, ISK isn't.
    cell: (c) => (
      <span className="block max-w-40 truncate">
        {c.getValue() || m.rebalance.orders.columns.pickInAvanza}
      </span>
    ),
    meta: { className: "text-muted-foreground" },
  }),
  col.accessor((r) => r.order.shares, {
    id: "shares",
    header: infoHeader(m.common.shares, m.rebalance.orders.columns.sharesTip),
    cell: (c) => {
      const shares = c.getValue();
      return shares == null ? (
        <span className="text-muted-foreground">{m.rebalance.orders.columns.inSek}</span>
      ) : (
        formatInteger(Math.abs(shares))
      );
    },
    meta: { align: "end", className: "sensitive num" },
  }),
  col.accessor((r) => r.order.amount, {
    id: "amount",
    header: m.rebalance.orders.columns.amount,
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
export function OrdersTable({
  rows,
  empty = m.rebalance.orders.empty,
}: {
  rows: RebalanceRow[];
  empty?: string;
}) {
  const orders = rows
    .filter((r): r is Row => r.order != null)
    .sort(
      (a, b) =>
        Number(a.order.side === OrderSide.Buy) - Number(b.order.side === OrderSide.Buy) ||
        Math.abs(b.order.amount) - Math.abs(a.order.amount),
    );
  if (orders.length === 0) return <p className="text-muted-foreground p-3">{empty}</p>;
  return <DataTable columns={columns} data={orders} getRowId={(r) => r.key} />;
}
