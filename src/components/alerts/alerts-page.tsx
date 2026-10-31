import { BellRing, DollarSign, Newspaper, Percent, SlidersHorizontal } from "lucide-react";

import { AlertsTable } from "@/components/alerts/alerts-table";
import { RulesTable } from "@/components/alerts/rules-table";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { TabbedPanel } from "@/components/workspace/tabbed-panel";

const skeleton = <TableSkeleton rows={6} columns={5} />;

/** Your Avanza alerts (read-only: edit them in Avanza), and AvanzaDesk's own local rules. */
export function AlertsPage() {
  return (
    <TabbedPanel
      id="alerts"
      aside="Manage alerts in Avanza"
      tabs={[
        {
          value: "price",
          label: "Price",
          icon: DollarSign,
          content: (
            <AsyncBoundary what="your alerts" fallback={skeleton}>
              <AlertsTable list="priceAlerts" />
            </AsyncBoundary>
          ),
        },
        {
          value: "percent",
          label: "Percent",
          icon: Percent,
          content: (
            <AsyncBoundary what="your alerts" fallback={skeleton}>
              <AlertsTable list="percentAlerts" />
            </AsyncBoundary>
          ),
        },
        {
          value: "news",
          label: "News",
          icon: Newspaper,
          content: (
            <AsyncBoundary what="your alerts" fallback={skeleton}>
              <AlertsTable list="newsAlerts" />
            </AsyncBoundary>
          ),
        },
        {
          value: "triggered",
          label: "Triggered",
          icon: BellRing,
          content: (
            <AsyncBoundary what="triggered alerts" fallback={skeleton}>
              <AlertsTable list="triggered" />
            </AsyncBoundary>
          ),
        },
        {
          value: "rules",
          label: "Rules",
          icon: SlidersHorizontal,
          content: <RulesTable />,
        },
      ]}
    />
  );
}
