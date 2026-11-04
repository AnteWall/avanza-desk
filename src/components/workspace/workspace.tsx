import { SavedPanelGroup } from "@/components/layout/saved-panel-group";
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable";
import { DossierPanel } from "@/components/workspace/dossier/dossier-panel";
import { LiveFeed } from "@/components/workspace/live-feed";
import { OrderBookPanel } from "@/components/workspace/order-book/order-book-panel";
import { PreTradePanel } from "@/components/workspace/pre-trade/pre-trade-panel";
import { WatchlistPanel } from "@/components/workspace/watchlist-panel";
import { getWorkspaceLayout } from "@/lib/density";

// Panels sit on the app background with a 4px gutter; the gutter is the resize handle.
export const gutter =
  "w-1 bg-transparent transition-colors hover:bg-ring/40 aria-[orientation=horizontal]:h-1";

// Ids are new for this layout, so sizes saved for the old grid can't land on other panels.
export function Workspace() {
  // Simple (Settings › General): watchlist and dossier, no order book or pre-trade column.
  if (getWorkspaceLayout() === "simple")
    return (
      <>
        <LiveFeed />
        <SavedPanelGroup id="desk-columns-simple" orientation="horizontal">
          <ResizablePanel id="desk-watchlist" defaultSize="24" minSize="12">
            <WatchlistPanel />
          </ResizablePanel>
          <ResizableHandle className={gutter} />
          <ResizablePanel id="desk-dossier" defaultSize="76" minSize="35">
            <DossierPanel />
          </ResizablePanel>
        </SavedPanelGroup>
      </>
    );
  return (
    <>
      <LiveFeed />
      <SavedPanelGroup id="desk-columns" orientation="horizontal">
        <ResizablePanel id="desk-watchlist" defaultSize="20" minSize="12">
          <WatchlistPanel />
        </ResizablePanel>
        <ResizableHandle className={gutter} />
        <ResizablePanel id="desk-dossier" defaultSize="56" minSize="35">
          <DossierPanel />
        </ResizablePanel>
        <ResizableHandle className={gutter} />
        <ResizablePanel id="desk-trading" defaultSize="24" minSize="15">
          <SavedPanelGroup id="desk-trading-rows" orientation="vertical">
            <ResizablePanel id="desk-order-book" defaultSize="58" minSize="20">
              <OrderBookPanel />
            </ResizablePanel>
            <ResizableHandle className={gutter} />
            <ResizablePanel id="desk-pre-trade" defaultSize="42" minSize="20">
              <PreTradePanel />
            </ResizablePanel>
          </SavedPanelGroup>
        </ResizablePanel>
      </SavedPanelGroup>
    </>
  );
}
