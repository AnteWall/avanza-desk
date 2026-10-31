import { getSetting, saveSetting } from "./settings";

// The open tab of each TabbedPanel, remembered across restarts and settable from anywhere, so a
// link elsewhere ("All rules", "Set targets") can land on the right tab of another page.

const listeners = new Set<() => void>();

export const getTab = (id: string) => getSetting<string | null>(`tab:${id}`, null);

export function setTab(id: string, value: string) {
  void saveSetting(`tab:${id}`, value);
  for (const l of listeners) l();
}

export function subscribeTabs(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
