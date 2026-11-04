import type { Transaction } from "avanza-ts";

import { InstrumentType } from "@/lib/avanza/codes";

import { ACCOUNTS, HOLDINGS, type DemoAccount, type DemoHolding } from "./portfolio";
import { rng, round, seedOf } from "./random";
import { FX, instrument, type DemoInstrument } from "./universe";

// The demo customer's history, derived once from portfolio.ts: a daily return index, monthly
// deposits sized so today's value matches the holdings, and the trades and dividends behind them.

export const DAY = 86_400_000;
export const NOW = Date.now();
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
export const TODAY = iso(NOW);
const START = Date.UTC(2020, 10, 2);
const YEAR_START = Date.UTC(new Date(NOW).getUTCFullYear(), 0, 1);

export const amount = (value: number, unit = "SEK", decimalPrecision = 2) => ({
  value: round(value, decimalPrecision),
  unit,
  unitType: unit === "percentage" ? "PERCENTAGE" : "MONETARY",
  decimalPrecision,
});
export const percent = (value: number) => amount(value, "percentage", 2);

// —— Holdings now ————————————————————————————————————————————————

export type Position = DemoHolding & {
  id: string;
  account: DemoAccount;
  inst: DemoInstrument;
  value: number;
  cost: number;
  today: number;
};

export const POSITIONS: Position[] = HOLDINGS.map((h, i) => {
  const inst = instrument(h.orderbookId);
  const fx = FX[inst.currency];
  const value = h.volume * inst.price * fx;
  return {
    ...h,
    id: `pos-${i + 1}`,
    account: ACCOUNTS.find((a) => a.id === h.accountId)!,
    inst,
    value,
    cost: h.volume * h.averagePrice * fx,
    today: value - value / (1 + inst.change),
  };
});

export const accountsOf = (ids?: readonly string[] | null) =>
  ids?.length ? ACCOUNTS.filter((a) => ids.includes(a.id)) : ACCOUNTS;
export const positionsOf = (ids?: readonly string[] | null) =>
  POSITIONS.filter((p) => !ids?.length || ids.includes(p.accountId));
export const totalOf = (ids?: readonly string[] | null) =>
  positionsOf(ids).reduce((s, p) => s + p.value, 0) +
  accountsOf(ids).reduce((s, a) => s + a.cash, 0);

// —— Return index and value history ————————————————————————————————————

/** Trading days (Mon–Fri) from the first deposit to today, as UTC midnights. */
export const DAYS: number[] = [];
for (let t = START; t <= NOW; t += DAY) {
  const wd = new Date(t).getUTCDay();
  if (wd !== 0 && wd !== 6) DAYS.push(t);
}

/**
 * A daily log-return walk bent to pass through fixed points: `targets` maps a time to the growth
 * since the first day, so this year's and the whole history's returns come out as chosen.
 */
export function shapedIndex(seed: number, targets: [number, number][], vol = 0.011) {
  const r = rng(seed);
  const log = [0];
  for (let i = 1; i < DAYS.length; i++) {
    const z = Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());
    log.push(log[i - 1] + vol * z);
  }
  const anchors = [
    [0, 0] as [number, number],
    ...targets.map(([t, g]) => [nearest(t), Math.log(g)] as [number, number]),
  ];
  for (let a = 1; a < anchors.length; a++) {
    const [i0, want0] = anchors[a - 1];
    const [i1, want1] = anchors[a];
    const err0 = want0 - log[i0];
    const err1 = want1 - log[i1];
    for (let i = i0 + 1; i <= i1; i++) log[i] += err0 + ((err1 - err0) * (i - i0)) / (i1 - i0);
    for (let i = i1 + 1; i < log.length; i++) log[i] += err1;
  }
  return log.map(Math.exp);
}

/** Index of the trading day at or before `t`. */
export function nearest(t: number) {
  let i = 0;
  while (i + 1 < DAYS.length && DAYS[i + 1] <= t) i++;
  return i;
}

const lastDay = DAYS.length - 1;
/** The portfolio's time-weighted growth: +86 % since the start, +14,8 % this year (chat-showcase.ts says so). */
const GROWTH_YTD = 1.148;
// Anchored on the last trading day of last year: where the THIS_YEAR period starts.
/** Home's "since last visit": three days back, up 2,4 % since then (lastVisit below). */
const VISIT_AT = NOW - 3 * DAY - 5 * 3_600_000;
const GROWTH_SINCE_VISIT = 1.024;
export const INDEX = shapedIndex(seedOf("portfolio"), [
  [YEAR_START - DAY, 1.86 / GROWTH_YTD],
  // Pinned so Home's chart ends on the same return as its headline.
  [VISIT_AT, 1.86 / GROWTH_SINCE_VISIT],
  [DAYS[lastDay], 1.86],
]);

