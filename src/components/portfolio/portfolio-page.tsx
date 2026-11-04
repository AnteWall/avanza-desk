import { AsyncBoundary } from "@/components/common/async-boundary";
import { Skeleton } from "@/components/common/skeleton";
import { SavedPanelGroup } from "@/components/layout/saved-panel-group";
import { AllocationPanel } from "@/components/portfolio/allocation/allocation-panel";
import { HoldingsPanel } from "@/components/portfolio/holdings/holdings-panel";
import { PerformancePanel } from "@/components/portfolio/performance-panel";
import { PortfolioOverview } from "@/components/portfolio/portfolio-overview";
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable";
import { gutter } from "@/components/workspace/workspace";

const overviewSkeleton = (
  <div className="bg-card flex h-14 items-center gap-10 rounded-md border px-4">
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-4 w-64 opacity-60" />
  </div>
);

/**
 * Every account at once, fitted to the window like the workspace (panels scroll, the page
 * doesn't): headline numbers on top; performance and holdings (with dividends, accounts and key
 * figures) on the left; where the money is (industries, countries, types…) on the right.
 */
export function PortfolioPage() {
  return (
    <div className="flex h-full min-h-0 flex-col gap-1">
      <AsyncBoundary what="your portfolio" fallback={overviewSkeleton}>
        <PortfolioOverview />
      </AsyncBoundary>
      <div className="min-h-0 flex-1">
        <SavedPanelGroup id="portfolio-group-1" orientation="horizontal">
          <ResizablePanel id="portfolio-panel-1" defaultSize="54" minSize="30">
            <SavedPanelGroup id="portfolio-group-2" orientation="vertical">
              <ResizablePanel id="portfolio-panel-2" defaultSize="40" minSize="20">
                <PerformancePanel />
              </ResizablePanel>
              <ResizableHandle className={gutter} />
              <ResizablePanel id="portfolio-panel-3" defaultSize="60" minSize="20">
                <HoldingsPanel />
              </ResizablePanel>
            </SavedPanelGroup>
          </ResizablePanel>
          <ResizableHandle className={gutter} />
          <ResizablePanel id="portfolio-panel-4" defaultSize="46" minSize="25">
            <AllocationPanel />
          </ResizablePanel>
        </SavedPanelGroup>
      </div>
    </div>
  );
}
