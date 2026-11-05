import { Briefcase, Building2, Coins, Factory, Globe, Shapes } from "lucide-react";
import type { ReactNode } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { CountryAllocation } from "@/components/portfolio/allocation/country-allocation";
import { CurrencyAllocation } from "@/components/portfolio/allocation/currency-allocation";
import { HoldingAllocation } from "@/components/portfolio/allocation/holding-allocation";
import { SectorAllocation } from "@/components/portfolio/allocation/sector-allocation";
import { TypeAllocation } from "@/components/portfolio/allocation/type-allocation";
import { UnderlyingAllocation } from "@/components/portfolio/allocation/underlying-allocation";
import { TabbedPanel } from "@/components/workspace/tabbed-panel";
import { m } from "@/lib/i18n";

const body = (what: string, table: ReactNode) => (
  <AsyncBoundary what={what} fallback={<TableSkeleton rows={8} columns={4} />}>
    {table}
  </AsyncBoundary>
);

/**
 * Where your money is, one way of slicing it at a time: instruments, industries, countries, asset types,
 * currencies, and the companies inside your funds. Funds are looked through to what they hold.
 */
export function AllocationPanel() {
  return (
    <TabbedPanel
      id="portfolio-allocation"
      tabs={[
        {
          value: "instrument",
          label: m.portfolio.allocation.tabs.instrument,
          icon: Briefcase,
          content: body(m.portfolio.allocation.loading.instrument, <HoldingAllocation />),
        },
        {
          value: "sector",
          label: m.portfolio.allocation.tabs.sector,
          icon: Factory,
          content: body(m.portfolio.allocation.loading.sector, <SectorAllocation />),
        },
        {
          value: "country",
          label: m.portfolio.allocation.tabs.country,
          icon: Globe,
          content: body(m.portfolio.allocation.loading.country, <CountryAllocation />),
        },
        {
          value: "type",
          label: m.portfolio.allocation.tabs.type,
          icon: Shapes,
          content: body(m.portfolio.allocation.loading.type, <TypeAllocation />),
        },
        {
          value: "currency",
          label: m.portfolio.allocation.tabs.currency,
          icon: Coins,
          content: body(m.portfolio.allocation.loading.currency, <CurrencyAllocation />),
        },
        {
          value: "underlying",
          label: m.portfolio.allocation.tabs.underlying,
          icon: Building2,
          content: body(m.portfolio.allocation.loading.underlying, <UnderlyingAllocation />),
        },
      ]}
    />
  );
}
