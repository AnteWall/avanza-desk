import { ArrowLeftRight, Ban, Landmark, ListOrdered, ShieldAlert } from "lucide-react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { useAccount } from "@/components/layout/use-account";
import { DealsTable } from "@/components/orders/deals-table";
import { OrdersTable } from "@/components/orders/orders-table";
import { StopLossesTable } from "@/components/orders/stop-losses-table";
import { TabbedPanel } from "@/components/workspace/tabbed-panel";

const skeleton = <TableSkeleton rows={6} columns={8} />;

/** Every order list for the picked account(s). Read-only: avanza-ts can't place or cancel orders. */
export function OrdersPage() {
  const account = useAccount();
  return (
    <TabbedPanel
      id="orders"
      aside={`${account.label} · manage orders in Avanza`}
      tabs={[
        {
          value: "open",
          label: "Open",
          icon: ListOrdered,
          content: (
            <AsyncBoundary what="your orders" fallback={skeleton}>
              <OrdersTable list="orders" />
            </AsyncBoundary>
          ),
        },
        {
          value: "deals",
          label: "Today's trades",
          icon: ArrowLeftRight,
          content: (
            <AsyncBoundary what="today's trades" fallback={skeleton}>
              <DealsTable />
            </AsyncBoundary>
          ),
        },
        {
          value: "stop-loss",
          label: "Stop-loss",
          icon: ShieldAlert,
          content: (
            <AsyncBoundary what="stop-loss orders" fallback={skeleton}>
              <StopLossesTable />
            </AsyncBoundary>
          ),
        },
        {
          value: "fund",
          label: "Fund orders",
          icon: Landmark,
          content: (
            <AsyncBoundary what="fund orders" fallback={skeleton}>
              <OrdersTable list="fundOrders" />
            </AsyncBoundary>
          ),
        },
        {
          value: "cancelled",
          label: "Cancelled",
          icon: Ban,
          content: (
            <AsyncBoundary what="cancelled orders" fallback={skeleton}>
              <OrdersTable list="cancelledOrders" />
            </AsyncBoundary>
          ),
        },
      ]}
    />
  );
}
