import type {
  AnalystRecommendations,
  BrokerTradeSummary,
  CompanyEvent,
  EtfDetailsResponse,
  EtfResponse,
  ForumStatsResponse,
  FundChartResponse,
  FundGuide,
  InsiderTradesResponse,
  MarketplaceStatus,
  MarketTrade,
  MorningstarAnalysisResponse,
  NumberOfOwnersResponse,
  Ohlc,
  OrderDepth,
  PriceChartResponse,
  PriceTargets,
  SectorAnalysis,
  ShortSellingResponse,
  StockAnalysis,
  StockInfo,
  StockQuote,
  TradingOrderbook,
} from "avanza-ts";

import { InstrumentType } from "@/lib/avanza/codes";
import type { StockDetails } from "@/lib/avanza/stock-details";

import {
  analystUpside,
  closeAgo,
  daily,
  findInstrument,
  historicalClosingPrices,
  intraday,
  lastSession,
  owners,
  ownersChangeWeek,
  pick,
  prevClose,
  type Priced,
  returnOver,
  roundToTick,
  tickSize,
  volumeToday,
  weekday,
} from "./market-data";
import { rng, round, seedOf } from "./random";
import { type DemoRequest, get, type Route } from "./route";
import type { DemoInstrument } from "./universe";

// One instrument's pages: stock guide, quote, depth, trades, charts, analysis and fund guide.

const DAY = 86_400_000;
const iso = (t: number) => new Date(t).toISOString();
const date = (t: number) => iso(t).slice(0, 10);

// shortcut: an unknown id throws (the app sees a failed request, not a 404); route.ts has no way
// to answer a status yet. Fine while every id the demo shows is in the universe.
const need = (id: string) => {
  const i = findInstrument(id);
  if (!i) throw new Error(`[demo] unknown orderbook ${id}`);
  return i;
};

export function marketplace(i: Priced): MarketplaceStatus {
  const s = lastSession(i);
  const opening = new Date(s.start).toLocaleTimeString("sv-SE", { timeZone: s.tz });
  const closing = new Date(s.closeAt).toLocaleTimeString("sv-SE", { timeZone: s.tz });
  return {
    marketOpen: s.open,
    timeLeftMs: s.open ? s.closeAt - Date.now() : 0,
    openingTime: opening,
    todayClosingTime: closing,
    normalClosingTime: closing,
    currentStatus: s.open ? "OPEN" : "CLOSED",
    marketStateSchedule: [],
  };
}

export function quote(i: DemoInstrument): StockQuote {
  const tick = tickSize(i);
  const day = intraday(i, 1, 1).map((p) => p.price);
  const volume = volumeToday(i);
  const s = lastSession(i);
  return {
    buy: roundToTick(i, i.price),
    sell: roundToTick(i, i.price + tick),
    last: i.price,
    highest: round(Math.max(...day), 2),
    lowest: round(Math.min(...day), 2),
    change: round(i.price - prevClose(i), 2),
    changePercent: round(i.change * 100, 2),
    spread: round((tick / i.price) * 100, 2),
    timeOfLast: s.end,
    totalValueTraded: Math.round(volume * i.price),
    totalVolumeTraded: volume,
    updated: s.end,
    volumeWeightedAveragePrice: round(day.reduce((a, b) => a + b, 0) / day.length, 2),
    isRealTime: true,
  };
}

const listing = (i: DemoInstrument) => ({
  shortName: i.ticker,
  tickerSymbol: i.ticker,
  countryCode: i.country,
  currency: i.currency,
  marketPlaceCode: i.country === "US" ? "XNAS" : "XSTO",
  marketPlaceName: i.marketplace,
  tickSizeListId: "demo",
  marketTradesAvailable: true,
  marketListName: i.marketCap > 10e9 ? "Large Cap Stockholm" : "Mid Cap Stockholm",
});

/** A report date within the next weeks, and the last one a quarter before it. */
const nextReport = (i: DemoInstrument) =>
  weekday(Date.now() + Math.round(pick(i.orderbookId, "report", 2, 80)) * DAY);
const nextExDate = (i: DemoInstrument) =>
  weekday(Date.now() + Math.round(pick(i.orderbookId, "exdate", 20, 200)) * DAY);

