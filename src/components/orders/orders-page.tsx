import { ArrowLeftRight, Ban, Landmark, ListOrdered, ShieldAlert } from "lucide-react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { useAccount } from "@/components/layout/use-account";
import { DealsTable } from "@/components/orders/deals-table";
import { OrdersTable } from "@/components/orders/orders-table";
import { StopLossesTable } from "@/components/orders/stop-losses-table";
import { TabbedPanel } from "@/components/workspace/tabbed-panel";
import { m } from "@/lib/i18n";

const skeleton = <TableSkeleton rows={6} columns={8} />;

/** Every order list for the picked account(s). Read-only: avanza-ts can't place or cancel orders. */
export function OrdersPage() {
  const account = useAccount();
  return (
    <TabbedPanel
      id="orders"
      aside={m.orders.page.aside(account.label)}
      tabs={[
        {
          value: "open",
          label: m.orders.page.tabs.open,
          icon: ListOrdered,
          content: (
            <AsyncBoundary what={m.orders.page.what.orders} fallback={skeleton}>
              <OrdersTable list="orders" />
            </AsyncBoundary>
          ),
        },
        {
          value: "deals",
          label: m.orders.page.tabs.deals,
          icon: ArrowLeftRight,
          content: (
            <AsyncBoundary what={m.orders.page.what.deals} fallback={skeleton}>
              <DealsTable />
            </AsyncBoundary>
          ),
        },
        {
          value: "stop-loss",
          label: m.orders.page.tabs.stopLoss,
          icon: ShieldAlert,
          content: (
            <AsyncBoundary what={m.orders.page.what.stopLoss} fallback={skeleton}>
              <StopLossesTable />
            </AsyncBoundary>
          ),
        },
        {
          value: "fund",
          label: m.orders.page.tabs.fund,
          icon: Landmark,
          content: (
            <AsyncBoundary what={m.orders.page.what.fund} fallback={skeleton}>
              <OrdersTable list="fundOrders" />
            </AsyncBoundary>
          ),
        },
        {
          value: "cancelled",
          label: m.orders.page.tabs.cancelled,
          icon: Ban,
          content: (
            <AsyncBoundary what={m.orders.page.what.cancelled} fallback={skeleton}>
              <OrdersTable list="cancelledOrders" />
            </AsyncBoundary>
          ),
        },
      ]}
    />
  );
}
