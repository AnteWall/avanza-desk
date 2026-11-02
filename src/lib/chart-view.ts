import { getSetting, saveSetting } from "./settings";

// How the price chart is drawn: line or candles, which overlays, and an optional lower pane.
// One setting for every instrument, so a trader's setup follows them around.

export type Overlay = "sma20" | "sma50" | "ema20" | "vwap";
export type LowerPane = "none" | "rsi" | "macd";
export type ChartView = { style: "line" | "candles"; overlays: Overlay[]; lower: LowerPane };

export const overlayLabels: Record<Overlay, string> = {
  sma20: "SMA 20",
  sma50: "SMA 50",
  ema20: "EMA 20",
  vwap: "VWAP",
};

const KEY = "chart-view";
const fallback: ChartView = { style: "line", overlays: [], lower: "none" };
const listeners = new Set<() => void>();

export const getChartView = () => getSetting<ChartView>(KEY, fallback);

export function setChartView(patch: Partial<ChartView>) {
  void saveSetting(KEY, { ...getChartView(), ...patch });
  for (const l of listeners) l();
}

export function subscribeChartView(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