function stock(i: DemoInstrument): StockInfo {
  const dividendAmount = round((i.price * (i.yield ?? 0)) / 1, 2);
  const exDate = nextExDate(i);
  const report = nextReport(i);
  return {
    orderbookId: i.orderbookId,
    name: i.name,
    isin: i.isin,
    instrumentId: `i${i.orderbookId}`,
    type: InstrumentType.Stock,
    tradable: "BUYABLE_AND_SELLABLE",
    // Most specific first; the heatmap groups by the last (broadest).
    sectors: [{ sectorId: seedOf(i.sector).toString(), sectorName: i.sector }],
    listing: listing(i),
    marketPlace: marketplace(i),
    historicalClosingPrices: historicalClosingPrices(i),
    keyIndicators: {
      numberOfOwners: owners(i),
      reportDate: date(weekday(report - 91 * DAY)),
      volatility: round(pick(i.orderbookId, "vola", 18, 42), 2),
      beta: round(pick(i.orderbookId, "beta", 0.6, 1.5), 2),
      priceEarningsRatio: i.pe,
      priceSalesRatio: round(pick(i.orderbookId, "ps", 0.8, 7), 2),
      priceBookRatio: round(pick(i.orderbookId, "pb", 1.1, 9), 2),
      evEbitRatio: round((i.pe ?? 15) * 0.8, 2),
      directYield: i.yield,
      ordinaryDirectYield: i.yield,
      totalDirectYield: i.yield,
      shortSellingRatio: round(shortRatio(i), 4),
      returnOnEquity: round(pick(i.orderbookId, "roe", 0.08, 0.34), 4),
      returnOnTotalAssets: round(pick(i.orderbookId, "roa", 0.03, 0.14), 4),
      returnOnCapitalEmployed: round(pick(i.orderbookId, "roce", 0.08, 0.3), 4),
      equityRatio: round(pick(i.orderbookId, "eqr", 0.25, 0.6), 4),
      operatingProfitMargin: round(pick(i.orderbookId, "opm", 0.08, 0.28), 4),
      grossMargin: round(pick(i.orderbookId, "gm", 0.25, 0.6), 4),
      netMargin: round(pick(i.orderbookId, "nm", 0.05, 0.22), 4),
      dividendsPerYear: dividendAmount > 0 ? 1 : 0,
      marketCapital: { value: i.marketCap, currency: "SEK" },
      earningsPerShare: { value: round(i.price / (i.pe ?? 20), 2), currency: i.currency },
      equityPerShare: { value: round(i.price / 3.2, 2), currency: i.currency },
      ...(dividendAmount > 0 && {
        dividend: {
          exDate: date(exDate),
          paymentDate: date(exDate + 5 * DAY),
          amount: dividendAmount,
          currencyCode: i.currency,
          exDateStatus: "PLANNED",
        },
      }),
      nextReport: { date: date(report), reportType: "INTERIM", isConfirmed: true },
      previousReport: {
        date: date(weekday(report - 91 * DAY)),
        reportType: "INTERIM",
        isConfirmed: true,
      },
    },
    quote: quote(i),
  };
}

// ---- Order book and tape ----

const BROKERS: [string, string][] = [
  ["AVA", "Avanza Bank"],
  ["NON", "Nordnet Bank"],
  ["SHB", "Handelsbanken"],
  ["MSL", "Morgan Stanley"],
  ["JPM", "J.P. Morgan"],
  ["GSI", "Goldman Sachs"],
  ["NDS", "Nordea"],
  ["SEB", "SEB"],
  ["CSB", "Carnegie"],
  ["ABG", "ABG Sundal Collier"],
];

function orderDepth(i: DemoInstrument): OrderDepth {
  const tick = tickSize(i);
  const r = rng(seedOf(`depth:${i.orderbookId}`));
  const base = Math.max(50, Math.round(volumeToday(i) / 400));
  const side = (price: number) => ({
    price: roundToTick(i, price),
    volume: Math.round(base * (0.4 + r() * 2.4)),
    priceString: roundToTick(i, price).toFixed(2),
  });
  return {
    receivedTime: Date.now(),
    levels: Array.from({ length: 10 }, (_, k) => ({
      buySide: side(i.price - k * tick),
      sellSide: side(i.price + (k + 1) * tick),
    })),
  };
}

function trades(i: DemoInstrument): MarketTrade[] {
  const r = rng(seedOf(`tape:${i.orderbookId}`));
  const end = lastSession(i).end;
  const tick = tickSize(i);
  let t = end;
  return Array.from({ length: 60 }, () => {
    t -= Math.round(2_000 + r() * 40_000);
    const [buyer, buyerName] = BROKERS[Math.floor(r() * BROKERS.length)];
    const [seller, sellerName] = BROKERS[Math.floor(r() * BROKERS.length)];
    return {
      buyer,
      buyerName,
      seller,
      sellerName,
      dealTime: t,
      price: roundToTick(i, i.price + Math.round((r() - 0.5) * 4) * tick),
      volume: Math.round(10 + r() ** 3 * 2500),
      matchedOnMarket: true,
      cancelled: false,
    };
  });
}

function brokers(i: DemoInstrument): BrokerTradeSummary[] {
  const total = volumeToday(i);
  const r = rng(seedOf(`brokers:${i.orderbookId}`));
  const shares = BROKERS.map(() => r() ** 2);
  const sum = shares.reduce((a, b) => a + b, 0);
  return BROKERS.map(([brokerCode, brokerName], k) => {
    const volume = (total * shares[k]) / sum;
    const buyVolume = Math.round(volume * (0.3 + r() * 0.4));
    const sellVolume = Math.round(volume - buyVolume);
    return { brokerCode, brokerName, buyVolume, sellVolume, netBuyVolume: buyVolume - sellVolume };
  }).sort((a, b) => b.buyVolume + b.sellVolume - (a.buyVolume + a.sellVolume));
}

// ---- Price charts ----

type Period =
  | "today"
  | "one_week"
  | "one_month"
  | "three_months"
  | "this_year"
  | "one_year"
  | "three_years"
  | "five_years"
  | "infinity";

