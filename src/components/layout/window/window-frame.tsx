import { ResizeEdges } from "@/components/layout/window/resize-edges";
import { useInAppFrame } from "@/components/layout/window/use-in-app-frame";
import { WindowControls } from "@/components/layout/window/window-controls";

/**
 * Before sign-in there is no top bar: a draggable strip with the controls sits over the sign-in
 * screen so the window can still be moved and closed.
 */
export function SignedOutFrame() {
  if (!useInAppFrame()) return null;
  return (
    <>
      <div
        data-tauri-drag-region
        className="fixed inset-x-0 top-0 z-[60] flex h-12 items-center justify-end px-3"
      >
        <WindowControls />
      </div>
      <ResizeEdges />
    </>
  );
}
