import { useSyncExternalStore } from "react";

import type { ColumnPicks } from "@/lib/column-picks";

/** The optional columns currently on; re-renders when one is toggled. */
export const useColumnPicks = <C extends string>(picks: ColumnPicks<C>): readonly string[] =>
  useSyncExternalStore(picks.subscribe, picks.get);