/** Candles from a close series: each opens at the previous close, with seeded wicks. */
function candles(points: { t: number; price: number }[], seed: string, volume: number): Ohlc[] {
  const r = rng(seedOf(seed));
  return points.slice(1).map((p, k) => {
    const open = points[k].price;
    const wick = Math.abs(p.price - open) * 0.6 + p.price * 0.0015 * r();
    return {
      timestamp: p.t,
      open: round(open, 2),
      close: round(p.price, 2),
      high: round(Math.max(open, p.price) + wick * r(), 2),
      low: round(Math.min(open, p.price) - wick * r(), 2),
      totalVolumeTraded: Math.round(volume * (0.4 + r() * 1.2)),
    };
  });
}

/** Points and resolution for a chart period, like Avanza picks them. */
export function seriesFor(p: Priced, period: Period) {
  const days = daily(p).map((d) => ({ t: d.t, price: d.close }));
  const year = new Date(days.at(-1)!.t).getUTCFullYear();
  switch (period) {
    case "today":
      return { resolution: "minute" as const, points: intraday(p, 1, 1) };
    case "one_week":
      return { resolution: "ten_minutes" as const, points: intraday(p, 5, 10) };
    case "one_month":
      return { resolution: "hour" as const, points: intraday(p, 21, 60) };
    case "three_months":
      return { resolution: "day" as const, points: days.slice(-64) };
    case "this_year":
      return {
        resolution: "day" as const,
        points: days.filter((d) => new Date(d.t).getUTCFullYear() === year || d === days.at(-1)),
      };
    case "one_year":
      return { resolution: "day" as const, points: days.slice(-253) };
    case "three_years":
      return {
        resolution: "week" as const,
        points: days.slice(-757).filter((_, k, a) => (a.length - 1 - k) % 5 === 0),
      };
    case "five_years":
      return {
        resolution: "week" as const,
        points: days.slice(-1261).filter((_, k, a) => (a.length - 1 - k) % 5 === 0),
      };
    default:
      return {
        resolution: "month" as const,
        points: days.filter((_, k, a) => (a.length - 1 - k) % 21 === 0),
      };
  }
}

function priceChart(i: DemoInstrument, req: DemoRequest): PriceChartResponse {
  const period = (req.query.get("timePeriod") ?? "one_year") as Period;
  const { resolution, points } = seriesFor(i, period);
  const perCandle =
    volumeToday(i) /
    (resolution === "minute"
      ? 500
      : resolution.includes("minute") || resolution === "hour"
        ? 50
        : 1);
  // A previous point opens the first candle; for today that's yesterday's close.
  const series =
    period === "today" ? [{ t: points[0].t - 60_000, price: prevClose(i) }, ...points] : points;
  const ohlc = candles(series, `candles:${i.orderbookId}:${period}`, perCandle);
  const ta = Number(req.query.get("ta"));
  if (ta > 0)
    return {
      ...emptyChart(resolution),
      ohlc: candles(
        daily(i)
          .slice(-ta - 1)
          .map((d) => ({ t: d.t, price: d.close })),
        `ta:${i.orderbookId}`,
        perCandle,
      ),
    };
  return {
    ohlc,
    metadata: { resolution: { chartResolution: resolution, availableResolutions: [resolution] } },
    from: date(series[0].t),
    to: date(series.at(-1)!.t),
    previousClosingPrice: round(period === "today" ? prevClose(i) : series[0].price, 2),
  };
}

const emptyChart = (
  resolution: PriceChartResponse["metadata"]["resolution"]["chartResolution"],
): PriceChartResponse => ({
  ohlc: [],
  metadata: { resolution: { chartResolution: resolution, availableResolutions: [resolution] } },
  from: date(Date.now()),
  to: date(Date.now()),
  previousClosingPrice: null,
});

function companyEvents(i: DemoInstrument, req: DemoRequest): CompanyEvent[] {
  const { points } = seriesFor(i, (req.query.get("timePeriod") ?? "one_year") as Period);
  const from = points[0].t;
  // The coming report too: the signals list says "Reports in 3 days".
  const events: CompanyEvent[] = [{ eventType: "INTERIM_REPORT", timestamp: nextReport(i) }];
  // Quarterly reports, and a yearly dividend for payers.
  for (let t = nextReport(i) - 91 * DAY; t > from; t -= 91 * DAY)
    events.push({ eventType: "INTERIM_REPORT", timestamp: t });
  if (i.yield)
    for (
      let t = Date.now() - pick(i.orderbookId, "pastdiv", 30, 300) * DAY;
      t > from;
      t -= 365 * DAY
    )
      events.push({ eventType: "DIVIDEND", timestamp: t });
  return events.sort((a, b) => a.timestamp - b.timestamp);
}

// ---- Analysis and fundamentals ----

const years = () => {
  const y = new Date().getFullYear();
  return [y - 5, y - 4, y - 3, y - 2, y - 1];
};

