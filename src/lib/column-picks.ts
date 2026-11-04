import { getSetting, saveSetting } from "./settings";

/** The optional columns a table can show, which of them are on, and a way to toggle one. */
export type ColumnPicks<C extends string> = {
  labels: Record<C, string>;
  get: () => C[];
  toggle: (c: C) => void;
  subscribe: (listener: () => void) => () => void;
};

/** Optional table columns, remembered under the settings `key`. `fallback` is read lazily. */
export function columnPicks<C extends string>(
  key: string,
  labels: Record<C, string>,
  fallback: () => C[],
): ColumnPicks<C> {
  const listeners = new Set<() => void>();
  // One fallback array, kept: useSyncExternalStore loops forever if a snapshot is new every read.
  let initial: C[] | undefined;
  const get = () => getSetting<C[] | null>(key, null) ?? (initial ??= fallback());
  return {
    labels,
    get,
    toggle(c) {
      const now = get();
      void saveSetting(key, now.includes(c) ? now.filter((x) => x !== c) : [...now, c]);
      for (const l of listeners) l();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
