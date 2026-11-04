import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { useTab } from "@/components/common/use-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { setTab } from "@/lib/tabs";

export type PanelTab = { value: string; label: string; icon: LucideIcon; content: ReactNode };

/**
 * A panel with several views: the tab bar replaces Panel's title bar. Only the open tab mounts.
 * The open tab is remembered across restarts under `id`, and `setTab(id, …)` switches it from
 * anywhere (src/lib/tabs.ts).
 */
export function TabbedPanel({
  id,
  tabs,
  aside,
}: {
  id: string;
  tabs: PanelTab[];
  aside?: ReactNode;
}) {
  const saved = useTab(id);
  return (
    <Tabs
      value={tabs.some((t) => t.value === saved) ? saved : tabs[0]?.value}
      onValueChange={(value: string) => setTab(id, value)}
      className="bg-card h-full min-h-0 gap-0 overflow-hidden rounded-md border"
    >
      <TabsList
        variant="line"
        // Matches Panel's title bar: 12px to the first icon, small uppercase titles.
        className="bg-muted/40 h-8 w-full shrink-0 justify-start gap-1 border-b px-1.5 py-0"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="h-full flex-none gap-2 rounded-none px-1.5 text-xs font-semibold tracking-wider uppercase"
          >
            <tab.icon className="size-3.5" />
            {tab.label}
          </TabsTrigger>
        ))}
        {aside && (
          <span className="text-muted-foreground ml-auto flex min-w-0 items-center gap-4 truncate px-1.5 text-xs">
            {aside}
          </span>
        )}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="min-h-0 overflow-auto">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