function stockAnalysis(i: DemoInstrument): StockAnalysis {
  const series = (key: string, latest: number, spread = 0.25) =>
    years().map((financialYear, k) => ({
      reportType: "FULL_YEAR",
      financialYear,
      value: round(
        latest * (1 + (pick(i.orderbookId, `${key}${k}`, -spread, spread) * (4 - k)) / 4),
        4,
      ),
    }));
  const eps = i.price / (i.pe ?? 20);
  const sales = i.marketCap / pick(i.orderbookId, "ps", 0.8, 7) / 1e6;
  const byYear = {
    priceEarningsRatio: series("pe", i.pe ?? 20),
    directYield: series("dy", i.yield ?? 0),
    earningsPerShare: series("eps", eps, 0.4),
    priceSalesRatio: series("psr", pick(i.orderbookId, "ps", 0.8, 7)),
    priceBookRatio: series("pbr", pick(i.orderbookId, "pb", 1.1, 9)),
  };
  const summary = Object.fromEntries(
    Object.entries(byYear).map(([k, s]) => [
      k,
      { latest: s.at(-1)!.value, average: round(s.reduce((a, p) => a + p.value, 0) / s.length, 4) },
    ]),
  );
  const financials = {
    sales: series("sales", sales, 0.3),
    netProfit: series("np", sales * 0.12, 0.5),
  };
  const dividends = { dividend: series("div", round(i.price * (i.yield ?? 0), 2), 0.3) };
  return {
    stockKeyRatiosByYear: byYear,
    stockKeyRatiosByQuarter: {},
    stockKeyRatiosByQuarterTTM: {},
    stockKeyRatiosByQuarterQuarter: {},
    companyKeyRatiosByYear: {},
    companyKeyRatiosByQuarter: {},
    companyKeyRatiosByQuarterTTM: {},
    companyKeyRatiosByQuarterQuarter: {},
    dividendsByYear: dividends,
    companyFinancialsByYear: financials,
    companyFinancialsByQuarter: {},
    companyFinancialsByQuarterTTM: {},
    companyFinancialsByQuarterQuarter: {},
    keyRatiosByYear: summary,
    keyRatiosByQuarter: {},
    keyRatiosByQuarterTTM: {},
    keyRatiosByQuarterQuarter: {},
  };
}

function sectorAnalysis(i: DemoInstrument): SectorAnalysis {
  const indicator = (key: string, label: string, latest: number) => ({
    key,
    label,
    snapshot: {
      latest: round(latest, 2),
      average: round(latest * pick(i.sector, key, 0.85, 1.15), 2),
    },
    historical: [],
  });
  return {
    sectorId: seedOf(i.sector).toString(),
    sectorName: i.sector,
    indicators: [
      indicator("priceEarningsRatio", "P/E", (i.pe ?? 20) * pick(i.sector, "spe", 0.8, 1.2)),
      indicator(
        "directYield",
        "Direktavkastning",
        (i.yield ?? 0.02) * pick(i.sector, "sdy", 0.8, 1.2),
      ),
    ],
  };
}

function recommendations(i: DemoInstrument): AnalystRecommendations {
  const up = analystUpside(i);
  const buy = Math.round(pick(i.orderbookId, "nbuy", 2, 9) * (up > 0.1 ? 1.5 : 0.6));
  const hold = Math.round(pick(i.orderbookId, "nhold", 1, 7));
  const sell = Math.round(pick(i.orderbookId, "nsell", 0, up < 0 ? 5 : 2));
  return {
    date: date(Date.now() - 3 * DAY),
    numberOfOutperform: Math.round(buy / 3),
    numberOfBuy: buy,
    numberOfHold: hold,
    numberOfUnderperform: Math.round(sell / 2),
    numberOfSell: sell,
    consensusAction:
      up > 0.12 ? "BUY" : up > 0.04 ? "OUTPERFORM" : up > -0.04 ? "HOLD" : "UNDERPERFORM",
    industryConsensusAction: "HOLD",
  };
}

function priceTargets(i: DemoInstrument): PriceTargets {
  const avg = i.price * (1 + analystUpside(i));
  return {
    date: date(Date.now() - 3 * DAY),
    lowPriceTarget: round(avg * 0.78, 2),
    averagePriceTarget: round(avg, 2),
    highPriceTarget: round(avg * 1.24, 2),
    numberOfEstimates: Math.round(pick(i.orderbookId, "nest", 6, 24)),
  };
}

function ownersHistory(i: DemoInstrument): NumberOfOwnersResponse {
  const now = owners(i);
  const week = ownersChangeWeek(i);
  const yearAgo = Math.round(now / (1 + week * 6 + pick(i.orderbookId, "own1y", -0.05, 0.2)));
  const weekAgo = Math.round(now / (1 + week));
  const points = Array.from({ length: 53 }, (_, k) => ({
    timestamp: Date.now() - (52 - k) * 7 * DAY,
    // A straight climb to a week ago, then this week's change (trending names jump).
    numberOfOwners: k === 52 ? now : Math.round(yearAgo + ((weekAgo - yearAgo) * k) / 51),
  }));
  const ytd = Math.round((now - yearAgo) * 0.8);
  return {
    ownersPoints: points,
    historySummary: {
      oneYearChange: now - yearAgo,
      oneYearChangePercent: round((now - yearAgo) / yearAgo, 4),
      thisYearChange: ytd,
      thisYearChangePercent: round(ytd / (now - ytd), 4),
    },
  };
}

