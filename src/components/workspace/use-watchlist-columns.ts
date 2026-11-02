import { useSyncExternalStore } from "react";

import { getWatchlistColumns, subscribeWatchlistColumns } from "@/lib/watchlist-columns";

export const useWatchlistColumns = (): readonly string[] =>
  useSyncExternalStore(subscribeWatchlistColumns, getWatchlistColumns);
