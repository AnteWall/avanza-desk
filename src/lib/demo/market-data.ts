import { TZDate } from "@date-fns/tz";

import { InstrumentType } from "@/lib/avanza/codes";

import { rng, round, seedOf, walk } from "./random";
import { type DemoInstrument, FX, INDICES, INSTRUMENTS } from "./universe";

// Shared market math for the demo fixtures: who an orderbook id is, its price history (daily
// and intraday, always ending at the universe's price) and derived numbers like owners.

/** Stockholm-listed OMXS30 members the universe leaves out, so the index heatmap is full. */
const extra = (
  orderbookId: string,
  name: string,
  ticker: string,
  isin: string,
  sector: string,
  price: number,
  change: number,
  marketCapBn: number,
  pe: number,
  dividendYield: number,
): DemoInstrument => ({
  orderbookId,
  name,
  ticker,
  isin,
  type: InstrumentType.Stock,
  currency: "SEK",
  country: "SE",
  marketplace: "Stockholmsbörsen",
  sector,
  price,
  change,
  marketCap: marketCapBn * 1e9,
  pe,
  yield: dividendYield,
});

export const EXTRA_STOCKS: DemoInstrument[] = [
  extra(
    "5264",
    "Handelsbanken A",
    "SHB A",
    "SE0007100599",
    "Finans",
    118.6,
    0.0035,
    235,
    9.8,
    0.069,
  ),
  extra(
    "1110522",
    "Nordea Bank",
    "NDA SE",
    "FI4000297767",
    "Finans",
    142.3,
    0.0058,
    498,
    8.9,
    0.071,
  ),
  extra(
    "1171003",
    "Epiroc A",
    "EPI A",
    "SE0015658109",
    "Industri",
    203.5,
    0.0124,
    246,
    26.3,
    0.021,
  ),
  extra(
    "5253",
    "Getinge B",
    "GETI B",
    "SE0000202624",
    "Hälsovård",
    186.9,
    -0.0091,
    51,
    19.6,
    0.024,
  ),
  extra("5257", "Skanska B", "SKA B", "SE0000113250", "Industri", 241.2, 0.0067, 99, 15.4, 0.031),
  extra("5259", "SKF B", "SKF B", "SE0000108227", "Industri", 221.8, 0.0153, 101, 14.1, 0.034),
  extra("5267", "SCA B", "SCA B", "SE0000112724", "Material", 128.4, -0.0047, 90, 27.8, 0.022),
  extra("5386", "Tele2 B", "TEL2 B", "SE0005190238", "Telekom", 158.1, 0.0021, 110, 21.5, 0.044),
  extra(
    "1153447",
    "Lifco B",
    "LIFCO B",
    "SE0015949201",
    "Industri",
    322.4,
    0.0089,
    146,
    41.7,
    0.009,
  ),
  extra(
    "5251",
    "Atlas Copco B",
    "ATCO B",
    "SE0017486897",
    "Industri",
    152.1,
    0.0201,
    835,
    25.8,
    0.019,
  ),
];

const ALL = [...INSTRUMENTS, ...EXTRA_STOCKS];
const byId = new Map(ALL.map((i) => [i.orderbookId, i]));

export const OMXS30 = ALL.filter(
  (i) => i.type === InstrumentType.Stock && i.country !== "US" && i.marketCap > 40e9,
)
  .sort((a, b) => b.marketCap - a.marketCap)
  .slice(0, 30);

/** Any demo instrument by orderbook id, or undefined (callers answer 404). */
export const findInstrument = (orderbookId: string) => byId.get(orderbookId);
export const allInstruments = () => ALL;
export const stocks = () => ALL.filter((i) => i.type === InstrumentType.Stock);

/** Something with a price history: an instrument or an index. */
export type Priced = { orderbookId: string; price: number; change: number; country: string };

export const asPriced = (orderbookId: string): Priced | undefined =>
  findInstrument(orderbookId) ?? INDICES.find((i) => i.orderbookId === orderbookId);

export const prevClose = (p: Priced) => p.price / (1 + p.change);

// ---- Sessions and trading days ----

const DAY = 86_400_000;

/** Exchange hours in Stockholm time: US stocks trade 15:30–22:00 there. */
function hours(p: Priced) {
  const us = p.country === "US";
  return {
    tz: us ? "America/New_York" : "Europe/Stockholm",
    open: us ? 9.5 : 9,
    close: us ? 16 : 17.5,
  };
}

const isWeekday = (d: TZDate) => d.getDay() !== 0 && d.getDay() !== 6;