// Short interest as a ratio of shares; these names are being shorted harder lately.
const SHORTED = new Set(["549768", "5249", "5364"]);
const shortRatio = (i: DemoInstrument) =>
  pick(i.orderbookId, "short", 0.001, 0.018) + (SHORTED.has(i.orderbookId) ? 0.03 : 0);

function shortSelling(i: DemoInstrument): ShortSellingResponse {
  const r = rng(seedOf(`shorts:${i.orderbookId}`));
  const end = shortRatio(i);
  // Shorted names climb 1,5 percentage points over the last two weeks; the rest wander.
  const rise = SHORTED.has(i.orderbookId) ? 0.015 : 0;
  return {
    shortSellingHistory: Array.from({ length: 60 }, (_, k) => ({
      timestamp: Date.now() - (59 - k) * DAY,
      ratio: round(Math.max(0, end - rise * Math.min(1, (59 - k) / 14) + (r() - 0.5) * 0.0008), 4),
    })),
  };
}

const INSIDERS = [
  ["Anna Lindqvist", "VD"],
  ["Johan Berg", "Finanschef"],
  ["Maria Ekström", "Styrelseledamot"],
  ["Erik Holm", "Styrelseordförande"],
];

function insiderTrades(i: DemoInstrument): InsiderTradesResponse {
  const r = rng(seedOf(`insiders:${i.orderbookId}`));
  // About half the names have insider trades lately, each on its own days.
  const count = pick(i.orderbookId, "hasinsiders", 0, 1) < 0.45 ? Math.round(1 + r() * 3) : 0;
  const first = Math.round(pick(i.orderbookId, "insiderday", 1, 22));
  const transactions = Array.from({ length: count }, (_, k) => {
    const buy = r() > 0.3;
    const quantity = Math.round(500 + r() * 9000);
    const price = round(closeAgo(i, first + k * 6), 2);
    const when = date(weekday(Date.now() - (first + k * 6) * DAY));
    const [insiderName, insiderPosition] = INSIDERS[k % INSIDERS.length];
    return {
      orderbookId: i.orderbookId,
      ticker: i.ticker,
      instrumentType: "STOCK",
      instrumentDescription: null,
      marketCountryCode: i.country,
      insiderName,
      insiderPosition,
      owner: null,
      newHolder: null,
      transactionType: buy ? "BUY" : "SELL",
      transactionDate: when,
      reportedDate: when,
      price,
      quantity: buy ? quantity : -quantity,
      totalValue: round((buy ? 1 : -1) * quantity * price, 0),
      currency: i.currency,
      ownershipChangeFraction: null,
      marketTransaction: true,
      equityProgram: false,
      aggregatedTransaction: false,
    };
  });
  const sum = (buy: boolean) => transactions.filter((t) => t.totalValue > 0 === buy);
  return {
    transactions,
    source: "Finansinspektionen",
    buyCount: sum(true).length,
    buyTotalValue: sum(true).reduce((a, t) => a + t.totalValue, 0),
    sellCount: sum(false).length,
    sellTotalValue: sum(false).reduce((a, t) => a + t.totalValue, 0),
    allocationTotalValue: 0,
  };
}

function forumStats(i: DemoInstrument): ForumStatsResponse {
  const r = rng(seedOf(`forum:${i.orderbookId}`));
  const trend = (period: string) => ({
    holdingsPercentage: round(r() * 0.2, 4),
    trend: r() > 0.4 ? "BUY" : "SELL",
    period,
    points: Array.from({ length: 7 }, (_, k) => ({
      timestamp: Date.now() - (6 - k) * DAY,
      buy: Math.round(r() * 80),
      sell: Math.round(r() * 50),
    })),
  });
  const hot = ownersChangeWeek(i) > 0.02;
  return {
    url: `https://forum.placera.se/${i.ticker.toLowerCase().replace(/ /g, "-")}`,
    newPosts: Math.round((hot ? 180 : 20) + r() * 120),
    newReplies: Math.round(r() * 400),
    newFollowers: Math.round(r() * 300),
    authorCount: Math.round(40 + r() * 300),
    newOwners: Math.round(owners(i) * ownersChangeWeek(i)),
    posts: Array.from({ length: 7 }, (_, k) => ({
      timestamp: Date.now() - (6 - k) * DAY,
      value: Math.round(r() * 60),
    })),
    memberTrend: trend("WEEK"),
    topMemberTrend: trend("WEEK"),
  };
}

