import { columnPicks } from "./column-picks";

// Which quote columns the watchlist shows besides instrument and last price. Widen the panel
// and add bid, ask, spread… to use it as a quote board.
const labels = {
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
};

export const watchlistColumns = columnPicks<keyof typeof labels>(
  "watchlist-columns",
  labels,
  () => ["change", "volume"],
);
