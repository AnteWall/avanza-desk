import type { Transaction } from "avanza-ts";

import { TransactionSide } from "@/lib/avanza/codes";
import { formatCompact, formatDate, formatInteger, formatPercent, formatPrice } from "@/lib/format";
import { m } from "@/lib/i18n";

const t = m.analysis.profile;

// Fewer samples than this and a "pattern" is mostly luck.
const MIN_SAMPLE = 8;
const ROUND_TRIP_DAYS = 30;
const BUSY_WEEK_TRADES = 5;
const BUSY_WEEKS = 2;
const HOLD_RATIO = 1.5;
const EXIT_SPREAD = 0.15;
const ROUND_TRIPS = 3;
/** How far back the profile reads trades. */
export const PROFILE_YEARS = 5;

type Trade = {
  id: string;
  name: string;
  orderbookId?: string;
  type?: string;
  isin?: string;
  flagCode?: string;
  account: string;
  key: string;
  side: TransactionSide;
  day: string;
  volume: number;
  /** SEK per share after fees: what the trade really cost or paid. */
  perShare: number;
  fee: number;
};

type Lot = {
  id: string;
  of: Trade;
  buyDay: string;
  sellDay: string;
  volume: number;
  buy: number;
  sell: number;
};

/** One trade behind a finding: a closed lot, or a sell and its buy-back. */
export type Evidence = {
  id: string;
  name: string;
  orderbookId?: string;
  type?: string;
  isin?: string;
  flagCode?: string;
  from: string;
  to: string;
  days: number;
  /** Price per share from `from` to `to`, fees included. */
  change: number;
  /** SEK it made (+) or cost (−) you. */
  result: number;
};

/** A number a check measured, shaped like a `Stat` so the view can list it as is. */
export type Measure = { label: string; value: string; note?: string; sensitive?: boolean };

export type Status = "found" | "clear" | "too-few";
export const statusLabel: Record<Status, string> = t.status;

export type Tone = "change" | "watch" | "keep";
export const toneLabel: Record<Tone, string> = t.tone;
/** What to do about a check's verdict. Amounts stay out of the text so privacy mode hides them. */
export type Advice = { tone: Tone; text: string };

/** The one number that sums up a check, comparable between periods of different length. */
export type Metric = {
  label: string;
  /** Null when the period has too few trades to say. */
  value: number | null;
  text: string;
  better: "lower" | "higher";
  /** Smaller moves than this count as steady. */
  step: number;
  /** Where the check flags, in the same units as `value`. */
  cutoffs: number[];
  /** The cutoffs in words: "3 a year". */
  cutoffText: string;
};

/** A check's verdict over one calendar year. */
export type Period = {
  label: string;
  status: Status;
  tone?: Tone;
  metric: string;
  value: number | null;
  sample: number;
};

export type Direction = "better" | "worse" | "steady";
export const directionLabel: Record<Direction, string> = t.direction;

/** The last 12 months against everything before. */
export type Trend = {
  direction: Direction;
  recent: string;
  before: string;
  recentTone?: Tone;
  beforeTone?: Tone;
};

export type Finding = {
  id: string;
  status: Status;
  title: string;
  detail: string;
  /** How the check decides, in one sentence. */
  rule: string;
  /** What it measured, with the cutoffs in the notes. */
  measures: Measure[];
  /** How many closed lots or trades the finding rests on. */
  sample: number;
  /** SEK the habit made (+) or cost (−) you, when found and it can be priced. */
  impact?: number;
  /** The trades behind it, worst result first. */
  evidence: Evidence[];
  /** None when there are too few trades to judge. */
  advice?: Advice;
  metric: Metric;
  /** Calendar years, newest first. */
  history: Period[];
  /** Undefined when either side has too few trades. */
  trend?: Trend;
};

type Check = Omit<Finding, "history" | "trend">;

/** The trades and closed lots (by sell day) of one period, and how many years it spans. */
type Window = { trades: Trade[]; lots: Lot[]; years: number };

export type TradingProfile = {
  trades: number;
  closed: number;
  winRate: number | null;
  realized: number;
  findings: Finding[];
};

const DAY = 86_400_000;
const daysBetween = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY);
const lotReturn = (l: Lot) => l.sell / l.buy - 1;