function morningstar(i: DemoInstrument): MorningstarAnalysisResponse {
  if (i.country === "US" || i.marketCap < 150e9) return { morningstar: null };
  return {
    morningstar: {
      documentUrl: "https://www.morningstar.com",
      documentId: `ms-${i.orderbookId}`,
      documentPublishedDate: date(Date.now() - 12 * DAY),
      fairValue: {
        financialValue: round(i.price * (1 + analystUpside(i) * 0.8), 0).toString(),
        currency: i.currency,
        published: date(Date.now() - 12 * DAY),
      },
      moat: { value: i.marketCap > 400e9 ? "Wide" : "Narrow" },
      bullBear: {
        bulls: [
          `${i.name} has pricing power in its core markets.`,
          "Strong balance sheet leaves room for buybacks.",
        ],
        bears: [
          "Demand is cyclical and order intake has slowed.",
          "Currency swings weigh on reported margins.",
        ],
        published: date(Date.now() - 12 * DAY),
        author: { byLine: "Morningstar Equity Research", jobTitle: "Equity Analyst" },
      },
    },
  };
}

const ABOUT: Record<string, string> = {
  Industri: "makes machines, vehicles and equipment for industrial customers around the world",
  Finans: "offers banking, investment and financial services to private and corporate customers",
  Teknik: "builds technology, software and services used by businesses and consumers",
  Telekom: "runs telecom networks and connectivity services",
  Hälsovård: "researches, develops and sells medicines and healthcare products",
  Sällanköpsvaror: "sells consumer products and experiences to customers in many countries",
  Material: "mines and refines raw materials for industry",
  Dagligvaror: "makes everyday hygiene and health products",
};

function stockDetails(i: DemoInstrument): StockDetails {
  const exDate = nextExDate(i);
  const amount = round(i.price * (i.yield ?? 0), 2);
  const year = new Date().getFullYear();
  return {
    company: {
      description: `${i.name} ${ABOUT[i.sector] ?? "is a listed company"}. The company is listed on ${i.marketplace} and has operations in more than 100 countries.`,
      ceo: INSIDERS[0][0],
      chairman: INSIDERS[3][0],
      homepage: `https://www.${i.name
        .toLowerCase()
        .split(" ")[0]
        .replace(/[^a-z]/g, "")}.com`,
      totalNumberOfShares: Math.round(i.marketCap / i.price),
    },
    companyOwners: {
      owners: [
        ["Investor AB", 18.2, 41.1],
        ["Industrivärden", 6.8, 14.4],
        ["Swedbank Robur Fonder", 4.1, 2.9],
        ["Alecta Tjänstepension", 3.4, 2.4],
        ["BlackRock", 2.7, 1.9],
      ].map(([name, capital, votes]) => ({
        name: name as string,
        percentOfCapital: capital as number,
        percentOfVotes: votes as number,
      })),
      updated: date(Date.now() - 20 * DAY),
    },
    dividends: amount
      ? {
          events: [
            {
              exDate: date(exDate),
              paymentDate: date(exDate + 5 * DAY),
              amount,
              currencyCode: i.currency,
              dividendType: "ORDINARY",
            },
          ],
          pastEvents: [1, 2, 3].map((k) => ({
            exDate: date(exDate - k * 365 * DAY),
            paymentDate: date(exDate - k * 365 * DAY + 5 * DAY),
            amount: round(amount * (1 - k * 0.06), 2),
            currencyCode: i.currency,
            dividendType: "ORDINARY",
          })),
        }
      : { events: [], pastEvents: [] },
    companyReports: [
      {
        reportPeriodAndYear: { reportPeriod: "Q3", financialYear: year },
        companyReportSummary: {
          summary: `Sales grew ${round(pick(i.orderbookId, "sg", 2, 14), 0)} percent in local currencies and the operating margin rose to ${round(pick(i.orderbookId, "om", 9, 24), 1)} percent.`,
          highlights: [
            "Order intake above expectations",
            "Cash flow improved on lower inventory",
            "Outlook for next quarter unchanged",
          ],
        },
      },
    ],
  };
}

// ---- Funds and ETFs ----

const FUND_HOLDINGS = [
  "Microsoft",
  "NVIDIA",
  "Apple",
  "Amazon",
  "Alphabet",
  "Meta",
  "Broadcom",
  "Taiwan Semiconductor",
  "Investor B",
  "Atlas Copco A",
];

