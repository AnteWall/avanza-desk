import { getSetting, saveSetting, settingKeys } from "./settings";

export type Density = "comfortable" | "compact";

const KEY = "density";

export function getDensity(): Density {
  return getSetting<Density>(KEY, "compact");
}

function apply(density: Density) {
  document.documentElement.classList.toggle("comfortable", density === "comfortable");
}

export function setDensity(density: Density) {
  apply(density);
  return saveSetting(KEY, density);
}

/**
 * Call after `loadSettings`. A first launch (nothing saved yet) starts comfortable; anyone who
 * already used the app keeps the dense layout they know until they switch.
 */
export function initDensity() {
  if (settingKeys().length === 0) void setDensity("comfortable");
  else apply(getDensity());
}

/** The workspace's panels: simple (watchlist and dossier) or trading (plus order book and pre-trade). */
export type WorkspaceLayout = "simple" | "trading";
const LAYOUT_KEY = "workspaceLayout";
/** Follows the text size until picked: comfortable starts simple, compact with the trading column. */
export const getWorkspaceLayout = () =>
  getSetting<WorkspaceLayout>(LAYOUT_KEY, getDensity() === "comfortable" ? "simple" : "trading");
export const setWorkspaceLayout = (layout: WorkspaceLayout) => saveSetting(LAYOUT_KEY, layout);
