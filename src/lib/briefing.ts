import type { PositionListResponse, Transaction } from "avanza-ts";

import { TransactionSide, TransactionType } from "@/lib/avanza/codes";
import type { AlertRow } from "@/lib/avanza/loose-records";
import { aggregateHoldings, dailyPerformance } from "@/lib/avanza/portfolio";
import { formatDate } from "@/lib/format";
import type { CalendarEvent } from "@/lib/news";

/** What the portfolio looked like at a moment. Prices are SEK per unit. */
export type LastVisit = { at: string; total: number; prices: Record<string, number> };

/** Settings keys: the latest look (kept current while signed in), and the one the page compares with. */
export const LATEST_KEY = "briefing:lastVisit";
export const SINCE_KEY = "briefing:since";

const HOUR = 3_600_000;
/** Back after this long, even without signing in again, and a new visit starts. */
const AWAY = 12 * HOUR;

let signedIn = false;
/** Called on a BankID sign-in: the next session start begins a new visit. */
export const markSignedIn = () => void (signedIn = true);

/**
 * Whether this session start begins a new visit: a fresh sign-in (often after Avanza logged you
 * out) or 12 hours since the app last saw the portfolio. Consumes the sign-in mark.
 */
export function startsVisit(latest: LastVisit | null, now: number) {
  const fresh = signedIn;
  signedIn = false;
  return !!latest && (fresh || now - Date.parse(latest.at) >= AWAY);
}

/** Holdings plus cash, all accounts. */
const totalValue = (positions: PositionListResponse) => {
  const { cash } = dailyPerformance(positions);
  return aggregateHoldings(positions).reduce((sum, h) => sum + h.value, cash);
};

export function lastVisitOf(positions: PositionListResponse, now: number): LastVisit {
  const prices: Record<string, number> = {};
  for (const h of aggregateHoldings(positions)) if (h.volume) prices[h.key] = h.value / h.volume;
  return { at: new Date(now).toISOString(), total: totalValue(positions), prices };
}

export type Mover = {
  key: string;
  orderbookId?: string;
  type: string;
  name: string;
  isin?: string;
  ratio: number;
};

/** One thing that happened while you were away, for the timeline. */
export type Activity = {
  key: string;
  /** `yyyy-MM-dd`. */
  date: string;
  kind: "buy" | "sell" | "dividend" | "alert";
  name: string;
  orderbookId?: string;
  type?: string;
  /** SEK, signed: what a trade cost or brought in, or the dividend received. */
  amount?: number;
  /** An alert's trigger level. */
  level?: number;
};

export type Briefing = {
  since: string;
  total: number;
  /** Change in value minus money deposited (withdrawals count back). Dividends are return. */
  result: number;
  ratio: number;
  deposits: number;
  movers: Mover[];
  upcoming: CalendarEvent[];
  /** Trades, dividends and triggered alerts, newest first. */
  activity: Activity[];
  /** ISIN per held orderbook, for logos. */
  isins: Record<string, string>;
};

const amount = (t: Transaction) => t.amount?.value ?? 0;

/**
 * What changed since `last`: value and result, the holdings that moved most, trades, dividends
 * and deposits since then, alerts that triggered, and reports and ex-dates of holdings in the
 * next two weeks. `transactions` are those from `last.at`'s day on.
 */
export function buildBriefing(input: {
  last: LastVisit;
  positions: PositionListResponse;
  transactions: readonly Transaction[];
  triggered: readonly AlertRow[];
  calendar: readonly CalendarEvent[];
  today: string;
}): Briefing {
  const { last, positions, transactions, today } = input;
  const since = Date.parse(last.at);
  // ponytail: transactions carry a date, not a time, so ones earlier on the last visit's day are
  // counted too; filter on a timestamp if Avanza ever gives one.
  const live = transactions.filter((t) => !t.cancelled);
  const deposits = live.reduce(
    (sum, t) =>
      t.type === TransactionType.Deposit
        ? sum + Math.abs(amount(t))
        : t.type === TransactionType.Withdraw
          ? sum - Math.abs(amount(t))
          : sum,
    0,
  );
  const total = totalValue(positions);
  const result = total - last.total - deposits;

  const holdings = aggregateHoldings(positions);
  const movers = holdings
    .filter((h) => h.volume && last.prices[h.key])
    .map((h) => ({
      key: h.key,
      orderbookId: h.orderbookId,
      type: h.type,
      name: h.name,
      isin: h.isin,
      ratio: h.value / h.volume / last.prices[h.key]! - 1,
    }))
    .filter((m) => Math.abs(m.ratio) >= 0.005)
    .sort((a, b) => Math.abs(b.ratio) - Math.abs(a.ratio))
    .slice(0, 10);

  const held = new Set(holdings.map((h) => h.orderbookId));
  const horizon = new Date(Date.parse(today) + 14 * 24 * HOUR).toISOString().slice(0, 10);

  const trades = live.filter(
    (t) => t.type === TransactionSide.Buy || t.type === TransactionSide.Sell,
  );
  const dividends = live.filter((t) => t.type === TransactionType.Dividend);
  const alerts = input.triggered.filter((a) => a.triggered && Date.parse(a.triggered) > since);
  const fromTransaction = (t: Transaction, kind: Activity["kind"]): Activity => ({
    key: t.id,
    date: t.date.slice(0, 10),
    kind,
    name: t.orderbook?.name ?? t.instrumentName ?? t.description,
    orderbookId: t.orderbook?.id,
    type: t.orderbook?.type,
    amount: t.amount?.value,
  });
  const activity: Activity[] = [
    ...trades.map((t) => fromTransaction(t, t.type === TransactionSide.Sell ? "sell" : "buy")),
    ...dividends.map((t) => fromTransaction(t, "dividend")),
    ...alerts.map((a) => ({
      key: `alert-${a.id}`,
      date: formatDate(a.triggered!),
      kind: "alert" as const,
      name: a.name,
      orderbookId: a.orderbookId,
      type: a.type,
      level: a.value,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const isins: Record<string, string> = {};
  for (const h of holdings) if (h.orderbookId && h.isin) isins[h.orderbookId] = h.isin;

  return {
    since: last.at,
    total,
    result,
    ratio: last.total > 0 ? result / last.total : 0,
    deposits,
    movers,
    activity,
    isins,
    upcoming: input.calendar
      .filter((e) => held.has(e.orderbookId) && e.date >= today && e.date <= horizon)
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

const dayFormat = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options });
const weekdayShort = dayFormat({ weekday: "short" });
const monthShort = dayFormat({ month: "short" });
const visit = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "Europe/Stockholm",
});

/** A `yyyy-MM-dd` date split for a date tile: 2, "Mon", "Nov". */
export const dayParts = (date: string) => ({
  day: Number(date.slice(8, 10)),
  weekday: weekdayShort.format(new Date(date)),
  month: monthShort.format(new Date(date)),
});

/** When a visit was, as a reader says it: "Thu 23 Oct". */
export const visitDay = (at: string) => visit.format(new Date(at));
