import { getSetting, saveSetting } from "./settings";

// Which quote columns the watchlist shows besides instrument and last price. Widen the panel
// and add bid, ask, spread… to use it as a quote board.

export const watchlistColumnLabels = {
  change: "+/- %",
  changeAbs: "Change",
  bid: "Bid",
  ask: "Ask",
  spread: "Spread",
  high: "High",
  low: "Low",
  close: "Prev close",
  volume: "Volume",
  turnover: "Turnover",
} as const;
export type WatchlistColumn = keyof typeof watchlistColumnLabels;

const KEY = "watchlist-columns";
const fallback: WatchlistColumn[] = ["change", "volume"];
const listeners = new Set<() => void>();

export const getWatchlistColumns = () => getSetting<WatchlistColumn[]>(KEY, fallback);

export function toggleWatchlistColumn(c: WatchlistColumn) {
  const now = getWatchlistColumns();
  void saveSetting(KEY, now.includes(c) ? now.filter((x) => x !== c) : [...now, c]);
  for (const l of listeners) l();
}

export function subscribeWatchlistColumns(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
