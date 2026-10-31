import { SavedPanelGroup } from "@/components/layout/saved-panel-group";
import { SignalsPanel } from "@/components/signals/signals-panel";
import { UpsidePanel } from "@/components/signals/upside-panel";
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable";
import { gutter } from "@/components/workspace/workspace";

/** What moved in the stocks you hold or watch (left) and how far analysts see them going (right). */
export function SignalsPage() {
  return (
    <SavedPanelGroup id="signals-group-1" orientation="horizontal">
      <ResizablePanel id="signals-panel-1" defaultSize="50" minSize="30">
        <SignalsPanel />
      </ResizablePanel>
      <ResizableHandle className={gutter} />
      <ResizablePanel id="signals-panel-2" defaultSize="50" minSize="30">
        <UpsidePanel />
      </ResizablePanel>
    </SavedPanelGroup>
  );
}