function fundGuide(i: DemoInstrument): FundGuide {
  const dev = (days: number) => round(returnOver(i, days) * 100, 2);
  const point = (name: string, y: number) => ({
    name,
    y,
    previousY: y,
    deltaRank: null,
    type: null,
    currency: null,
    countryCode: null,
    isin: null,
    orderbookId: null,
  });
  const swedish = i.sector === "Sverige";
  return {
    isin: i.isin,
    name: i.name,
    description: swedish
      ? "The fund invests in Swedish companies of all sizes, with a long-term owner's perspective."
      : `The fund invests broadly in ${i.sector === "Global" ? "companies around the world" : "emerging market companies"}, following its index at a low fee.`,
    nav: i.price,
    navDate: iso(lastSession(i).end),
    currency: "SEK",
    rating: Math.round(pick(i.orderbookId, "rating", 3, 5.9)),
    risk: Math.round(pick(i.orderbookId, "risk", 3, 5.9)),
    riskText: "Medelhög risk",
    productFee: round(pick(i.orderbookId, "fee", 0, 0.4), 2),
    managementFee: round(pick(i.orderbookId, "fee", 0, 0.4), 2),
    developmentOneDay: round(i.change * 100, 2),
    developmentOneMonth: dev(21),
    developmentThreeMonths: dev(63),
    developmentSixMonths: dev(126),
    developmentOneYear: dev(252),
    developmentThisYear: round((i.price / historicalClosingPrices(i).startOfYear - 1) * 100, 2),
    developmentThreeYears: dev(756),
    developmentFiveYears: dev(1260),
    countryChartData: swedish
      ? [point("Sverige", 92.4), point("Finland", 4.1), point("Danmark", 3.5)]
      : [
          point("USA", 64.2),
          point("Japan", 5.8),
          point("Storbritannien", 3.9),
          point("Kanada", 3.1),
          point("Övriga", 23.0),
        ],
    holdingChartData: (swedish
      ? ["Investor B", "Atlas Copco A", "Volvo B", "Saab B", "Assa Abloy B", "Ericsson B"]
      : FUND_HOLDINGS
    ).map((name, k) => point(name, round(6.2 - k * 0.55, 2))),
    sectorChartData: [
      point("Informationsteknik", 26.1),
      point("Finans", 16.4),
      point("Industri", 14.2),
      point("Hälsovård", 10.3),
      point("Sällanköp", 9.8),
      point("Övriga", 23.2),
    ],
    portfolioDate: date(Date.now() - 30 * DAY),
    indexFund: !swedish,
    hedgeFund: false,
    ucitsFund: true,
    superloanOrderbook: false,
    sharpeRatio: round(pick(i.orderbookId, "sharpe", 0.4, 1.4), 2),
    standardDeviation: round(pick(i.orderbookId, "sd", 11, 19), 2),
    capital: Math.round(pick(i.orderbookId, "cap", 8e9, 120e9)),
    startDate: "2012-05-14",
    fundManagers: [{ name: "Fondteamet", startDate: "2018-01-01" }],
    adminCompany: { name: i.name.split(" ")[0], country: "Sverige", url: "https://www.avanza.se" },
    pricingFrequency: "Dagligen",
    prospectusLink: "https://www.avanza.se",
    categories: [i.sector],
    fundTypeName: "Aktiefond",
    fundType: "EQUITY_FUND",
    primaryBenchmark: swedish ? "SIX Return Index" : "MSCI ACWI",
    recommendedHoldingPeriod: "5 år",
    ppmCode: null,
    lowCarbon: false,
    svanen: false,
    esgScore: 21.4,
    environmentalScore: null,
    socialScore: null,
    governanceScore: null,
    controversyScore: null,
    sustainabilityRating: 3,
    sustainabilityRatingCategoryName: "Medel",
    carbonRiskScore: null,
    carbonSolutionsInvolvement: null,
    aumCoveredCarbon: null,
    fossilFuelInvolvement: null,
    productInvolvements: [],
    fundRatingViews: [],
  };
}

function fundChart(i: DemoInstrument, period: Period): FundChartResponse {
  // Funds price once a day, so even short periods are daily points.
  const days = daily(i).map((d) => ({ t: d.t, price: d.close }));
  const count = {
    today: 2,
    one_week: 6,
    one_month: 22,
    three_months: 64,
    this_year: 0,
    one_year: 253,
    three_years: 757,
    five_years: 1261,
    infinity: days.length,
  }[period];
  const year = new Date(days.at(-1)!.t).getUTCFullYear();
  const points = count
    ? days.slice(-count)
    : days.filter((d) => new Date(d.t).getUTCFullYear() === year);
  const base = points[0].price;
  return {
    id: i.orderbookId,
    name: i.name,
    fromDate: date(points[0].t),
    toDate: date(points.at(-1)!.t),
    dataSerie: points.map((p) => ({ x: p.t, y: round((p.price / base - 1) * 100, 4) })),
  };
}

function etf(i: DemoInstrument): EtfResponse {
  return {
    orderbookId: i.orderbookId,
    name: i.name,
    isin: i.isin,
    type: i.type,
    tradable: "BUYABLE_AND_SELLABLE",
    underlying: null,
    listing: listing(i),
    marketPlace: marketplace(i),
    historicalClosingPrices: historicalClosingPrices(i),
    keyIndicators: { direction: "LONG", leverage: 1, numberOfOwners: owners(i) },
    quote: quote(i),
  };
}

function etfDetails(i: DemoInstrument): EtfDetailsResponse {
  const top = [...stocksForEtf()].slice(0, 10);
  return {
    underlying: null,
    assetCategory: "Aktier",
    category: "Sverige",
    subCategory: "Large Cap",
    issuer: "Xact Fonder",
    description: "Tracks the OMXS30 index: the 30 most traded stocks on Nasdaq Stockholm.",
    documents: {},
    orderDepth: orderDepth(i),
    brokerTradeSummaries: brokers(i),
    trades: trades(i),
    tradingUnit: 1,
    collateralValue: 0.8,
    superInterestApproved: false,
    introDate: "2000-10-19",
    dividends: { events: [], pastEvents: [] },
    fundExposures: top.map((s, k) => ({
      orderbookId: s.orderbookId,
      name: s.name,
      exposure: round(0.09 - k * 0.006, 4),
      instrumentType: "STOCK",
      countryCode: "SE",
      hasPosition: false,
    })),
    riskScore: "4",
    holdingPeriod: "5 år",
    countryExposures: {
      updated: date(Date.now() - 30 * DAY),
      exposures: [{ countryCode: "SE", countryName: "Sverige", weight: 1 }],
    },
    sectorExposures: {
      updated: date(Date.now() - 30 * DAY),
      exposures: [
        { sector: "Industri", weight: 0.41 },
        { sector: "Finans", weight: 0.27 },
        { sector: "Teknik", weight: 0.12 },
        { sector: "Övriga", weight: 0.2 },
      ],
    },
    portfolioDate: date(Date.now() - 30 * DAY),
    esgView: null,
  };
}

