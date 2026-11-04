import type {
  AverageCustomerChartResponse,
  CreditInfoResponse,
  DividendsResponse,
  FundAnalysisResponse,
  InsightsReport,
  KeyRatiosResponse,
  OrderbookPerformanceChart,
  PerformanceChartResponse,
  PositionListResponse,
  StockPositionKeyRatiosResponse,
  TotalValuesResponse,
  TransactionListResponse,
  UpcomingDividendsResponse,
  YearSummaryResponse,
} from "avanza-ts";

import { InstrumentType } from "@/lib/avanza/codes";

import {
  accountsOf,
  amount,
  DAY,
  DAYS,
  INDEX,
  lastVisit,
  nearest,
  NOW,
  percent,
  POSITIONS,
  positionsOf,
  shapedIndex,
  TODAY,
  totalOf,
  transactionsOf,
  TRANSACTIONS,
  VALUES,
} from "./account-data";
import { FUND_ANALYSIS } from "./account-funds";
import { demoSettings } from "./commands";
import { ACCOUNTS, type DemoAccount } from "./portfolio";
import { rng, round, seedOf } from "./random";
import { get, post, type DemoRequest, type Route } from "./route";
import { FX } from "./universe";

// The demo customer's accounts, positions, performance, transactions and orders.

// Settings the account side starts with; a shot's ?demo= preset still wins (install.ts).
// Workspace as start page, so a shot of /portfolio isn't sent to Home on session start
// (VisitTracker); Home still shows "since your last visit" from the visit below.
demoSettings.set("startPage", "workspace");
demoSettings.set("briefing:since", lastVisit());
demoSettings.set("rebalance:targets", rebalanceTargets());
// One instrument the plan buys that isn't held yet.
// Half a point of tolerance keeps the plan to the trades that matter.
demoSettings.set("rebalance:options", { band: 0.005, minOrder: 1000 });
demoSettings.set("rebalance:added", [
  {
    orderbookId: "5255",
    name: "SEB A",
    type: InstrumentType.Stock,
    isin: "SE0000148884",
    currency: "SEK",
  },
]);

/**
 * Target weights for a mixed plan: funds and the ETF up, the two stocks that ran (Saab, NVIDIA)
 * trimmed, room for SEB, so Rebalance shows both buys and sells.
 */
function rebalanceTargets() {
  const tilt: Record<string, number> = { "5260": 0.6, "4478": 0.65 };
  const weights: Record<string, number> = { "5255": 0.03 };
  for (const p of POSITIONS) {
    const factor = tilt[p.orderbookId] ?? (p.inst.type === InstrumentType.Stock ? 0.95 : 1.25);
    weights[p.orderbookId] = (weights[p.orderbookId] ?? 0) + p.value * factor;
  }
  const sum = Object.entries(weights).reduce((s, [id, w]) => s + (id === "5255" ? 0 : w), 0);
  const out: Record<string, number> = {};
  for (const [id, w] of Object.entries(weights))
    out[id] = id === "5255" ? w : round((w / sum) * 0.97, 3);
  // Rounding leaves a few tenths over or under; the largest target takes it, so they sum to 100 %.
  const largest = Object.keys(out).reduce((a, b) => (out[a] > out[b] ? a : b));
  out[largest] = round(out[largest] + 1 - Object.values(out).reduce((s, v) => s + v, 0), 3);
  return out;
}

const idsFrom = (body: unknown): string[] => {
  if (Array.isArray(body)) return body as string[];
  const b = (body ?? {}) as { scrambledAccountIds?: string[]; accountIds?: string[] };
  return b.scrambledAccountIds ?? b.accountIds ?? [];
};
const pathAccount = (m: RegExpMatchArray) => (m[1] ? [m[1]] : []);
const accountRef = (a: DemoAccount) => ({
  id: a.id,
  type: a.type,
  name: a.name,
  urlParameterId: a.id,
  hasCredit: false,
});

// —— Positions ————————————————————————————————————————————————————

