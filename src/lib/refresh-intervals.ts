import { getSetting, saveSetting } from "./settings";

// Polling intervals in ms for data Avanza doesn't push (quotes, depth and orders stream in).
export const refreshIntervalDefaults = {
  positions: 60_000,
  alerts: 60_000,
  news: 60_000,
  market: 60_000,
  indices: 30_000,
  /** How often the live quotes file is rewritten (Settings › Data › Spreadsheets). */
  quotesFile: 30_000,
};

export type RefreshIntervals = typeof refreshIntervalDefaults;

const KEY = "refresh-intervals";

export function getRefreshIntervals(): RefreshIntervals {
  return { ...refreshIntervalDefaults, ...getSetting<Partial<RefreshIntervals>>(KEY, {}) };
}

export function setRefreshIntervals(intervals: RefreshIntervals) {
  return saveSetting(KEY, intervals);
}

/** For `refetchInterval`: TanStack re-evaluates it after every fetch, so changes apply live. */
export const refreshEvery = (key: keyof RefreshIntervals) => () => getRefreshIntervals()[key];