/** The session that holds or last held prices: today's from the open bell, else the last weekday's. */
export function lastSession(p: Priced, now = Date.now()) {
  const { tz, open, close } = hours(p);
  const at = (day: TZDate, h: number) =>
    new TZDate(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      Math.floor(h),
      (h % 1) * 60,
      tz,
    ).getTime();
  let day = new TZDate(now, tz);
  while (!isWeekday(day) || now < at(day, open)) day = new TZDate(at(day, 12) - DAY, tz);
  const start = at(day, open);
  const end = Math.min(now, at(day, close));
  return { start, end, open: now < at(day, close) && now >= start, closeAt: at(day, close), tz };
}

/** Timestamps (noon UTC) of the `n` trading days up to and including the last session's day. */
function tradingDays(p: Priced, n: number) {
  const last = new Date(lastSession(p).start);
  const out: number[] = [];
  for (
    let t = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate(), 12);
    out.length < n;
    t -= DAY
  ) {
    const wd = new Date(t).getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(t);
  }
  return out.reverse();
}

// ---- Daily history ----

/** Ten years of daily closes; the last is today's price, the one before it yesterday's close. */
const HISTORY_DAYS = 2600;
const dailyCache = new Map<string, { t: number; close: number }[]>();

/** Yearly drift and daily volatility per instrument, seeded so each has its own character. */
function character(p: Priced) {
  const r = rng(seedOf(`char:${p.orderbookId}`));
  return { drift: 0.0001 + r() * 0.0005, vol: 0.009 + r() * 0.012 };
}

// One-year returns that tell a story; everything else gets a seeded, mostly positive one.
const ONE_YEAR: Record<string, number> = {
  "5260": 0.62, // Saab: defence spending
  "5568": 0.35, // Boliden
  "4478": 0.48, // NVIDIA
  "1102542": 0.55, // Spotify
  "549768": -0.22, // Evolution
  "5249": -0.28, // Nibe
  "5240": 0.04, // Ericsson
  "5364": -0.08, // H&M
  "19002": 0.12, // OMXS30
};

export function daily(p: Priced) {
  const hit = dailyCache.get(p.orderbookId);
  if (hit) return hit;
  const days = tradingDays(p, HISTORY_DAYS);
  const n = days.length;
  const r1 = ONE_YEAR[p.orderbookId] ?? pick(p.orderbookId, "r1", -0.12, 0.38);
  const r3 = (1 + r1) * pick(p.orderbookId, "r3", 0.95, 1.55);
  const r5 = r3 * pick(p.orderbookId, "r5", 0.9, 1.45);
  const r10 = r5 * pick(p.orderbookId, "r10", 1.05, 2.3);
  const yesterday = prevClose(p);
  // [trading days back, price then]: the walk is pinned at each, so period returns stay plausible.
  const anchors: [number, number][] = [
    [n - 1, yesterday / r10],
    [1260, yesterday / r5],
    [756, yesterday / r3],
    [252, yesterday / (1 + r1)],
    [1, yesterday],
  ];
  const { vol } = character(p);
  const closes: number[] = [];
  for (let k = 0; k < anchors.length - 1; k++) {
    const [fromBack, from] = anchors[k];
    const [toBack, to] = anchors[k + 1];
    const segment = bridge(
      seedOf(`daily:${p.orderbookId}:${k}`),
      fromBack - toBack + 1,
      from,
      to,
      vol,
    );
    closes.push(...(k === 0 ? segment : segment.slice(1)));
  }
  closes.push(p.price);
  const series = days.map((t, i) => ({ t, close: round(closes[i], 4) }));
  dailyCache.set(p.orderbookId, series);
  return series;
}

/** The close `tradingDaysAgo` sessions back (0 = today's price). */
export const closeAgo = (p: Priced, tradingDaysAgo: number) => {
  const d = daily(p);
  return d[Math.max(0, d.length - 1 - tradingDaysAgo)].close;
};

/** The last close on or before `t`. */
export function closeAt(p: Priced, t: number) {
  const d = daily(p);
  let found = d[0].close;
  for (const point of d) {
    if (point.t > t) break;
    found = point.close;
  }
  return found;
}

/** Closing prices at the start of each period, keyed like Avanza's `historicalClosingPrices`. */
export function historicalClosingPrices(p: Priced) {
  const last = daily(p).at(-1)!.t;
  const year = new Date(last).getUTCFullYear();
  return {
    oneDay: round(prevClose(p)),
    oneWeek: round(closeAgo(p, 5)),
    oneMonth: round(closeAgo(p, 21)),
    threeMonths: round(closeAgo(p, 63)),
    startOfYear: round(closeAt(p, Date.UTC(year - 1, 11, 31, 23))),
    oneYear: round(closeAgo(p, 252)),
    threeYears: round(closeAgo(p, 756)),
    fiveYears: round(closeAgo(p, 1260)),
    tenYears: round(closeAgo(p, 2520)),
    start: round(daily(p)[0].close),
    startDate: new Date(daily(p)[0].t).toISOString().slice(0, 10),
  };
}