function positionList(ids: string[]): PositionListResponse {
  return {
    withOrderbook: positionsOf(ids).map((p) => {
      const fx = FX[p.inst.currency];
      const last = p.inst.price;
      return {
        account: accountRef(p.account),
        instrument: {
          id: p.inst.orderbookId,
          type: p.inst.type,
          name: p.inst.name,
          orderbook: {
            id: p.inst.orderbookId,
            flagCode: p.inst.country,
            name: p.inst.name,
            type: p.inst.type,
            tradeStatus: "BUYABLE_AND_SELLABLE",
            quote: {
              highest: amount(last * 1.008, p.inst.currency),
              lowest: amount(last * 0.991, p.inst.currency),
              buy: amount(last * 0.999, p.inst.currency),
              sell: amount(last * 1.001, p.inst.currency),
              latest: amount(last, p.inst.currency),
              change: amount(last - last / (1 + p.inst.change), p.inst.currency),
              changePercent: percent(p.inst.change * 100),
              updated: new Date(NOW).toISOString(),
            },
            turnover: null,
            lastDeal: { date: TODAY, time: "15:42:10" },
          },
          currency: p.inst.currency,
          isin: p.inst.isin,
          volumeFactor: 1,
        },
        id: p.id,
        lastTradingDayPerformance: {
          absolute: amount(p.today),
          relative: percent(p.inst.change * 100),
        },
        superInterestApproved: false,
        volume: amount(p.volume, "st", p.inst.type === InstrumentType.Fund ? 4 : 0),
        value: amount(p.value),
        averageAcquiredPrice: amount(p.averagePrice * fx),
        averageAcquiredPriceInstrumentCurrency: amount(p.averagePrice, p.inst.currency),
        acquiredValue: amount(p.cost),
        collateralFactor: percent(0),
      };
    }),
    withoutOrderbook: [],
    cashPositions: accountsOf(ids).map((a) => ({
      account: accountRef(a),
      totalBalance: amount(a.cash),
      id: `cash-${a.id}`,
    })),
    withCreditAccount: false,
  } satisfies PositionListResponse;
}

function stockKeyRatios(ids: string[]): StockPositionKeyRatiosResponse {
  return positionsOf(ids)
    .filter((p) => p.inst.type === InstrumentType.Stock)
    .map((p) => {
      const perShare = p.inst.price * (p.inst.yield ?? 0);
      const next = Date.UTC(new Date(NOW).getUTCFullYear() + 1, 3, 10 + (seedOf(p.id) % 18));
      return {
        positionId: p.id,
        yearlyDividend: perShare ? amount(perShare, p.inst.currency) : null,
        relativeYearlyDividend: percent((p.inst.yield ?? 0) * 100),
        dividendsPerYear: perShare ? 1 : null,
        nextDividendDate: perShare ? new Date(next).toISOString().slice(0, 10) : null,
        nextDividend: perShare ? amount(perShare, p.inst.currency) : null,
        yieldOnCost: percent(perShare ? (perShare / p.averagePrice) * 100 : 0),
        priceEarnings: p.inst.pe ? amount(p.inst.pe, "x") : null,
        priceSales: amount((p.inst.pe ?? 20) / 7, "x"),
        priceBookRatio: amount((p.inst.pe ?? 20) / 5.5, "x"),
        turnoverPerShare: null,
        equityPerShare: null,
        earningsPerShare: p.inst.pe ? amount(p.inst.price / p.inst.pe, p.inst.currency) : null,
        beta: amount(0.7 + (seedOf(p.id) % 60) / 100, "x"),
      };
    });
}

// —— Totals and performance ————————————————————————————————————————————

const PERIODS = {
  TODAY: 0,
  ONE_WEEK: 7,
  ONE_MONTH: 30,
  THREE_MONTHS: 91,
  THIS_YEAR: -1,
  ONE_YEAR: 365,
  THREE_YEARS: 3 * 365,
  FIVE_YEARS: 5 * 365,
  ALL_TIME: Infinity,
} as const;
type Period = keyof typeof PERIODS;

/** Index into DAYS where `period` starts. */
function periodStart(period: Period) {
  const days = PERIODS[period];
  if (days === -1) return nearest(Date.UTC(new Date(NOW).getUTCFullYear(), 0, 1) - DAY);
  if (days === Infinity) return 0;
  return nearest(NOW - Math.max(days, 1) * DAY);
}

