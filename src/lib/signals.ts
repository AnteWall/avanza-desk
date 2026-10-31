import type {
  CompanyEvent,
  InsiderTradesResponse,
  NumberOfOwnersResponse,
  ShortSellingResponse,
} from "avanza-ts";

import { formatCompact, formatPercent, formatPrice, formatShare } from "@/lib/format";
import type { SnapshotPoint } from "@/lib/snapshots";

export type SignalKind = "insider" | "short" | "owners" | "target" | "consensus" | "report";

/** One notable move in a stock. `date` is yyyy-MM-dd; `score` ranks strength (1 = threshold). */
export type Signal = {
  orderbookId: string;
  kind: SignalKind;
  date: string;
  text: string;
  tone: "up" | "down" | "neutral";
  score: number;
};

/** What a stock's signals are derived from: fundamentals parts plus snapshot history. */
export type SignalSources = {
  insiders?: InsiderTradesResponse | null;
  shorts?: ShortSellingResponse | null;
  owners?: NumberOfOwnersResponse | null;
  events?: readonly CompanyEvent[] | null;
  target?: readonly SnapshotPoint[];
  consensus?: readonly SnapshotPoint[];
};

const DAY = 24 * 60 * 60_000;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);
const score = (ratioToThreshold: number) => Math.min(5, Math.abs(ratioToThreshold));

/** The last point at or before `t`, or undefined when history doesn't reach back that far. */
function before<T>(points: readonly T[], time: (p: T) => number, t: number) {
  for (let i = points.length - 1; i >= 0; i--) if (time(points[i]!) <= t) return points[i];
}

/**
 * Latest short interest as a ratio. Avanza's unit is unknown, so a series with any value above
 * 1 is taken as percent units (as the short signal below does).
 */
export function latestShort(history: ShortSellingResponse["shortSellingHistory"]) {
  const last = history.at(-1);
  return last && last.ratio / (history.some((p) => p.ratio > 1) ? 100 : 1);
}

/** Every signal for one stock at `now` (ms). */
export function deriveSignals(orderbookId: string, s: SignalSources, now: number): Signal[] {
  const out: Signal[] = [];
  const add = (kind: SignalKind, date: string, text: string, tone: Signal["tone"], ratio: number) =>
    out.push({ orderbookId, kind, date, text, tone, score: score(ratio) });

  // Insiders: market trades only (equity programs are compensation, not conviction), netted.
  const since = isoDay(now - 30 * DAY);
  const trades = (s.insiders?.transactions ?? []).filter(
    (t) => t.marketTransaction && !t.equityProgram && t.transactionDate >= since,
  );
  const currency = trades[0]?.currency;
  const net = trades
    .filter((t) => t.currency === currency)
    .reduce((sum, t) => sum + t.totalValue, 0);
  if (net !== 0) {
    const buys = trades.filter((t) => t.totalValue > 0).length;
    const latest = trades.reduce((d, t) => (t.transactionDate > d ? t.transactionDate : d), "");
    add(
      "insider",
      latest,
      `Insiders net ${net > 0 ? "bought" : "sold"} ${formatCompact(Math.abs(net))} ${currency} in 30 days (${buys} buys, ${trades.length - buys} sells)`,
      net > 0 ? "up" : "down",
      Math.log10(Math.abs(net)) - 5, // 1 at 1 mn, 2 at 10 mn
    );
  }

  // Short interest: unit unknown, so a series with any value above 1 is taken as percent units.
  const shorts = s.shorts?.shortSellingHistory ?? [];
  const last = shorts.at(-1);
  const earlier = last && before(shorts, (p) => p.timestamp, last.timestamp - 14 * DAY);
  if (last && earlier) {
    const toPp = shorts.some((p) => p.ratio > 1) ? 1 : 100;
    const delta = (last.ratio - earlier.ratio) * toPp;
    if (Math.abs(delta) >= 0.5)
      add(
        "short",
        isoDay(last.timestamp),
        `Short interest ${delta > 0 ? "up" : "down"} ${formatPrice(Math.abs(delta))} pp to ${formatShare((last.ratio * toPp) / 100)} in 2 weeks`,
        delta > 0 ? "down" : "up",
        delta / 0.5,
      );
  }

  const owners = s.owners?.ownersPoints ?? [];
  const nowOwners = owners.at(-1);
  const weekAgo = nowOwners && before(owners, (p) => p.timestamp, nowOwners.timestamp - 7 * DAY);
  if (nowOwners && weekAgo?.numberOfOwners) {
    const change = nowOwners.numberOfOwners / weekAgo.numberOfOwners - 1;
    if (Math.abs(change) >= 0.03)
      add(
        "owners",
        isoDay(nowOwners.timestamp),
        `Avanza owners ${formatPercent(change)} in a week`,
        change > 0 ? "up" : "down",
        change / 0.03,
      );
  }

  // Snapshots: the oldest point in the last 30 days against the newest.
  const window = (points?: readonly SnapshotPoint[]) => {
    const recent = (points ?? []).filter((p) => p.day >= since);
    return recent.length > 1 ? [recent[0]!, recent.at(-1)!] : undefined;
  };
  const target = window(s.target);
  if (target && target[0].value > 0) {
    const change = target[1].value / target[0].value - 1;
    if (Math.abs(change) >= 0.03)
      add(
        "target",
        target[1].day,
        `Average price target ${change > 0 ? "raised" : "cut"} ${formatPercent(change)} to ${formatPrice(target[1].value)}`,
        change > 0 ? "up" : "down",
        change / 0.03,
      );
  }
  const consensus = window(s.consensus);
  if (consensus) {
    const delta = consensus[1].value - consensus[0].value;
    if (Math.abs(delta) >= 0.1)
      add(
        "consensus",
        consensus[1].day,
        `Analysts rating it buy went from ${formatShare(consensus[0].value)} to ${formatShare(consensus[1].value)}`,
        delta > 0 ? "up" : "down",
        delta / 0.1,
      );
  }

  for (const e of s.events ?? [])
    if (/report/i.test(e.eventType) && e.timestamp >= now && e.timestamp <= now + 7 * DAY) {
      const days = Math.round((e.timestamp - now) / DAY);
      add(
        "report",
        isoDay(e.timestamp),
        `Reports ${days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}`,
        "neutral",
        1,
      );
    }
  return out;
}

/** Newest first, the stronger one first on the same day. */
export const bySignalRank = (a: Signal, b: Signal) =>
  b.date.localeCompare(a.date) || b.score - a.score;
