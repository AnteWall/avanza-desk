import { getSetting, saveSetting } from "@/lib/settings";

// The assistant is opt-in per provider: until the user connects one, AvanzaDesk never looks for
// or starts its program, and with none connected it serves no tools at all. Disconnecting stops
// that provider; chats and preferences stay.

const KEY = "ai:connected";
const listeners = new Set<() => void>();

// Before providers connected separately, one switch turned on the provider in use. Computed
// once, so the snapshot stays the same array for useSyncExternalStore.
let migrated: string[] | undefined;

/** Ids of the connected providers, in the order they were connected. */
export function getConnected(): string[] {
  const saved = getSetting<string[] | null>(KEY, null);
  if (saved) return saved;
  migrated ??= getSetting("ai:enabled", false) ? [getSetting("ai:provider", "claude")] : [];
  return migrated;
}

function save(ids: string[]) {
  void saveSetting(KEY, ids);
  for (const listener of listeners) listener();
}

export const connect = (id: string) => save([...getConnected().filter((c) => c !== id), id]);

export const disconnect = (id: string) => save(getConnected().filter((c) => c !== id));

export function subscribeConnected(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