const todayChange = (ids: string[]) => positionsOf(ids).reduce((s, p) => s + p.today, 0);

function development(ids: string[], period: Period) {
  const total = totalOf(ids);
  if (period === "TODAY") {
    const change = todayChange(ids);
    return { absolute: amount(change), relative: percent((change / (total - change)) * 100) };
  }
  const i0 = periodStart(period);
  const growth = INDEX[DAYS.length - 1] / INDEX[i0];
  return {
    absolute: amount(total - total / growth),
    relative: percent((growth - 1) * 100),
  };
}

function totalValues(ids: string[]): TotalValuesResponse {
  const money = (value: number) => amount(value);
  const totalValue = (accounts: DemoAccount[]) => {
    const ids = accounts.map((a) => a.id);
    const cash = accounts.reduce((s, a) => s + a.cash, 0);
    return {
      totalValue: money(totalOf(ids)),
      positionValue: money(totalOf(ids) - cash),
      balanceOnTradingAccounts: money(cash),
      balanceOnSavingsAccounts: money(0),
      accruedInterest: money(0),
      accruedCreditInterest: money(0),
      accruedDebitInterest: money(0),
      forwardBalance: money(cash),
      currencyBalances: [{ balance: money(cash) }],
    };
  };
  const buyingPower = (accounts: DemoAccount[]) => {
    const cash = accounts.reduce((s, a) => s + a.cash, 0);
    return {
      total: money(cash),
      totalExcludingCredit: money(cash),
      balanceOnTradableAccounts: money(cash),
      currentOrders: money(0),
      availableCredit: money(0),
      totalMarginRequirement: money(0),
      forwardResult: money(0),
      grossExposureLimit: money(0),
      grossExposure: money(0),
      negativeAccruedInterest: money(0),
      currencyBalances: [{ balance: money(cash) }],
    };
  };
  const accounts = accountsOf(ids);
  return {
    totalValue: totalValue(accounts),
    totalDevelopment: Object.fromEntries(
      (Object.keys(PERIODS) as Period[]).map((p) => [p, development(ids, p)]),
    ),
    buyingPower: buyingPower(accounts),
    hasCredit: false,
    accounts: accounts.map((a) => ({
      info: { ...accountRef(a), discretionaryPortfolio: false },
      isTradable: true,
      totalValue: totalValue([a]),
      buyingPower: buyingPower([a]),
      overdrawn: [],
      overmortgaged: null,
    })),
  };
}

/** Intraday points (every 5 minutes since 09:00) that end on today's change. */
function intraday(seed: number, endRatio: number) {
  const open = new Date(NOW);
  open.setHours(9, 0, 0, 0);
  const close = new Date(NOW);
  close.setHours(17, 30, 0, 0);
  const end = Math.min(NOW, close.getTime());
  const times: number[] = [];
  for (let t = open.getTime(); t <= end; t += 5 * 60_000) times.push(t);
  if (times.length < 2) times.push(open.getTime() + 5 * 60_000);
  const r = rng(seed);
  const walk = [0];
  for (let i = 1; i < times.length; i++) walk.push(walk[i - 1] + (r() - 0.5) * 0.0016);
  const last = walk.at(-1)!;
  // A bridge: the noise, tilted so the last point lands on today's change.
  return times.map((t, i) => ({
    t,
    ratio: walk[i] - (last * i) / (times.length - 1) + (endRatio * i) / (times.length - 1),
  }));
}

function chartFromRange(
  ids: string[],
  i0: number,
  i1: number,
  period: string,
): PerformanceChartResponse {
  const share = totalOf(ids) / totalOf();
  const points = DAYS.slice(i0, i1 + 1).map((t, k) => {
    const i = i0 + k;
    const value = VALUES[i] * share;
    return {
      timestamp: t,
      // What the period's starting value earned; deposits since then are not development.
      absolute: VALUES[i0] * share * (INDEX[i] / INDEX[i0] - 1),
      relative: (INDEX[i] / INDEX[i0] - 1) * 100,
      value,
    };
  });
  return chart(points, DAYS[i0], DAYS[i1], period);
}

