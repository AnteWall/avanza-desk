import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

// Settings live in the app's SQLite database (src-tauri/src/db.rs). They are loaded once before
// the first render, then read synchronously from memory and written through on change.
const cache = new Map<string, unknown>();

export async function loadSettings() {
  const rows = await invoke<[string, string][]>("settings_load");
  for (const [key, value] of rows) cache.set(key, JSON.parse(value));
}

export function getSetting<T>(key: string, fallback: T): T {
  return cache.has(key) ? (cache.get(key) as T) : fallback;
}

export const settingKeys = () => [...cache.keys()];

/** Most callers don't wait, so a failed write is announced here: memory and disk now differ. */
export function saveSetting(key: string, value: unknown) {
  cache.set(key, value);
  return invoke("setting_save", { key, value: JSON.stringify(value) }).catch((error) => {
    toast.error("Couldn't save settings", {
      id: "setting-save",
      description: `Changes may be lost on restart. ${String(error)}`,
    });
    throw error;
  });
}
