import { getCurrentWindow } from "@tauri-apps/api/window";

import { getSetting, saveSetting } from "./settings";

// "In-app" frame: the OS title bar is off (tauri.conf.json `decorations: false`, so the default
// starts without a flash) and the top bar carries drag, minimize, maximize and close.
// Off: the OS draws its usual title bar.
const KEY = "in-app-window-controls";
const listeners = new Set<() => void>();

export const getInAppFrame = () => getSetting(KEY, true);

export function setInAppFrame(on: boolean) {
  void getCurrentWindow().setDecorations(!on);
  for (const l of listeners) l();
  return saveSetting(KEY, on);
}

export function subscribeInAppFrame(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Call after `loadSettings`. */
export const initWindowFrame = () => {
  if (!getInAppFrame()) void getCurrentWindow().setDecorations(true);
};