const instrument = ({ name, orderbookId, type, isin, flagCode }: Trade) => ({
  name,
  orderbookId,
  type,
  isin,
  flagCode,
});
const held = (lots: readonly Lot[]) => lots.map((l) => daysBetween(l.buyDay, l.sellDay));
const days = (n: number) => t.dayCount(n, formatInteger(n));
const worstFirst = (rows: Evidence[]) => rows.sort((a, b) => a.result - b.result);
const lotEvidence = (lots: readonly Lot[]) =>
  worstFirst(
    lots.map((l) => ({
      id: l.id,
      ...instrument(l.of),
      from: l.buyDay,
      to: l.sellDay,
      days: daysBetween(l.buyDay, l.sellDay),
      change: lotReturn(l),
      result: (l.sell - l.buy) * l.volume,
    })),
  );

function quantile(sorted: readonly number[], q: number) {
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  return sorted[lo]! + (sorted[Math.ceil(i)]! - sorted[lo]!) * (i - lo);
}
const median = (xs: readonly number[]) =>
  quantile(
    [...xs].sort((a, b) => a - b),
    0.5,
  );

/** Monday of the day's week, so trades group by calendar week. */
function weekOf(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

function toTrades(transactions: readonly Transaction[]): Trade[] {
  const trades: Trade[] = [];
  for (const t of transactions) {
    const volume = Math.abs(t.volume?.value ?? 0);
    const amount = Math.abs(t.amount?.value ?? 0);
    const key = t.isin ?? t.orderbook?.id;
    if (
      t.cancelled ||
      (t.type !== TransactionSide.Buy && t.type !== TransactionSide.Sell) ||
      !key ||
      !volume ||
      !amount
    )
      continue;
    trades.push({
      id: t.id,
      name: t.orderbook?.name ?? t.instrumentName ?? t.description,
      orderbookId: t.orderbook?.id,
      type: t.orderbook?.type,
      isin: t.isin ?? undefined,
      flagCode: t.orderbook?.flagCode ?? undefined,
      account: t.account.id,
      key,
      side: t.type,
      day: formatDate(t.tradeDate ?? t.date),
      volume,
      perShare: amount / volume,
      fee: Math.abs(t.commission?.value ?? 0),
    });
  }
  // Oldest first; buys before sells on the same day so an intraday flip can match.
  return trades.sort((a, b) => a.day.localeCompare(b.day) || a.side.localeCompare(b.side));
}

// shortcut: FIFO per account and ignores splits; Avanza reports average cost, so single lots can
// differ from what it shows. Sells without an earlier buy in range (transfers, older history) are
// skipped. Upgrade to volumeFactor-aware matching if split-heavy users report odd numbers.
function closedLots(trades: readonly Trade[]): Lot[] {
  const open = new Map<string, { day: string; volume: number; perShare: number }[]>();
  const lots: Lot[] = [];
  for (const t of trades) {
    const id = `${t.account}|${t.key}`;
    const queue = open.get(id) ?? [];
    open.set(id, queue);
    if (t.side === TransactionSide.Buy) {
      queue.push({ day: t.day, volume: t.volume, perShare: t.perShare });
      continue;
    }
    let left = t.volume;
    while (left > 0 && queue.length) {
      const head = queue[0]!;
      const volume = Math.min(left, head.volume);
      lots.push({
        id: `${t.id}:${lots.length}`,
        of: t,
        buyDay: head.day,
        sellDay: t.day,
        volume,
        buy: head.perShare,
        sell: t.perShare,
      });
      left -= volume;
      head.volume -= volume;
      if (head.volume === 0) queue.shift();
    }
  }
  return lots;
}

function holdingAsymmetry({ lots }: Window): Check {
  const winners = lots.filter((l) => lotReturn(l) > 0);
  const losers = lots.filter((l) => lotReturn(l) < 0);
  const win = winners.length ? median(held(winners)) : 0;
  const lose = losers.length ? median(held(losers)) : 0;
  // At least a day each, so same-day sells don't divide by zero or tie at 0 = 0 × 1,5.
  const ratio = Math.max(lose, 1) / Math.max(win, 1);
  const h = t.holding;
  const cutoffs = [formatPrice(HOLD_RATIO), formatPrice(1 / HOLD_RATIO)] as const;
  const base = {
    id: "holding",
    rule: h.rule(formatPrice(HOLD_RATIO), MIN_SAMPLE / 2),
    measures: [
      {
        label: h.winners,
        value: formatInteger(winners.length),
        note: h.medianHeld(days(win)),
      },
      {
        label: h.losers,
        value: formatInteger(losers.length),
        note: h.medianHeld(days(lose)),
      },
      {
        label: h.ratio,
        value: `${formatPrice(ratio)}×`,
        note: h.flaggedFrom(...cutoffs),
      },
    ],
    sample: winners.length + losers.length,
    evidence: lotEvidence([...winners, ...losers]),
    metric: {
      label: h.ratio,
      value: winners.length < MIN_SAMPLE / 2 || losers.length < MIN_SAMPLE / 2 ? null : ratio,
      text: `${formatPrice(ratio)}×`,
      better: "lower" as const,
      step: 0.5,
      cutoffs: [HOLD_RATIO, 1 / HOLD_RATIO],
      cutoffText: h.cutoff(...cutoffs),
    },
  };
  const loss = losers.length ? median(losers.map(lotReturn)) : 0;
  const said = h.said(days(win), days(lose));
  if (winners.length < MIN_SAMPLE / 2 || losers.length < MIN_SAMPLE / 2)
    return {
      ...base,
      status: "too-few",
      title: h.tooFewTitle,
      detail: h.tooFewDetail(MIN_SAMPLE / 2, winners.length, losers.length),
    };
  if (ratio >= HOLD_RATIO)
    return {
      ...base,
      status: "found",
      title: h.longerTitle,
      detail: h.longerDetail(said),
      advice: {
        tone: "change",
        text: h.longerAdvice(formatPercent(loss), days(lose)),
      },
    };
  if (ratio <= 1 / HOLD_RATIO)
    return {
      ...base,
      status: "found",
      title: h.runTitle,
      detail: h.runDetail(said),
      advice: {
        tone: "keep",
        text: h.runAdvice,
      },
    };
  return {
    ...base,
    status: "clear",
    title: h.evenTitle,
    detail: h.evenDetail(said, formatPrice(HOLD_RATIO)),
    advice: {
      tone: "keep",
      text: h.evenAdvice,
    },
  };
}

function profitTaking({ lots }: Window): Check {
  const winners = lots.filter((l) => lotReturn(l) > 0);
  const gains = winners.map(lotReturn).sort((a, b) => a - b);
  const q1 = gains.length ? quantile(gains, 0.25) : 0;
  const q3 = gains.length ? quantile(gains, 0.75) : 0;
  const p = t.profitTaking;
  const pp = formatInteger((q3 - q1) * 100);
  const cutoff = formatInteger(EXIT_SPREAD * 100);
  const spread = p.spread(pp);
  const base = {
    id: "profit-taking",
    rule: p.rule(cutoff, MIN_SAMPLE),
    measures: gains.length
      ? [
          {
            label: p.winningSells,
            value: formatInteger(gains.length),
            note: p.needs(MIN_SAMPLE),
          },
          { label: p.medianGain, value: formatPercent(quantile(gains, 0.5)) },
          { label: p.middleHalf, value: p.range(formatPercent(q1), formatPercent(q3)) },
          { label: p.spreadLabel, value: p.pp(pp), note: p.flaggedAt(cutoff) },
        ]
      : [{ label: p.winningSells, value: "0", note: p.needs(MIN_SAMPLE) }],
    sample: gains.length,
    evidence: lotEvidence(winners),
    metric: {
      label: p.metric,
      // Percentage points, so the value reads like its text.
      value: gains.length < MIN_SAMPLE ? null : (q3 - q1) * 100,
      text: p.pp(pp),
      better: "higher" as const,
      step: 10,
      cutoffs: [EXIT_SPREAD * 100],
      cutoffText: p.cutoff(cutoff),
    },
  };
  if (gains.length < MIN_SAMPLE)
    return {
      ...base,
      status: "too-few",
      title: p.tooFewTitle,
      detail: p.tooFewDetail(MIN_SAMPLE, gains.length),
    };
  if (q3 - q1 <= EXIT_SPREAD)
    return {
      ...base,
      status: "found",
      title: p.foundTitle(formatPercent(quantile(gains, 0.5))),
      detail: p.foundDetail(formatPercent(q1), formatPercent(q3), spread),
      advice: {
        tone: "watch",
        text: p.foundAdvice(formatPercent(quantile(gains, 0.5))),
      },
    };
  return {
    ...base,
    status: "clear",
    title: p.clearTitle,
    detail: p.clearDetail(spread),
    advice: {
      tone: "keep",
      text: p.clearAdvice,
    },
  };
}

function roundTrips({ trades, years }: Window): Check {
  const buys = trades
    .filter((t) => t.side === TransactionSide.Buy)
    .map((t) => ({ ...t, left: t.volume }));
  const evidence: Evidence[] = [];
  for (const sell of trades) {
    if (sell.side !== TransactionSide.Sell) continue;
    // A later day only: a same-day buy is the position being sold, not a buy-back.
    const back = buys.find(
      (b) =>
        b.key === sell.key &&
        b.left > 0 &&
        b.day > sell.day &&
        daysBetween(sell.day, b.day) <= ROUND_TRIP_DAYS,
    );
    if (!back) continue;
    const volume = Math.min(sell.volume, back.left);
    back.left -= volume;
    evidence.push({
      id: `${sell.id}>${back.id}`,
      ...instrument(sell),
      from: sell.day,
      to: back.day,
      days: daysBetween(sell.day, back.day),
      change: back.perShare / sell.perShare - 1,
      result: (sell.perShare - back.perShare) * volume,
    });
  }
  const count = evidence.length;
  const higher = evidence.filter((e) => e.change > 0).length;
  const r = t.roundTrips;
  const base = {
    id: "round-trips",
    rule: r.rule(ROUND_TRIP_DAYS, ROUND_TRIPS),
    measures: [
      { label: r.buyBacks, value: formatInteger(count), note: r.flaggedAt(ROUND_TRIPS) },
      ...(count
        ? [
            {
              label: r.daysApart,
              value: formatInteger(median(evidence.map((e) => e.days))),
              note: r.median,
            },
            {
              label: r.higher,
              value: t.of(higher, count),
              note: r.higherNote,
            },
          ]
        : []),
    ],
    sample: count,
    evidence: worstFirst(evidence),
    metric: {
      label: r.metric,
      value: trades.length < MIN_SAMPLE ? null : count / years,
      text: formatCompact(count / years),
      better: "lower" as const,
      step: 1,
      cutoffs: [ROUND_TRIPS],
      cutoffText: t.aYear(ROUND_TRIPS),
    },
  };
  if (count < ROUND_TRIPS)
    return {
      ...base,
      status: "clear",
      title: count ? r.fewTitle : r.noneTitle,
      detail: r.clearDetail(count, ROUND_TRIP_DAYS, ROUND_TRIPS),
      advice: {
        tone: "keep",
        text: count ? r.fewAdvice : r.noneAdvice,
      },
    };
  const impact = evidence.reduce((sum, e) => sum + e.result, 0);
  return {
    ...base,
    status: "found",
    title: r.foundTitle(count),
    detail: r.foundDetail(count, ROUND_TRIP_DAYS, higher),
    impact,
    advice:
      impact < 0
        ? {
            tone: "change",
            text: r.costAdvice(higher, count),
          }
        : {
            tone: "watch",
            text: r.aheadAdvice(count),
          },
  };
}

function bursts({ trades, lots, years }: Window): Check {
  const perWeek = new Map<string, Trade[]>();
  for (const t of trades) perWeek.set(weekOf(t.day), [...(perWeek.get(weekOf(t.day)) ?? []), t]);
  const busy = new Set(
    [...perWeek].filter(([, ts]) => ts.length >= BUSY_WEEK_TRADES).map(([w]) => w),
  );
  const [peakWeek, peak] = [...perWeek].reduce<[string, Trade[]]>(
    (top, w) => (w[1].length > top[1].length ? w : top),
    ["", []],
  );
  const busyTrades = trades.filter((t) => busy.has(weekOf(t.day)));
  const fees = busyTrades.reduce((sum, t) => sum + t.fee, 0);
  const hotLots = lots.filter((l) => busy.has(weekOf(l.buyDay)));
  const hot = hotLots.map(lotReturn);
  const calm = lots.filter((l) => !busy.has(weekOf(l.buyDay))).map(lotReturn);
  const compared = hot.length >= MIN_SAMPLE / 2 && calm.length >= MIN_SAMPLE / 2;
  const b = t.bursts;
  const base = {
    id: "bursts",
    rule: b.rule(BUSY_WEEK_TRADES, BUSY_WEEKS),
    measures: [
      {
        label: b.busyWeeks,
        value: formatInteger(busy.size),
        note: b.busyNote(BUSY_WEEK_TRADES, BUSY_WEEKS),
      },
      {
        label: b.busiest,
        value: b.trades(formatInteger(peak.length)),
        note: peakWeek ? b.weekOf(formatDate(peakWeek)) : undefined,
      },
      { label: b.inBusy, value: t.of(busyTrades.length, trades.length) },
      { label: b.courtage, value: formatInteger(fees), note: "SEK", sensitive: true },
      ...(compared
        ? [
            {
              label: b.boughtThen,
              value: b.vs(formatPercent(median(hot)), formatPercent(median(calm))),
              note: b.medianReturn,
            },
          ]
        : []),
    ],
    sample: busyTrades.length,
    // Closed lots only: trades from those weeks you still hold aren't listed.
    evidence: lotEvidence(hotLots),
    metric: {
      label: b.metric,
      value: trades.length < MIN_SAMPLE ? null : busy.size / years,
      text: formatCompact(busy.size / years),
      better: "lower" as const,
      step: 1,
      cutoffs: [BUSY_WEEKS],
      cutoffText: t.aYear(BUSY_WEEKS),
    },
  };
  if (busy.size < BUSY_WEEKS)
    return {
      ...base,
      status: "clear",
      title: b.clearTitle,
      detail: busy.size ? b.oneWeek(BUSY_WEEK_TRADES) : b.noWeek(BUSY_WEEK_TRADES),
      advice: { tone: "keep", text: b.clearAdvice },
    };
  let detail = b.detail(busy.size, BUSY_WEEK_TRADES, busyTrades.length);
  if (compared) detail += b.compared(formatPercent(median(hot)), formatPercent(median(calm)));
  const worse = compared && median(hot) < median(calm);
  return {
    ...base,
    status: "found",
    title: b.foundTitle,
    detail,
    impact: -fees,
    advice: worse
      ? {
          tone: "change",
          text: b.worseAdvice(formatPercent(median(hot)), formatPercent(median(calm))),
        }
      : {
          tone: "watch",
          text: compared ? b.courtageAdvice : b.unclearAdvice,
        },
  };
}

// Habits worth changing first, then other patterns, then checks that found nothing.
const rank = (f: Finding) =>
  f.status === "found" ? (f.advice?.tone === "change" ? 0 : 1) : f.status === "clear" ? 2 : 3;

const END = "9999-12-31";

// shortcut: a window only sees its own trades, so a buy-back across a year boundary is missed in
// the yearly rows (not in the trend, whose recent side runs to today). Fine for a yearly view.
function checks(
  trades: readonly Trade[],
  lots: readonly Lot[],
  from: string,
  to: string,
  today: string,
) {
  const end = to < today ? to : today;
  const w: Window = {
    trades: trades.filter((t) => t.day >= from && t.day < to),
    lots: lots.filter((l) => l.sellDay >= from && l.sellDay < to),
    // A month at least, so a fresh account doesn't turn two trades into 24 a year.
    years: Math.max(daysBetween(from, end) + 1, 30) / 365,
  };
  return [holdingAsymmetry(w), profitTaking(w), roundTrips(w), bursts(w)];
}

function trendOf(before: Check, recent: Check): Trend | undefined {
  const b = before.metric.value;
  const r = recent.metric.value;
  if (b == null || r == null) return undefined;
  const improved = recent.metric.better === "lower" ? r < b : r > b;
  return {
    direction: Math.abs(r - b) < recent.metric.step ? "steady" : improved ? "better" : "worse",
    recent: recent.metric.text,
    before: before.metric.text,
    recentTone: recent.advice?.tone,
    beforeTone: before.advice?.tone,
  };
}

/**
 * Every check on your buy and sell history, habits worth changing first. Each also runs per
 * calendar year and on the last 12 months against the time before, so a changed habit shows.
 */
export function profileTrades(transactions: readonly Transaction[], today: string): TradingProfile {
  const trades = toTrades(transactions);
  const lots = closedLots(trades);
  const wins = lots.filter((l) => lotReturn(l) > 0).length;
  const first = trades[0]?.day ?? today;
  const yearAgo = `${Number(today.slice(0, 4)) - 1}${today.slice(4).replace("-02-29", "-02-28")}`;
  const recent = checks(trades, lots, yearAgo, END, today);
  const before = checks(trades, lots, first, yearAgo, today);
  const years: [string, Check[]][] = [];
  for (let y = Number(today.slice(0, 4)); y >= Number(first.slice(0, 4)); y--)
    years.push([String(y), checks(trades, lots, `${y}-01-01`, `${y + 1}-01-01`, today)]);

  return {
    trades: trades.length,
    closed: lots.length,
    winRate: lots.length ? wins / lots.length : null,
    realized: lots.reduce((sum, l) => sum + (l.sell - l.buy) * l.volume, 0),
    findings: checks(trades, lots, first, END, today)
      .map((f, i) => ({
        ...f,
        history: years.map(([label, fs]) => ({
          label,
          status: fs[i]!.status,
          tone: fs[i]!.advice?.tone,
          metric: fs[i]!.metric.value == null ? "–" : fs[i]!.metric.text,
          value: fs[i]!.metric.value,
          sample: fs[i]!.sample,
        })),
        trend: trendOf(before[i]!, recent[i]!),
      }))
      .sort((a, b) => rank(a) - rank(b)),
  };
}
