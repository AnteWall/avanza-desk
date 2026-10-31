import { Coins, Shapes } from "lucide-react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { CurrencyAllocation } from "@/components/portfolio/allocation/currency-allocation";
import { TypeAllocation } from "@/components/portfolio/allocation/type-allocation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const tabs = [
  { value: "type", label: "Asset types", icon: Shapes, content: <TypeAllocation /> },
  { value: "currency", label: "Currencies", icon: Coins, content: <CurrencyAllocation /> },
];

/** Asset classes and currencies, cash included. */
export function MixPanel() {
  return (
    <Tabs
      defaultValue="type"
      className="bg-card h-full min-h-0 gap-0 overflow-hidden rounded-md border"
    >
      <TabsList
        variant="line"
        className="bg-muted/40 h-8 w-full shrink-0 justify-start border-b px-2"
      >
        {tabs.map((t) => (
          <TabsTrigger key={t.value} value={t.value} className="flex-none font-semibold">
            <t.icon />
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.value} value={t.value} className="min-h-0 overflow-auto">
          <AsyncBoundary what="your allocation" fallback={<TableSkeleton rows={5} columns={4} />}>
            {t.content}
          </AsyncBoundary>
        </TabsContent>
      ))}
    </Tabs>
  );
}
