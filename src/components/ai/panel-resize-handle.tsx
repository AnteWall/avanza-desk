import { usePanelSize } from "@/components/ai/use-panel-size";
import { DEFAULT_WIDTH, MIN_WIDTH, setPanelWidth } from "@/lib/ai/panel";
import { m } from "@/lib/i18n";

const STEP = 24;

/**
 * The assistant panel's left edge: drag to resize, arrow keys for keyboard users, double-click
 * for the default width. Sits in the gutter, like the workspace's resize handles.
 */
export function PanelResizeHandle() {
  const { width, expanded } = usePanelSize();

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={m.ai.panel.resize}
      aria-valuenow={expanded ? undefined : width}
      aria-valuemin={MIN_WIDTH}
      tabIndex={0}
      onPointerDown={(e) => {
        // Start from the rendered width, so dragging out of expanded mode doesn't jump.
        const start = e.currentTarget.parentElement?.getBoundingClientRect().width ?? width;
        const x = e.clientX;
        const el = e.currentTarget;
        el.setPointerCapture(e.pointerId);
        const move = (ev: PointerEvent) => setPanelWidth(start + x - ev.clientX);
        const up = (ev: PointerEvent) => {
          setPanelWidth(start + x - ev.clientX, true);
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", up);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
      }}
      onKeyDown={(e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        setPanelWidth(width + (e.key === "ArrowLeft" ? STEP : -STEP), true);
      }}
      onDoubleClick={() => setPanelWidth(DEFAULT_WIDTH, true)}
      className="after:bg-brand focus-visible:after:bg-brand absolute inset-y-1 -left-0.5 z-10 w-1.5 cursor-col-resize outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:opacity-0 after:transition-opacity hover:after:opacity-100 focus-visible:after:opacity-100"
    />
  );
}