function chart(
  points: { timestamp: number; absolute: number; relative: number; value: number }[],
  from: number,
  to: number,
  period: string,
): PerformanceChartResponse {
  return {
    interval: {
      from: new Date(from).toISOString().slice(0, 10),
      to: new Date(to).toISOString().slice(0, 10),
      timePeriod: period,
    },
    timePeriod: period,
    absoluteSeries: points.map((p) => ({
      timestamp: p.timestamp,
      performance: amount(p.absolute),
    })),
    relativeSeries: points.map((p) => ({
      timestamp: p.timestamp,
      performance: percent(p.relative),
    })),
    valueSeries: points.map((p) => ({ timestamp: p.timestamp, performance: amount(p.value) })),
    earliestAvailableDate: new Date(DAYS[0]).toISOString().slice(0, 10),
  };
}

function performanceChart(req: DemoRequest): PerformanceChartResponse {
  const body = (req.body ?? {}) as { timePeriod?: Period; from?: string; to?: string };
  const ids = idsFrom(req.body);
  if (body.from) {
    const i0 = nearest(Date.parse(body.from));
    const i1 = nearest(Date.parse(body.to ?? TODAY));
    return chartFromRange(ids, i0, i1, "CUSTOM");
  }
  const period = body.timePeriod ?? "ONE_YEAR";
  if (period === "TODAY") {
    const total = totalOf(ids);
    const change = todayChange(ids);
    const start = total - change;
    const points = intraday(seedOf(`today-${ids}`), change / start).map(({ t, ratio }) => ({
      timestamp: t,
      absolute: start * ratio,
      relative: ratio * 100,
      value: start * (1 + ratio),
    }));
    return chart(points, NOW, NOW, period);
  }
  return chartFromRange(ids, periodStart(period), DAYS.length - 1, period);
}

/** Relative development (percent units) over `from…to` for anything to compare with. */
function relativeSeries(seed: string, ytd: number, from: string, to: string) {
  const year = Date.UTC(new Date(NOW).getUTCFullYear(), 0, 1);
  const index = shapedIndex(
    seedOf(seed),
    [
      [year - DAY, 1.55 / ytd],
      [DAYS[DAYS.length - 1], 1.55],
    ],
    0.01,
  );
  const i0 = nearest(Date.parse(from));
  const i1 = nearest(Date.parse(to));
  return DAYS.slice(i0, i1 + 1).map((t, k) => ({
    timestamp: t,
    performance: {
      value: round((index[i0 + k] / index[i0] - 1) * 100, 2),
      unit: "percentage",
      unitType: "PERCENTAGE",
    },
  }));
}

/** This year's return of things the portfolio is compared with. */
// OMXS30 at +11,2 % matches the assistant's showcase answer (chat-showcase.ts).
const BENCHMARK_YTD: Record<string, number> = {
  "19002": 1.112,
  "18988": 1.098,
  "18985": 1.121,
  "18990": 1.164,
};

// —— Year summaries and insights ————————————————————————————————————————

const yearRange = (year: number) => {
  const i0 = nearest(Date.UTC(year, 0, 1) - DAY);
  const i1 = nearest(Math.min(Date.UTC(year, 11, 31), NOW));
  return { i0, i1 };
};

