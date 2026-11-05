import { m } from "@/lib/i18n";

import { columnPicks } from "./column-picks";

// Which quote columns the watchlist shows besides instrument and last price. Widen the panel
// and add bid, ask, spread… to use it as a quote board.
const labels = {
  change: "+/- %",
  changeAbs: m.workspace.watchlist.columns.changeAbs,
  bid: m.workspace.watchlist.columns.bid,
  ask: m.workspace.watchlist.columns.ask,
  spread: m.workspace.watchlist.columns.spread,
  high: m.common.high,
  low: m.common.low,
  close: m.workspace.watchlist.columns.prevClose,
  volume: m.common.volume,
  turnover: m.common.turnover,
};

export const watchlistColumns = columnPicks<keyof typeof labels>(
  "watchlist-columns",
  labels,
  () => ["change", "volume"],
);