let stocksForEtf: () => DemoInstrument[] = () => [];
/** Set by market.ts so the ETF lists the index members without an import cycle. */
export const setEtfMembers = (f: () => DemoInstrument[]) => (stocksForEtf = f);

function tradingRules(i: DemoInstrument): TradingOrderbook {
  return {
    id: i.orderbookId,
    name: i.name,
    isin: i.isin,
    instrumentId: `i${i.orderbookId}`,
    instrumentType: i.type,
    marketPlace: i.marketplace,
    countryCode: i.country,
    currency: i.currency,
    tickerSymbol: i.ticker,
    tickSizeList: {
      tickSizeEntries: [
        { min: 0, max: 49.995, tick: 0.01 },
        { min: 50, max: 99.98, tick: 0.02 },
        { min: 100, max: 499.95, tick: 0.05 },
        { min: 500, max: 999.9, tick: 0.1 },
        { min: 1000, max: 100000, tick: 0.5 },
      ].map((e) => (i.currency === "SEK" ? e : { ...e, tick: 0.01 })),
    },
    collateralValue: 0.7,
    minValidUntil: date(Date.now()),
    maxValidUntil: date(Date.now() + 30 * DAY),
    volumeFactor: 1,
    priceType: "MONETARY",
    tradingUnit: 1,
    featureSupport: {},
  };
}

// ---- Routes ----

const id =
  (handle: (i: DemoInstrument, req: DemoRequest) => unknown) =>
  (req: DemoRequest, m: RegExpMatchArray) =>
    handle(need(m[1]), req);

export const instrumentRoutes: Route[] = [
  get(/^\/_api\/market-guide\/stock\/(\d+)$/, id(stock)),
  get(/^\/_api\/market-guide\/stock\/(\d+)\/marketplace$/, id(marketplace)),
  get(/^\/_api\/market-guide\/stock\/(\d+)\/quote$/, id(quote)),
  get(/^\/_api\/market-guide\/stock\/(\d+)\/orderdepth$/, id(orderDepth)),
  get(/^\/_api\/market-guide\/stock\/(\d+)\/trades$/, id(trades)),
  get(/^\/_api\/market-guide\/stock\/(\d+)\/broker-trade-summaries$/, id(brokers)),
  get(/^\/_api\/market-guide\/stock\/(\d+)\/details$/, id(stockDetails)),
  get(/^\/_api\/market-guide\/stock\/(\d+)\/analysis$/, id(stockAnalysis)),
  get(/^\/_api\/market-guide\/number-of-owners\/(\d+)$/, id(ownersHistory)),
  get(/^\/_api\/market-guide\/short-selling\/(\d+)$/, id(shortSelling)),
  get(/^\/_api\/market-insider-transactions\/transactions\/(\d+)$/, id(insiderTrades)),
  get(/^\/_api\/stock-guide\/forum\/(\d+)\/social-stats$/, id(forumStats)),
  get(/^\/_api\/market-stock-analysis\/analysis\/(\d+)\/sector$/, id(sectorAnalysis)),
  get(/^\/_api\/market-stock-analysis\/estimate\/recommendation\/(\d+)$/, id(recommendations)),
  get(/^\/_api\/market-stock-analysis\/estimate\/pricetarget\/(\d+)$/, id(priceTargets)),
  get(/^\/_api\/stock-analyses\/(\d+)$/, id(morningstar)),
  get(/^\/_api\/price-chart\/stock\/(\d+)\/company-events$/, id(companyEvents)),
  get(/^\/_api\/price-chart\/stock\/(\d+)\/insider-transactions$/, () => []),
  get(/^\/_api\/price-chart\/stock\/(\d+)\/ta\/?$/, id(priceChart)),
  get(/^\/_api\/price-chart\/stock\/(\d+)$/, id(priceChart)),
  get(/^\/_api\/market-etf\/(\d+)$/, id(etf)),
  get(/^\/_api\/market-etf\/(\d+)\/details$/, id(etfDetails)),
  get(/^\/_api\/fund-guide\/guide\/(\d+)$/, id(fundGuide)),
  get(/^\/_api\/fund-guide\/chart\/(\d+)\/([a-z_]+)$/, (_req, m) =>
    fundChart(need(m[1]), m[2] as Period),
  ),
  get(/^\/_api\/trading-critical\/rest\/orderbook\/(\d+)$/, id(tradingRules)),
];
