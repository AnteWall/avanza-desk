import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { toast } from "sonner";

import { m } from "@/lib/i18n";

// Settings live in the app's SQLite database (src-tauri/src/db.rs). They are loaded once before
// the first render, then read synchronously from memory and written through on change.
const cache = new Map<string, unknown>();

// Every window has its own cache (a pop-out is its own page), so a save is broadcast and the
// other windows take the value; otherwise one window would write back a stale copy.
const EVENT = "setting-changed";
const remote = new Map<string, Set<() => void>>();
// Tells this window's own broadcasts apart: an echo arriving late must not undo a newer save.
const self = crypto.randomUUID();

export async function loadSettings() {
  const rows = await invoke<[string, string][]>("settings_load");
  for (const [key, value] of rows) cache.set(key, JSON.parse(value));
  await listen<{ key: string; value: unknown; from: string }>(EVENT, ({ payload }) => {
    if (payload.from === self) return;
    cache.set(payload.key, payload.value);
    for (const l of remote.get(payload.key) ?? []) l();
  });
}

/** Calls `listener` when another window saves `key`. */
export function onRemoteSetting(key: string, listener: () => void) {
  const set = remote.get(key) ?? new Set();
  remote.set(key, set.add(listener));
  return () => void set.delete(listener);
}

export function getSetting<T>(key: string, fallback: T): T {
  return cache.has(key) ? (cache.get(key) as T) : fallback;
}

export const settingKeys = () => [...cache.keys()];

/** Most callers don't wait, so a failed write is announced here: memory and disk now differ. */
export function saveSetting(key: string, value: unknown) {
  cache.set(key, value);
  // Best effort (and absent in tests): the save below is what counts.
  emit(EVENT, { key, value, from: self }).catch(() => undefined);
  return invoke("setting_save", { key, value: JSON.stringify(value) }).catch((error) => {
    toast.error(m.settings.saveFailed.title, {
      id: "setting-save",
      description: m.settings.saveFailed.description(String(error)),
    });
    throw error;
  });
}