function yearSummary(year: number): YearSummaryResponse {
  const { i0, i1 } = yearRange(year);
  const r = rng(seedOf(`year-${year}`));
  const inYear = (type: string) =>
    TRANSACTIONS.filter((t) => t.type === type && t.date.startsWith(String(year))).reduce(
      (s, t) => s + (t.amount?.value ?? 0),
      0,
    );
  const deposits = inYear("DEPOSIT");
  const dividends = inYear("DIVIDEND");
  const startValue = year === 2020 ? 0 : VALUES[i0];
  const currentValue = VALUES[i1];
  const growth = INDEX[i1] / INDEX[i0] - 1;
  const securities = POSITIONS.filter(
    (p, i, all) => all.findIndex((q) => q.orderbookId === p.orderbookId) === i,
  ).map((p) => ({
    orderbookId: p.orderbookId,
    instrumentName: p.inst.name,
    // Swings around the year's return, so the best and worst lists differ every year.
    development: round((growth + (r() - 0.45) * 0.6) * p.value, 0),
    flagCode: p.inst.country,
    currentVolume: p.volume,
  }));
  securities.sort((a, b) => b.development - a.development);
  const days = DAYS.slice(i0 + 1, i1 + 1).map((t, k) => ({
    day: new Date(t).toISOString().slice(0, 10),
    performanceInCash: round(VALUES[i0 + k + 1] - VALUES[i0 + k], 0),
  }));
  const ranked = [...days].sort((a, b) => b.performanceInCash - a.performanceInCash);
  const blank = { day: `${year}-01-02`, performanceInCash: 0 };
  return {
    development: {
      currentValue,
      startValue,
      totalChange: currentValue - startValue - deposits,
      totalDevelopment: round(growth * 100, 2),
      totalDeposits: deposits,
      totalOtherFees: -round(currentValue * 0.0009, 0),
      totalDividends: dividends,
      totalTjpDeposits: 0,
      averageDepositsPerMonth: round(deposits / 12, 0),
      suggestedAdditionalSavingPerMonth: 1000,
      bestSecurities: securities.slice(0, 3),
      worstSecurities: securities.slice(-3).reverse(),
    },
    numberOfTransactionsView: {
      numberOfUniqueSecurities: securities.length,
      numberOfTransactions: TRANSACTIONS.filter((t) => t.date.startsWith(String(year))).length,
    },
    performanceDto: {
      bestDay: ranked[0] ?? blank,
      nextBestDay: ranked[1] ?? blank,
      thirdBestDay: ranked[2] ?? blank,
      worstDay: ranked.at(-1) ?? blank,
      performanceForPeriod: round(growth * 100, 2),
      performanceAllCustomers: round(growth * 100 - 2.4 + r() * 2, 2),
      performanceOMXS30: round(growth * 100 - 3.1 + r() * 3, 2),
      performanceDJUSA: round(growth * 100 - 1.5 + r() * 4, 2),
      monthlyPerformance: Array.from({ length: 12 }, (_, m) => {
        const from = nearest(Date.UTC(year, m, 1) - DAY);
        const to = nearest(Math.min(Date.UTC(year, m + 1, 0), NOW));
        return {
          month: m + 1,
          performanceInCash: Date.UTC(year, m, 1) > NOW ? 0 : round(VALUES[to] - VALUES[from], 0),
        };
      }),
    },
  };
}