/** Return over the last `tradingDays` sessions, as a ratio. */
export const returnOver = (p: Priced, tradingDaysAgo: number) =>
  p.price / closeAgo(p, tradingDaysAgo) - 1;

// ---- Intraday ----

/** The next weekday at or after `t` (reports and ex-dates never land on a weekend). */
export function weekday(t: number) {
  while ([0, 6].includes(new Date(t).getUTCDay())) t += DAY;
  return t;
}

/** A walk from `start` to `end` in `n` points: a random walk, tilted so both ends land exactly. */
export function bridge(seed: number, n: number, start: number, end: number, vol: number) {
  if (n < 2) return [end];
  const w = walk(seed, n, end, { drift: 0, vol });
  const fix = start / w[0];
  return w.map((v, i) => v * fix ** (1 - i / (n - 1)));
}

/**
 * Prices every `stepMin` minutes over the last `sessions` sessions, each day bridging the previous
 * close to that day's close (today's: from yesterday's close up to now, ending at the price).
 */
export function intraday(p: Priced, sessions: number, stepMin: number) {
  const session = lastSession(p);
  const lengthMs = session.closeAt - session.start;
  const days = daily(p);
  const out: { t: number; price: number }[] = [];
  const { vol } = character(p);
  for (let k = sessions - 1; k >= 0; k--) {
    const dayIndex = days.length - 1 - k;
    const from = days[dayIndex - 1]?.close ?? days[dayIndex].close;
    const to = days[dayIndex].close;
    // The session's open, shifted back k weekdays from the last session (timestamps by noon).
    const start = session.start - (days.at(-1)!.t - days[dayIndex].t);
    const end = k === 0 ? session.end : start + lengthMs;
    const n = Math.max(2, Math.floor((end - start) / (stepMin * 60_000)) + 1);
    const prices = bridge(
      seedOf(`intra:${p.orderbookId}:${dayIndex}`),
      n,
      from * (1 + (rng(dayIndex)() - 0.5) * 0.004),
      to,
      vol / 6,
    );
    prices.forEach((price, i) =>
      out.push({ t: start + i * stepMin * 60_000, price: round(price, 4) }),
    );
  }
  return out;
}

// ---- Derived per-instrument numbers ----

/** A seeded number in [min, max) for this instrument and purpose. */
export const pick = (orderbookId: string, what: string, min: number, max: number) =>
  min + rng(seedOf(`${what}:${orderbookId}`))() * (max - min);

/** Smallest price step on the order book. */
export const tickSize = (i: DemoInstrument) =>
  i.currency !== "SEK"
    ? 0.01
    : i.price < 50
      ? 0.01
      : i.price < 100
        ? 0.02
        : i.price < 500
          ? 0.05
          : i.price < 1000
            ? 0.1
            : 0.5;

export const roundToTick = (i: DemoInstrument, price: number) => {
  const t = tickSize(i);
  return round(Math.round(price / t) * t, 4);
};

/** Avanza owners: popular Swedish names have the most. */
export function owners(i: DemoInstrument) {
  if (i.type === InstrumentType.Fund)
    return Math.round(pick(i.orderbookId, "owners", 80_000, 1_400_000));
  // Swedes own Swedish names: a US giant has fewer Avanza owners than Investor.
  const [base, min, max] = i.country === "SE" ? [30_000, 4000, 11_000] : [20_000, 500, 1400];
  return Math.round(base + Math.sqrt(i.marketCap / 1e9) * pick(i.orderbookId, "owners", min, max));
}

// Names whose owner count jumps this week. Trending hides what you hold or watch, so it leads
// with the second row; the first shows up as owner signals on your own holdings.
const HOT = new Set([
  "5260",
  "5568",
  "4478",
  "549768",
  "5249",
  "1102542",
  "5253",
  "1171003",
  "5259",
  "5361",
  "4928",
  "5386",
]);

/** Owner change over a week as a ratio; a few names are clearly trending. */
export const ownersChangeWeek = (i: DemoInstrument) =>
  HOT.has(i.orderbookId)
    ? pick(i.orderbookId, "hot", 0.025, 0.07)
    : pick(i.orderbookId, "own1w", -0.006, 0.012);

/** Today's traded volume in shares. */
export const volumeToday = (i: DemoInstrument) =>
  // Shares outstanding × daily turnover; only a sliver of a US stock's volume shows on Avanza.
  Math.round(
    (i.marketCap / (i.price * FX[i.currency])) *
      pick(i.orderbookId, "turnover", 0.0008, 0.0035) *
      (i.country === "US" ? 0.01 : 1),
  );

/** Analyst consensus: the average target sits above or below the price by this ratio. */
export const analystUpside = (i: DemoInstrument) => pick(i.orderbookId, "upside", -0.12, 0.32);
