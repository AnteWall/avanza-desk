import { BellRing, DollarSign, Newspaper, Percent, SlidersHorizontal } from "lucide-react";

import { AlertsTable } from "@/components/alerts/alerts-table";
import { RulesTable } from "@/components/alerts/rules-table";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { TabbedPanel } from "@/components/workspace/tabbed-panel";
import { m } from "@/lib/i18n";

const skeleton = <TableSkeleton rows={6} columns={5} />;

/** Your Avanza alerts (read-only: edit them in Avanza), and AvanzaDesk's own local rules. */
export function AlertsPage() {
  return (
    <TabbedPanel
      id="alerts"
      aside={m.alerts.page.aside}
      tabs={[
        {
          value: "price",
          label: m.alerts.page.tabs.price,
          icon: DollarSign,
          content: (
            <AsyncBoundary what={m.alerts.page.yourAlerts} fallback={skeleton}>
              <AlertsTable list="priceAlerts" />
            </AsyncBoundary>
          ),
        },
        {
          value: "percent",
          label: m.alerts.page.tabs.percent,
          icon: Percent,
          content: (
            <AsyncBoundary what={m.alerts.page.yourAlerts} fallback={skeleton}>
              <AlertsTable list="percentAlerts" />
            </AsyncBoundary>
          ),
        },
        {
          value: "news",
          label: m.alerts.page.tabs.news,
          icon: Newspaper,
          content: (
            <AsyncBoundary what={m.alerts.page.yourAlerts} fallback={skeleton}>
              <AlertsTable list="newsAlerts" />
            </AsyncBoundary>
          ),
        },
        {
          value: "triggered",
          label: m.alerts.page.tabs.triggered,
          icon: BellRing,
          content: (
            <AsyncBoundary what={m.alerts.page.triggeredAlerts} fallback={skeleton}>
              <AlertsTable list="triggered" />
            </AsyncBoundary>
          ),
        },
        {
          value: "rules",
          label: m.alerts.page.tabs.rules,
          icon: SlidersHorizontal,
          content: <RulesTable />,
        },
      ]}
    />
  );
}