function insights(req: DemoRequest): InsightsReport {
  const body = (req.body ?? {}) as { timePeriod?: string; accountIds?: string[] };
  const period = (
    body.timePeriod === "THREE_YEARS_ROLLING" ? "THREE_YEARS" : (body.timePeriod ?? "THIS_YEAR")
  ) as Period;
  const ids = body.accountIds ?? [];
  const i0 = periodStart(period);
  const from = new Date(DAYS[i0]).toISOString().slice(0, 10);
  const growth = INDEX[DAYS.length - 1] / INDEX[i0] - 1;
  const r = rng(seedOf(`insights-${period}`));
  const byType = new Map<
    string,
    InsightsReport["developmentResponse"]["instruments"][number]["positions"][number][]
  >();
  for (const p of positionsOf(ids)) {
    const own = growth + (r() - 0.45) * (period === "TODAY" ? 0.04 : 0.5);
    const startValue = p.value / (1 + own);
    const dividends = transactionsOf({ from, isin: p.inst.isin, types: ["DIVIDEND"] }).reduce(
      (s, t) => s + (t.amount?.value ?? 0),
      0,
    );
    const dev = p.value - startValue;
    const total = dev + dividends;
    const list = byType.get(p.inst.type) ?? [];
    list.push({
      isin: p.inst.isin,
      shortName: p.inst.ticker,
      link: {
        orderbookId: p.inst.orderbookId,
        type: p.inst.type,
        flagCode: p.inst.country,
        urlDisplayName: p.inst.name,
        linkDisplay: p.inst.name,
        shortLinkDisplay: p.inst.ticker,
        tradeable: true,
        sellable: true,
        buyable: true,
      },
      currentPosition: p.volume,
      startValue,
      endValue: p.value,
      outcome: {
        total,
        development: dev,
        dividends,
        totalDevelopmentInPercent: (total / startValue) * 100,
        developmentPartOfTotalDevelopmentInPercent: total ? (dev / total) * 100 : 100,
        dividendsPartOfTotalDevelopmentInPercent: total ? (dividends / total) * 100 : 0,
        stake: startValue,
        totalTurnover: 0,
        totalBuyAmount: 0,
        totalSellAmount: 0,
        totalOtherAmount: 0,
        transactions: [],
        transactionTotals: [],
      },
    });
    byType.set(p.inst.type, list);
  }
  const names: Record<string, string> = {
    STOCK: "Aktier",
    FUND: "Fonder",
    EXCHANGE_TRADED_FUND: "ETF:er",
  };
  const sum = (ps: { outcome: { total: number; development: number; dividends: number } }[]) => ({
    total: ps.reduce((s, p) => s + p.outcome.total, 0),
    development: ps.reduce((s, p) => s + p.outcome.development, 0),
    dividends: ps.reduce((s, p) => s + p.outcome.dividends, 0),
  });
  const instruments = [...byType].map(([type, positions]) => ({
    instrumentType: type,
    instrumentDisplayName: names[type] ?? type,
    outcome: sum(positions),
    positions,
  }));
  const all = instruments
    .flatMap((g) => g.positions)
    .sort((a, b) => b.outcome.total - a.outcome.total);
  const group = (positions: typeof all) => [
    { instrumentType: "ALL", instrumentDisplayName: "Alla", outcome: sum(positions), positions },
  ];
  const startValue = all.reduce((s, p) => s + p.startValue, 0);
  const currentValue = all.reduce((s, p) => s + p.endValue, 0);
  return {
    fromDate: from,
    toDate: TODAY,
    totalDevelopment: { startValue, currentValue, totalChange: currentValue - startValue },
    developmentResponse: {
      totalOutcome: sum(all),
      totalOutcomeForUnknownDevelopments: { total: 0, development: 0, dividends: 0 },
      hasUnlistedInstrument: false,
      instruments,
      bestAndWorst: {
        bestPositions: group(all.slice(0, 5)),
        worstPositions: group(all.slice(-5).reverse()),
      },
      unknownPositionDevelopments: [],
      chartData: [],
    },
    transactionsResponse: {
      totalAll: 0,
      totalDeposits: 0,
      totalWithdraws: 0,
      totalAutogiro: 0,
      allTransactions: [],
      chartData: [],
    },
    otherTransactions: { total: 0, otherTransactionsGroups: [] },
  };
}

// —— Dividends ————————————————————————————————————————————————————

const orderbookOf = (p: (typeof POSITIONS)[number]) => ({
  id: p.inst.orderbookId,
  flagCode: p.inst.country,
  name: p.inst.name,
  marketplace: p.inst.marketplace,
  type: p.inst.type,
  currency: p.inst.currency,
  isin: p.inst.isin,
  volumeFactor: 1,
});

function paidDividends(ids: string[]): DividendsResponse {
  return transactionsOf({ types: ["DIVIDEND"], accountIds: ids }).map((t) => {
    const perShare = t.priceInTradedCurrency?.value ?? 0;
    const currency = t.orderbook?.currency ?? "SEK";
    const fx = FX[currency as keyof typeof FX] ?? 1;
    return {
      isin: t.isin ?? "",
      date: t.date,
      instrumentName: t.instrumentName ?? "",
      orderbook: t.orderbook,
      accountId: t.account.id,
      encryptedAccountId: t.account.id,
      volume: t.volume?.value ?? 0,
      amount: { value: (t.amount?.value ?? 0) / fx, currency },
      amountInSek: t.amount?.value ?? 0,
      amountPerShare: { value: perShare, currency },
      amountPerShareInSek: perShare * fx,
      transactionCurrency: currency,
      currencyRate: fx,
      stockRedemptionPayment: false,
    };
  });
}

