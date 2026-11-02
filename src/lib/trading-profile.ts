import type { Transaction } from "avanza-ts";

import { formatCompact, formatDate, formatInteger, formatPercent, formatPrice } from "@/lib/format";

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
  side: "BUY" | "SELL";
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
export const statusLabel: Record<Status, string> = {
  found: "Pattern",
  clear: "No pattern",
  "too-few": "Too few trades",
};

export type Tone = "change" | "watch" | "keep";
export const toneLabel: Record<Tone, string> = {
  change: "Worth changing",
  watch: "Keep an eye on it",
  keep: "Keep it up",
};
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
export const directionLabel: Record<Direction, string> = {
  better: "Improving",
  worse: "Getting worse",
  steady: "Steady",
};

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
const days = (n: number) => `${formatInteger(n)} days`;
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
    if (t.cancelled || (t.type !== "BUY" && t.type !== "SELL") || !key || !volume || !amount)
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
    if (t.side === "BUY") {
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
  const base = {
    id: "holding",
    rule: `Compares the median days you held positions sold at a gain with those sold at a loss. Flagged when one is ${formatPrice(HOLD_RATIO)} times the other or more, with at least ${MIN_SAMPLE / 2} of each.`,
    measures: [
      {
        label: "Winners sold",
        value: formatInteger(winners.length),
        note: `median ${days(win)} held`,
      },
      {
        label: "Losers sold",
        value: formatInteger(losers.length),
        note: `median ${days(lose)} held`,
      },
      {
        label: "Losers vs winners",
        value: `${formatPrice(ratio)}×`,
        note: `flagged from ${formatPrice(HOLD_RATIO)}× or below ${formatPrice(1 / HOLD_RATIO)}×`,
      },
    ],
    sample: winners.length + losers.length,
    evidence: lotEvidence([...winners, ...losers]),
    metric: {
      label: "Losers vs winners",
      value: winners.length < MIN_SAMPLE / 2 || losers.length < MIN_SAMPLE / 2 ? null : ratio,
      text: `${formatPrice(ratio)}×`,
      better: "lower" as const,
      step: 0.5,
      cutoffs: [HOLD_RATIO, 1 / HOLD_RATIO],
      cutoffText: `from ${formatPrice(HOLD_RATIO)}× or below ${formatPrice(1 / HOLD_RATIO)}×`,
    },
  };
  const loss = losers.length ? median(losers.map(lotReturn)) : 0;
  const said = `You sell winners after a median of ${days(win)} and losers after ${days(lose)}.`;
  if (winners.length < MIN_SAMPLE / 2 || losers.length < MIN_SAMPLE / 2)
    return {
      ...base,
      status: "too-few",
      title: "Hold time: too few closed trades",
      detail: `It needs at least ${MIN_SAMPLE / 2} winning and ${MIN_SAMPLE / 2} losing sells; you have ${winners.length} and ${losers.length}.`,
    };
  if (ratio >= HOLD_RATIO)
    return {
      ...base,
      status: "found",
      title: "You hold losers longer than winners",
      detail: `${said} Cutting winners early and riding losers is the most common costly habit (the disposition effect).`,
      advice: {
        tone: "change",
        text: `Your losing sells ended at a median ${formatPercent(loss)} after ${days(lose)}. Decide what would make you sell when you buy, for example −15 %, and set it as a stop loss in Avanza, so the decision is made before you are in the red.`,
      },
    };
  if (ratio <= 1 / HOLD_RATIO)
    return {
      ...base,
      status: "found",
      title: "You let winners run and cut losers",
      detail: `${said} That is the opposite of the most common mistake.`,
      advice: {
        tone: "keep",
        text: `Letting winners run and cutting losers is what most investors fail to do. Keep the exit rules you use on losers, and apply them to new positions too.`,
      },
    };
  return {
    ...base,
    status: "clear",
    title: "You hold winners and losers about as long",
    detail: `${said} Neither side is held ${formatPrice(HOLD_RATIO)} times longer, so there is no sign of the disposition effect.`,
    advice: {
      tone: "keep",
      text: "Neither side lingers. Keep judging winners and losers on the same terms.",
    },
  };
}