/** Monthly deposits (every 25th) in SEK; scaled below so the value lands on today's total. */
const depositDays = DAYS.filter(
  (t, i) => i > 0 && new Date(t).getUTCDate() >= 25 && new Date(DAYS[i - 1]).getUTCDate() < 25,
);
const raw = depositDays.reduce(
  (s, t, k) => s + (1 + k * 0.012) * (INDEX[lastDay] / INDEX[nearest(t)]),
  0,
);
const scale = totalOf() / raw;
export const DEPOSITS = depositDays.map((t, k) => ({
  date: t,
  amount: round((1 + k * 0.012) * scale, 0),
}));

/** Value of everything on each trading day: each deposit grown by the index since it went in. */
export const VALUES = DAYS.map((t, i) =>
  DEPOSITS.reduce(
    (s, d) => (d.date <= t ? s + d.amount * (INDEX[i] / INDEX[nearest(d.date)]) : s),
    0,
  ),
);
// Today's point is exact, so charts end on the same total as the top bar.
VALUES[lastDay] = totalOf();

// —— Transactions ———————————————————————————————————————————————————

const tx = (
  id: string,
  date: number,
  account: DemoAccount,
  type: string,
  amountSek: number,
  inst?: DemoInstrument,
  volume?: number,
  price?: number,
): Transaction => {
  const fx = inst ? FX[inst.currency] : 1;
  return {
    id,
    date: iso(date),
    settlementDate: iso(date + 2 * DAY),
    availabilityDate: iso(date),
    tradeDate: inst ? iso(date) : null,
    account: { id: account.id, name: account.name, type: account.type, urlParameterId: account.id },
    orderbook: inst
      ? {
          id: inst.orderbookId,
          flagCode: inst.country,
          name: inst.name,
          marketplace: inst.marketplace,
          type: inst.type,
          currency: inst.currency,
          isin: inst.isin,
          volumeFactor: 1,
        }
      : null,
    instrumentName: inst?.name ?? null,
    description: inst
      ? `${type === "DIVIDEND" ? "Utdelning" : type === "BUY" ? "Köp" : "Sälj"} ${inst.name}`
      : type === "DEPOSIT"
        ? "Insättning"
        : "Uttag",
    type,
    backofficeType: type,
    backofficeTypeText: type,
    volume: volume === undefined ? null : amount(volume, "st", 4),
    priceInTradedCurrency: price === undefined ? null : amount(price, inst?.currency),
    priceInTransactionCurrency: price === undefined ? null : amount(price * fx),
    amount: amount(amountSek),
    commission:
      inst && type !== "DIVIDEND" ? amount(inst.type === InstrumentType.Fund ? 0 : 39) : null,
    currencyRate: inst ? amount(fx, inst.currency, 4) : null,
    foreignTaxRate: null,
    result: null,
    onCreditAccount: false,
    intraday: false,
    cancelled: false,
    cancelDate: null,
    noteId: null,
    isin: inst?.isin ?? null,
    volumeFactor: inst ? 1 : null,
    verificationNumber: id,
  };
};