function upcomingDividends(ids: string[]): UpcomingDividendsResponse {
  const year = new Date(NOW).getUTCFullYear();
  const plan: [string, number, string][] = [
    // orderbookId, payment date, status
    ["3873", NOW + 13 * DAY, "CONFIRMED"],
    ["5247", NOW + 9 * DAY, "CONFIRMED"],
    ["5241", Date.UTC(year + 1, 2, 31), "PRELIMINARY"],
    ["5269", Date.UTC(year + 1, 3, 14), "PRELIMINARY"],
    ["5234", Date.UTC(year + 1, 3, 30), "PRELIMINARY"],
    ["5271", Date.UTC(year + 1, 4, 5), "PRELIMINARY"],
    ["5260", Date.UTC(year + 1, 3, 9), "PRELIMINARY"],
    ["5568", Date.UTC(year + 1, 4, 12), "PRELIMINARY"],
  ];
  return plan.flatMap(([id, date, status]) =>
    positionsOf(ids)
      .filter((p) => p.orderbookId === id)
      .map((p) => {
        const perShare = round(
          (p.inst.price * (p.inst.yield ?? 0.02)) / (id === "3873" ? 4 : id === "5247" ? 2 : 1),
          2,
        );
        const fx = FX[p.inst.currency];
        const day = (t: number) => new Date(t).toISOString().slice(0, 10);
        return {
          isin: p.inst.isin,
          date: day(date),
          exDate: day(date - 4 * DAY),
          status,
          instrumentName: p.inst.name,
          orderbook: orderbookOf(p),
          accountId: p.accountId,
          encryptedAccountId: p.accountId,
          volume: p.volume,
          amount: { value: p.volume * perShare, currency: p.inst.currency },
          amountInSek: p.volume * perShare * fx,
          amountPerShare: { value: perShare, currency: p.inst.currency },
          amountPerShareInSek: perShare * fx,
        };
      }),
  );
}

function transactionList(req: DemoRequest): TransactionListResponse {
  const q = req.query;
  const filter = {
    from: q.get("from"),
    to: q.get("to"),
    accountIds: q.getAll("accountIds"),
    types: q.getAll("transactionTypes"),
    isin: q.get("isin"),
  };
  const transactions = transactionsOf(filter);
  return {
    transactions,
    transactionsAfterFiltering: transactions.length,
    transactionsFilter: {
      accountIds: filter.accountIds.length ? filter.accountIds : null,
      transactionTypes: filter.types.length ? filter.types : null,
      isin: filter.isin,
      dateRange: { from: filter.from ?? TRANSACTIONS.at(-1)!.date, to: filter.to ?? TODAY },
      includeCancelled: false,
      includeClosedAccounts: false,
    },
    firstTransactionDate: TRANSACTIONS.at(-1)!.date,
  };
}

// —— Orders ——————————————————————————————————————————————————————————

/** An order or deal in the shape loose-records.ts reads (orderbook, account, side, price, volume). */
function order(
  id: string,
  orderbookId: string,
  side: "BUY" | "SELL",
  price: number,
  volume: number,
  extra = {},
) {
  const p = POSITIONS.find((q) => q.orderbookId === orderbookId)!;
  return {
    id,
    orderId: id,
    orderbook: {
      id: p.inst.orderbookId,
      name: p.inst.name,
      type: p.inst.type,
      currency: p.inst.currency,
    },
    account: { id: p.account.id, name: p.account.name, urlParameterId: p.account.id },
    side,
    price,
    volume,
    ...extra,
  };
}

const today = (h: number, m: number) => {
  const t = new Date(NOW);
  t.setHours(h, m, 0, 0);
  return t.toISOString();
};

// Open limit orders sit off the price, so the price ladder shows them above and below the market.
const OPEN_ORDERS = [
  order("ord-1", "5260", "SELL", 545, 60, {
    originalVolume: 60,
    state: "ACTIVE",
    created: today(9, 12),
    validUntil: TODAY,
  }),
  order("ord-2", "5269", "BUY", 262, 100, {
    originalVolume: 100,
    state: "ACTIVE",
    created: today(10, 41),
    validUntil: TODAY,
  }),
];
const DEALS = [order("deal-1", "5234", "BUY", 169.8, 20, { dealTime: today(9, 3) })];
const STOP_LOSSES = [
  {
    id: "sl-1",
    status: "ACTIVE",
    editable: true,
    deletable: true,
    account: { id: "9001003", urlParameterId: "9001003" },
    orderbook: { id: "4478", name: "NVIDIA", currency: "USD" },
    order: { type: "sell", price: 1, priceType: "PERCENTAGE", volume: 140, validDays: 8 },
    trigger: {
      type: "FOLLOW_DOWNWARDS",
      value: 8,
      valueType: "PERCENTAGE",
      validUntil: new Date(NOW + 30 * DAY).toISOString().slice(0, 10),
    },
  },
];