function profitTaking({ lots }: Window): Check {
  const winners = lots.filter((l) => lotReturn(l) > 0);
  const gains = winners.map(lotReturn).sort((a, b) => a - b);
  const q1 = gains.length ? quantile(gains, 0.25) : 0;
  const q3 = gains.length ? quantile(gains, 0.75) : 0;
  const spread = `${formatInteger((q3 - q1) * 100)} percentage points`;
  const base = {
    id: "profit-taking",
    rule: `Looks at the gain on each position you sold at a profit. Flagged when the middle half of those gains sit within ${formatInteger(EXIT_SPREAD * 100)} percentage points, with at least ${MIN_SAMPLE} winning sells.`,
    measures: gains.length
      ? [
          {
            label: "Winning sells",
            value: formatInteger(gains.length),
            note: `needs ${MIN_SAMPLE}`,
          },
          { label: "Median gain", value: formatPercent(quantile(gains, 0.5)) },
          { label: "Middle half", value: `${formatPercent(q1)} to ${formatPercent(q3)}` },
          {
            label: "Spread",
            value: `${formatInteger((q3 - q1) * 100)} pp`,
            note: `flagged at ${formatInteger(EXIT_SPREAD * 100)} pp or less`,
          },
        ]
      : [{ label: "Winning sells", value: "0", note: `needs ${MIN_SAMPLE}` }],
    sample: gains.length,
    evidence: lotEvidence(winners),
    metric: {
      label: "Spread of winning sells",
      // Percentage points, so the value reads like its text.
      value: gains.length < MIN_SAMPLE ? null : (q3 - q1) * 100,
      text: `${formatInteger((q3 - q1) * 100)} pp`,
      better: "higher" as const,
      step: 10,
      cutoffs: [EXIT_SPREAD * 100],
      cutoffText: `at ${formatInteger(EXIT_SPREAD * 100)} pp or less`,
    },
  };
  if (gains.length < MIN_SAMPLE)
    return {
      ...base,
      status: "too-few",
      title: "Profit-taking: too few winning sells",
      detail: `It needs at least ${MIN_SAMPLE} winning sells; you have ${gains.length}.`,
    };
  if (q3 - q1 <= EXIT_SPREAD)
    return {
      ...base,
      status: "found",
      title: `You take profits around ${formatPercent(quantile(gains, 0.5))}`,
      detail: `Half your winning sells land between ${formatPercent(q1)} and ${formatPercent(q3)}, a spread of ${spread}. A fixed exit caps your winners; check whether those stocks kept rising.`,
      advice: {
        tone: "watch",
        text: `A fixed target means your best stocks get sold as early as your average ones. Next time a stock reaches about ${formatPercent(quantile(gains, 0.5))}, ask whether you would buy it today. If so, sell half and let the rest run.`,
      },
    };
  return {
    ...base,
    status: "clear",
    title: "Your profit-taking varies",
    detail: `The middle half of your winning sells spans ${spread}, so there is no fixed exit level.`,
    advice: {
      tone: "keep",
      text: "You exit at different levels, which suggests you sell on the story rather than on a number. Keep it that way.",
    },
  };
}