function buildTransactions(): Transaction[] {
  const out: Transaction[] = [];
  const r = rng(seedOf("transactions"));
  // Deposits go to the accounts in proportion to what each holds today.
  const shares = ACCOUNTS.map((a) => totalOf([a.id]) / totalOf());
  DEPOSITS.forEach((d, k) =>
    ACCOUNTS.forEach((a, j) =>
      out.push(tx(`dep-${k}-${j}`, d.date, a, "DEPOSIT", round(d.amount * shares[j], 0))),
    ),
  );

  // Each holding bought in three goes whose weighted average is its average price.
  POSITIONS.forEach((p, i) => {
    const parts = [0.5, 0.3, 0.2];
    const prices = [p.averagePrice * 0.85, p.averagePrice, 0];
    prices[2] = (p.averagePrice - prices[0] * parts[0] - prices[1] * parts[1]) / parts[2];
    // Spread over the history; the newest holdings (later in the list) start later.
    const first = START + (i / POSITIONS.length) * (NOW - START) * 0.6 + r() * 60 * DAY;
    parts.forEach((part, k) => {
      const date = DAYS[nearest(first + k * (NOW - first) * 0.3 * (0.6 + r() * 0.4))];
      const volume =
        p.inst.type === InstrumentType.Fund
          ? round(p.volume * part, 4)
          : Math.round(p.volume * part);
      const price = prices[k];
      out.push(
        tx(
          `buy-${i}-${k}`,
          date,
          p.account,
          "BUY",
          -volume * price * FX[p.inst.currency],
          p.inst,
          volume,
          round(price),
        ),
      );
    });
  });

  // Two holdings that are gone now: bought, then sold with a profit and a loss.
  const trading = ACCOUNTS[2];
  const sold: [string, number, number, number, number, number][] = [
    // orderbookId, volume, buy price, sell price, days ago bought, days ago sold
    ["238656", 40, 182.5, 412.3, 900, 120],
    ["5364", 300, 181.2, 152.4, 700, 260],
  ];
  sold.forEach(([id, volume, buy, sell, boughtAgo, soldAgo], k) => {
    const inst = instrument(id);
    const fx = FX[inst.currency];
    out.push(
      tx(
        `sold-buy-${k}`,
        DAYS[nearest(NOW - boughtAgo * DAY)],
        trading,
        "BUY",
        -volume * buy * fx,
        inst,
        volume,
        buy,
      ),
    );
    out.push(
      tx(
        `sold-sell-${k}`,
        DAYS[nearest(NOW - soldAgo * DAY)],
        trading,
        "SELL",
        volume * sell * fx,
        inst,
        -volume,
        sell,
      ),
    );
  });

  // A yearly dividend in May per dividend-paying stock, on what was held by then.
  for (const p of POSITIONS) {
    if (!p.inst.yield) continue;
    const firstBuy = out.find((t) => t.id === `buy-${POSITIONS.indexOf(p)}-0`)!.date;
    for (let y = 2021; y <= new Date(NOW).getUTCFullYear(); y++) {
      const date = Date.UTC(y, 4, 8 + (seedOf(p.inst.orderbookId) % 14));
      if (date > NOW || iso(date) < firstBuy) continue;
      const perShare = round(p.inst.price * p.inst.yield * (0.8 + (y - 2021) * 0.05), 2);
      out.push(
        tx(
          `div-${p.id}-${y}`,
          date,
          p.account,
          "DIVIDEND",
          p.volume * perShare * FX[p.inst.currency],
          p.inst,
          p.volume,
          perShare,
        ),
      );
    }
  }

  // The last few days, for Home's "while you were away".
  const pos = (id: string) => POSITIONS.find((p) => p.orderbookId === id)!;
  const inv = pos("5247");
  out.push(
    tx(
      "recent-div",
      NOW - 1 * DAY,
      inv.account,
      "DIVIDEND",
      inv.volume * 2.6,
      inv.inst,
      inv.volume,
      2.6,
    ),
  );
  const bol = pos("5568");
  out.push(tx("recent-buy", NOW - 2 * DAY, bol.account, "BUY", -30 * 372.4, bol.inst, 30, 372.4));
  out.push(tx("recent-dep", NOW - 2 * DAY, ACCOUNTS[0], "DEPOSIT", 5_000));
  const eric = pos("5240");
  out.push(
    tx("recent-sell", NOW - 3 * DAY, eric.account, "SELL", 200 * 86.9, eric.inst, -200, 86.9),
  );

  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export const TRANSACTIONS = buildTransactions();

export type TransactionFilter = {
  from?: string | null;
  to?: string | null;
  accountIds?: readonly string[] | null;
  types?: readonly string[] | null;
  isin?: string | null;
};

export const transactionsOf = (f: TransactionFilter) =>
  TRANSACTIONS.filter(
    (t) =>
      (!f.from || t.date >= f.from) &&
      (!f.to || t.date <= f.to) &&
      (!f.accountIds?.length || f.accountIds.includes(t.account.id)) &&
      (!f.types?.length || f.types.includes(t.type)) &&
      (!f.isin || t.isin === f.isin),
  );

// —— The last visit Home compares with ————————————————————————————————

/**
 * How the portfolio looked three days ago (briefing.ts `LastVisit`): each holding's price then
 * from a seeded move, and a total that makes the result since then about +2,4 %.
 */
export function lastVisit() {
  const at = VISIT_AT;
  const r = rng(seedOf("last-visit"));
  const prices: Record<string, number> = {};
  for (const p of POSITIONS) {
    if (prices[p.orderbookId]) continue;
    const held = POSITIONS.filter((q) => q.orderbookId === p.orderbookId);
    const unit = held.reduce((s, q) => s + q.value, 0) / held.reduce((s, q) => s + q.volume, 0);
    // Funds move less than single stocks in three days.
    const swing = p.inst.type === InstrumentType.Stock ? 0.1 : 0.03;
    prices[p.orderbookId] = unit / (1 + (r() - 0.3) * swing);
  }
  const deposits = transactionsOf({ from: iso(at), types: ["DEPOSIT"] }).reduce(
    (s, t) => s + (t.amount?.value ?? 0),
    0,
  );
  return {
    at: new Date(at).toISOString(),
    total: (totalOf() - deposits) / GROWTH_SINCE_VISIT,
    prices,
  };
}
