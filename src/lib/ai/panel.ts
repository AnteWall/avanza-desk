import { getSetting, saveSetting } from "@/lib/settings";

// The assistant panel's size: a width you drag, and an expanded mode for reading long answers.
// A tiny store so the panel, its resize handle and its header button share one value.

export const MIN_WIDTH = 320;
export const DEFAULT_WIDTH = 400;
/** Room the rest of the app keeps when the panel is dragged wide or expanded. */
const KEEP = 480;

export type PanelSize = { width: number; expanded: boolean };

let size: PanelSize = { width: DEFAULT_WIDTH, expanded: false };
let loaded = false;
const listeners = new Set<() => void>();

export function getPanelSize() {
  // Settings load before the first render; read them on first use.
  if (!loaded) {
    loaded = true;
    size = {
      width: getSetting("ai:width", DEFAULT_WIDTH),
      expanded: getSetting("ai:expanded", false),
    };
  }
  return size;
}

export function subscribePanelSize(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

function set(next: PanelSize) {
  size = next;
  for (const listener of listeners) listener();
}

/** Clamped so the panel never squeezes the app below its own minimum. */
export const clampWidth = (width: number, windowWidth: number) =>
  Math.round(Math.max(MIN_WIDTH, Math.min(width, windowWidth - KEEP)));

/** While dragging; `save` once the drag ends. Dragging leaves expanded mode. */
export function setPanelWidth(width: number, save = false) {
  set({ width: clampWidth(width, window.innerWidth), expanded: false });
  if (save) {
    void saveSetting("ai:width", size.width);
    void saveSetting("ai:expanded", false);
  }
}

export function togglePanelExpanded() {
  set({ ...getPanelSize(), expanded: !getPanelSize().expanded });
  void saveSetting("ai:expanded", size.expanded);
}

/** The CSS width: the dragged width, or most of the window when expanded. */
export const panelCssWidth = ({ width, expanded }: PanelSize) =>
  expanded ? `max(${MIN_WIDTH}px, min(1100px, calc(100vw - ${KEEP}px)))` : `${width}px`;