export const accountRoutes: Route[] = [
  get(/^\/_api\/authentication\/session\/info\/session$/, () => ({
    invalidSessionId: "",
    isContextVerifiedWithBackend: true,
    user: {
      company: false,
      customerGroup: "PRIVATE",
      greetingName: "Alex",
      id: "1000001",
      loggedIn: true,
      minor: false,
      pushBaseUrl: "https://www.avanza.se/_push",
      pushSubscriptionId: "demo",
      securityToken: "demo",
      start: false,
    },
  })),

  get(/^\/_api\/position-data\/positions(?:\/(\w+))?$/, (_r, m) => positionList(pathAccount(m))),
  get(/^\/_api\/position-data\/STOCK\/keyratios(?:\/(\w+))?$/, (_r, m) =>
    stockKeyRatios(pathAccount(m)),
  ),
  post(/^\/_api\/portfolio-analysis\/analyze$/, (): FundAnalysisResponse => FUND_ANALYSIS),

  post(/^\/_api\/account-performance\/overview\/total-values$/, (r) =>
    totalValues(idsFrom(r.body)),
  ),
  post(
    /^\/_api\/account-performance\/overview\/chart\/accounts\/timeperiod(?:_custom)?$/,
    performanceChart,
  ),
  post(/^\/_api\/account-performance\/overview\/keyratios$/, (): KeyRatiosResponse => ({
    sharpeRatio: amount(1.21, "x"),
    standardDeviation: percent(13.8),
    compoundAnnualGrowthRate: percent(11.9),
  })),
  post(/^\/_api\/insights-development\/insights$/, insights),
  post(
    /^\/_api\/account-performance-analysis\/avanza\/average$/,
    (r): AverageCustomerChartResponse => {
      const { from, to } = r.body as { from: string; to: string };
      return {
        interval: { from, to, timePeriod: "CUSTOM" },
        absoluteSeries: [],
        relativeSeries: relativeSeries("average", 1.087, from, to),
        valueSeries: [],
        earliestAvailableDate: new Date(DAYS[0]).toISOString().slice(0, 10),
      };
    },
  ),
  post(
    /^\/_api\/account-performance-analysis\/chart\/orderbook$/,
    (r): OrderbookPerformanceChart[] => {
      const { orderbookIds, fromDate, toDate } = r.body as {
        orderbookIds: string[];
        fromDate: string;
        toDate: string;
      };
      return orderbookIds.map((id) => ({
        orderbookId: id,
        relativeSeries: relativeSeries(`ob-${id}`, BENCHMARK_YTD[id] ?? 1.08, fromDate, toDate),
      }));
    },
  ),

  get(/^\/_api\/yearly-summary\/accounts$/, () => ({
    scrambledAccountIds: ACCOUNTS.map((a) => ({ id: a.id })),
  })),
  post(/^\/_api\/yearly-summary\/development\/performance$/, (r) =>
    yearSummary((r.body as { year: number }).year),
  ),

  get(/^\/_api\/transactions\/list$/, transactionList),
  get(/^\/_api\/transactions\/dividends(?:\/(\w+))?$/, (_r, m) => paidDividends(pathAccount(m))),
  get(/^\/_api\/account-company-events\/dividends\/upcoming(?:\/(\w+))?$/, (_r, m) =>
    upcomingDividends(pathAccount(m)),
  ),

  get(/^\/_api\/trading\/rest\/orders$/, () => ({
    orders: OPEN_ORDERS,
    fundOrders: [],
    cancelledOrders: [],
  })),
  get(/^\/_api\/trading\/rest\/deals$/, () => ({ deals: DEALS, fundDeals: [] })),
  get(/^\/_api\/trading\/stoploss$/, () => STOP_LOSSES),
  get(/^\/_api\/superloan\/creditinfo\/\w+$/, (): CreditInfoResponse => ({ creditInfos: [] })),
];
