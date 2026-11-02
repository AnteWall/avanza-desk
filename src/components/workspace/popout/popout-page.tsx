import { SavedPanelGroup } from "@/components/layout/saved-panel-group";
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable";
import { DossierPanel } from "@/components/workspace/dossier/dossier-panel";
import { LiveFeed } from "@/components/workspace/live-feed";
import { OrderBookPanel } from "@/components/workspace/order-book/order-book-panel";
import { gutter } from "@/components/workspace/workspace";

/** One instrument's overview and order book, for a second screen. */
export function PopoutPage() {
  return (
    <>
      <LiveFeed />
      <SavedPanelGroup id="popout-columns" orientation="horizontal">
        <ResizablePanel id="popout-dossier" defaultSize="65" minSize="35">
          <DossierPanel />
        </ResizablePanel>
        <ResizableHandle className={gutter} />
        <ResizablePanel id="popout-order-book" defaultSize="35" minSize="20">
          <OrderBookPanel />
        </ResizablePanel>
      </SavedPanelGroup>
    </>
  );
}
