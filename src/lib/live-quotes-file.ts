import type { WatchlistRow } from "avanza-ts";

import { m } from "@/lib/i18n";

import { formatDecimal } from "./format";
import { getSetting, saveSetting } from "./settings";

// A CSV of your watchlists' quotes that AvanzaDesk keeps rewriting while it runs, so a
// spreadsheet can refresh from it (Excel: Data › From Text/CSV, then refresh every minute).

const KEY = "live-quotes-file";
const listeners = new Set<() => void>();

export const getLiveQuotesPath = () => getSetting<string | null>(KEY, null);

export function setLiveQuotesPath(path: string | null) {
  void saveSetting(KEY, path);
  for (const l of listeners) l();
}

export function subscribeLiveQuotesPath(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

const n = (v: number | null | undefined) => (v == null ? "" : formatDecimal(v));

/** One row per instrument (first watchlist wins), plain numbers with a decimal comma. */
export function quoteRows(rows: readonly WatchlistRow[]): string[][] {
  const seen = new Set<string>();
  const c = m.layout.liveQuotes.columns;
  const out = [
    [
      c.id,
      m.common.name,
      m.common.last,
      c.change,
      c.bid,
      c.ask,
      m.common.high,
      m.common.low,
      m.common.volume,
      m.common.turnover,
      c.updated,
    ],
  ];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    const q = r.quote;
    out.push([
      r.id,
      r.name,
      n(q.lastPrice),
      n(q.changePercent),
      n(q.buyPrice),
      n(q.sellPrice),
      n(q.highestPrice),
      n(q.lowestPrice),
      n(q.totalVolumeTraded),
      n(q.totalValueTraded),
      new Date().toISOString(),
    ]);
  }
  return out;
}
