import { getCurrentWindow } from "@tauri-apps/api/window";

type ResizeDirection = Parameters<ReturnType<typeof getCurrentWindow>["startResizeDragging"]>[0];

// Without the OS frame some window managers give no resize border; these thin strips do.
const edges: { dir: ResizeDirection; className: string }[] = [
  { dir: "North", className: "inset-x-2 top-0 h-1 cursor-n-resize" },
  { dir: "South", className: "inset-x-2 bottom-0 h-1 cursor-s-resize" },
  { dir: "West", className: "inset-y-2 left-0 w-1 cursor-w-resize" },
  { dir: "East", className: "inset-y-2 right-0 w-1 cursor-e-resize" },
  { dir: "NorthWest", className: "top-0 left-0 size-2 cursor-nw-resize" },
  { dir: "NorthEast", className: "top-0 right-0 size-2 cursor-ne-resize" },
  { dir: "SouthWest", className: "bottom-0 left-0 size-2 cursor-sw-resize" },
  { dir: "SouthEast", className: "right-0 bottom-0 size-2 cursor-se-resize" },
];

/** Invisible drag handles on the window's edges and corners. */
export function ResizeEdges() {
  return edges.map((e) => (
    <div
      key={e.dir}
      aria-hidden
      className={`fixed z-[60] ${e.className}`}
      onMouseDown={(ev) => {
        if (ev.button === 0) void getCurrentWindow().startResizeDragging(e.dir);
      }}
    />
  ));
}
