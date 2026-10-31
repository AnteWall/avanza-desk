import { TrendingDown, TrendingUp } from "lucide-react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { SavedPanelGroup } from "@/components/layout/saved-panel-group";
import { IndexPanel } from "@/components/markets/index-panel";
import { MoversTable } from "@/components/markets/movers-table";
import { ScreenerPanel } from "@/components/markets/screener-panel";
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable";
import { TabbedPanel } from "@/components/workspace/tabbed-panel";
import { gutter } from "@/components/workspace/workspace";

const skeleton = <TableSkeleton rows={10} columns={4} />;

/** Today's movers and index members on top, the stock screener below. Rows focus a stock. */
export function MarketsPage() {
  return (
    <SavedPanelGroup id="markets-group-1" orientation="vertical">
      <ResizablePanel id="markets-panel-1" defaultSize="50" minSize="20">
        <SavedPanelGroup id="markets-group-2" orientation="horizontal">
          <ResizablePanel id="markets-panel-2" defaultSize="55" minSize="25">
            <TabbedPanel
              id="movers"
              tabs={[
                {
                  value: "gainers",
                  label: "Gainers",
                  icon: TrendingUp,
                  content: (
                    <AsyncBoundary what="today's movers" fallback={skeleton}>
                      <MoversTable list="gainers" />
                    </AsyncBoundary>
                  ),
                },
                {
                  value: "losers",
                  label: "Losers",
                  icon: TrendingDown,
                  content: (
                    <AsyncBoundary what="today's movers" fallback={skeleton}>
                      <MoversTable list="losers" />
                    </AsyncBoundary>
                  ),
                },
              ]}
            />
          </ResizablePanel>
          <ResizableHandle className={gutter} />
          <ResizablePanel id="markets-panel-3" defaultSize="45" minSize="20">
            <IndexPanel />
          </ResizablePanel>
        </SavedPanelGroup>
      </ResizablePanel>
      <ResizableHandle className={gutter} />
      <ResizablePanel id="markets-panel-4" defaultSize="50" minSize="20">
        <ScreenerPanel />
      </ResizablePanel>
    </SavedPanelGroup>
  );
}