function roundTrips({ trades, years }: Window): Check {
  const buys = trades.filter((t) => t.side === "BUY").map((t) => ({ ...t, left: t.volume }));
  const evidence: Evidence[] = [];
  for (const sell of trades) {
    if (sell.side !== "SELL") continue;
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
  const base = {
    id: "round-trips",
    rule: `Pairs each sell with a buy of the same stock 1 to ${ROUND_TRIP_DAYS} days later. Flagged at ${ROUND_TRIPS} or more buy-backs.`,
    measures: [
      { label: "Buy-backs", value: formatInteger(count), note: `flagged at ${ROUND_TRIPS}` },
      ...(count
        ? [
            {
              label: "Days apart",
              value: formatInteger(median(evidence.map((e) => e.days))),
              note: "median",
            },
            {
              label: "Bought back higher",
              value: `${higher} of ${count}`,
              note: "paid more than you sold for",
            },
          ]
        : []),
    ],
    sample: count,
    evidence: worstFirst(evidence),
    metric: {
      label: "Buy-backs a year",
      value: trades.length < MIN_SAMPLE ? null : count / years,
      text: formatCompact(count / years),
      better: "lower" as const,
      step: 1,
      cutoffs: [ROUND_TRIPS],
      cutoffText: `at ${ROUND_TRIPS} a year`,
    },
  };
  if (count < ROUND_TRIPS)
    return {
      ...base,
      status: "clear",
      title: count ? "Few buy-backs" : "You don't buy back what you sell",
      detail: `${count} buy-back${count === 1 ? "" : "s"} within ${ROUND_TRIP_DAYS} days, below the ${ROUND_TRIPS} needed to call it a habit.`,
      advice: {
        tone: "keep",
        text: count
          ? "Rare enough to be normal. Your sells look like firm decisions."
          : "You don't second-guess your sells. Keep it up.",
      },
    };
  const impact = evidence.reduce((sum, e) => sum + e.result, 0);
  return {
    ...base,
    status: "found",
    title: `You bought back ${count} stocks you had just sold`,
    detail: `${count} times you sold a stock and bought it back within ${ROUND_TRIP_DAYS} days, ${higher} of them at a higher price. The amount is what buying back cost (−) or saved (+), fees included.`,
    impact,
    advice:
      impact < 0
        ? {
            tone: "change",
            text: `${higher} of ${count} buy-backs cost more than you sold for. Before you sell, ask whether you would still want the stock in a month. If you might, keep it or sell only part.`,
          }
        : {
            tone: "watch",
            text: `Your buy-backs came out ahead, but ${count} quick reversals suggest the sells weren't firm decisions. Write down why before each sale.`,
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
  const base = {
    id: "bursts",
    rule: `Counts calendar weeks with ${BUSY_WEEK_TRADES} or more trades. Flagged at ${BUSY_WEEKS} or more such weeks.`,
    measures: [
      {
        label: "Busy weeks",
        value: formatInteger(busy.size),
        note: `${BUSY_WEEK_TRADES}+ trades, flagged at ${BUSY_WEEKS}`,
      },
      {
        label: "Busiest week",
        value: `${formatInteger(peak.length)} trades`,
        note: peakWeek ? `week of ${formatDate(peakWeek)}` : undefined,
      },
      {
        label: "Trades in busy weeks",
        value: `${busyTrades.length} of ${trades.length}`,
      },
      { label: "Courtage in busy weeks", value: formatInteger(fees), note: "SEK", sensitive: true },
      ...(compared
        ? [
            {
              label: "Bought then vs rest",
              value: `${formatPercent(median(hot))} vs ${formatPercent(median(calm))}`,
              note: "median return, closed positions",
            },
          ]
        : []),
    ],
    sample: busyTrades.length,
    // Closed lots only: trades from those weeks you still hold aren't listed.
    evidence: lotEvidence(hotLots),
    metric: {
      label: "Busy weeks a year",
      value: trades.length < MIN_SAMPLE ? null : busy.size / years,
      text: formatCompact(busy.size / years),
      better: "lower" as const,
      step: 1,
      cutoffs: [BUSY_WEEKS],
      cutoffText: `at ${BUSY_WEEKS} a year`,
    },
  };
  if (busy.size < BUSY_WEEKS)
    return {
      ...base,
      status: "clear",
      title: "No trading bursts",
      detail: busy.size
        ? `Only one week had ${BUSY_WEEK_TRADES} or more trades.`
        : `No week had ${BUSY_WEEK_TRADES} or more trades.`,
      advice: { tone: "keep", text: "Your trading is spread out. Keep it up." },
    };
  let detail = `${busy.size} weeks had ${BUSY_WEEK_TRADES} or more trades, ${busyTrades.length} trades in all. The amount is the courtage paid in those weeks.`;
  if (compared)
    detail += ` Stocks bought in those weeks returned a median ${formatPercent(median(hot))}, against ${formatPercent(median(calm))} for the rest.`;
  const worse = compared && median(hot) < median(calm);
  return {
    ...base,
    status: "found",
    title: "You trade in bursts",
    detail,
    impact: -fees,
    advice: worse
      ? {
          tone: "change",
          text: `Stocks bought in busy weeks did worse than the rest (${formatPercent(median(hot))} against ${formatPercent(median(calm))}). When a week gets busy, wait a day before each new buy and write down why you want it.`,
        }
      : {
          tone: "watch",
          text: compared
            ? "Stocks bought in busy weeks did as well as the rest, so the cost is the courtage. Fewer, larger trades would pay less of it."
            : "Too few of those trades are closed to tell whether they did worse. The courtage is the cost you know of.",
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
