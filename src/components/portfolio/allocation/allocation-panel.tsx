import { Building2, Coins, Factory, Globe, Shapes } from "lucide-react";
import type { ReactNode } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { CountryAllocation } from "@/components/portfolio/allocation/country-allocation";
import { CurrencyAllocation } from "@/components/portfolio/allocation/currency-allocation";
import { SectorAllocation } from "@/components/portfolio/allocation/sector-allocation";
import { TypeAllocation } from "@/components/portfolio/allocation/type-allocation";
import { UnderlyingAllocation } from "@/components/portfolio/allocation/underlying-allocation";
import { TabbedPanel } from "@/components/workspace/tabbed-panel";

const body = (what: string, table: ReactNode) => (
  <AsyncBoundary what={what} fallback={<TableSkeleton rows={8} columns={4} />}>
    {table}
  </AsyncBoundary>
);

/**
 * Where your money is, one way of slicing it at a time: industries, countries, asset types,
 * currencies, and the companies inside your funds. Funds are looked through to what they hold.
 */
export function AllocationPanel() {
  return (
    <TabbedPanel
      id="portfolio-allocation"
      tabs={[
        {
          value: "sector",
          label: "Industries",
          icon: Factory,
          content: body("industries", <SectorAllocation />),
        },
        {
          value: "country",
          label: "Countries",
          icon: Globe,
          content: body("countries", <CountryAllocation />),
        },
        {
          value: "type",
          label: "Asset types",
          icon: Shapes,
          content: body("asset types", <TypeAllocation />),
        },
        {
          value: "currency",
          label: "Currencies",
          icon: Coins,
          content: body("currencies", <CurrencyAllocation />),
        },
        {
          value: "underlying",
          label: "Companies",
          icon: Building2,
          content: body("companies", <UnderlyingAllocation />),
        },
      ]}
    />
  );
}
