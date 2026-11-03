import { queryOptions } from "@tanstack/react-query";
import type {
  AlertsResponse,
  ChartPeriod,
  InsightsPeriod,
  ListedInstrumentType,
  PerformanceDateRange,
  PerformancePeriod,
  SearchHit,
  TransactionListFilter,
} from "avanza-ts";
import type { SearchInstrumentType } from "avanza-ts";

import { accountIds, getAccount } from "@/lib/account";
import { refreshEvery } from "@/lib/refresh-intervals";

import { avanza } from "./client";
import { InstrumentType, OverviewWidget, TransactionSide } from "./codes";
import { loadInstrument } from "./instrument";
import { loadLookThrough } from "./look-through";
import { captureRaw } from "./loose-records";
import type { StockDetails } from "./stock-details";
import { tauriFetch } from "./tauri-fetch";
import { buildUniverse } from "./universe";

// Instrument types the workspace can show (see `loadInstrument`).
const searchTypes: SearchInstrumentType[] = [
  InstrumentType.Stock,
  InstrumentType.Etf,
  InstrumentType.Fund,
  InstrumentType.Certificate,
  InstrumentType.Warrant,
];

// Every Avanza read goes through these factories. Queries under `accountScopedKeys` follow the
// account picker (src/lib/account.ts). Quotes, depth, the trade tape and orders don't poll:
// push streams (src/lib/avanza/push.ts) write into their keys. The rest polls via `refreshEvery`
// or a fixed interval; `live` is false while the instrument's market is closed.
// Panels read their main data with `useSuspenseQuery` inside an AsyncBoundary; decorations
// (held markers, your trades) use `useQuery` so their failure never blanks a panel.

export const watchlistsQuery = queryOptions({
  queryKey: ["watchlists"],
  queryFn: ({ signal }) => avanza.collections.watchlists(signal),
  staleTime: 5 * 60_000,
});

export const watchlistRowsQuery = (watchListId: string, orderbookIds: readonly string[]) =>
  queryOptions({
    queryKey: ["watchlists", watchListId, "rows", orderbookIds],
    queryFn: ({ signal }) =>
      orderbookIds.length
        ? avanza.collections.watchlistData(watchListId, orderbookIds, undefined, signal)
        : [],
  });

export const marketplaceQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "marketplace"],
    queryFn: ({ signal }) => avanza.market.marketplace(orderbookId, signal),
    // Re-check open/closed state once a minute so polling starts at the open bell.
    refetchInterval: 60_000,
  });

/** Name, ISIN and listing for any instrument type; `type` is Avanza's code (STOCK, FUND, …). */
export const instrumentQuery = (orderbookId: string, type?: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "info"],
    queryFn: ({ signal }) => loadInstrument(orderbookId, type, signal),
    staleTime: 60 * 60_000,
  });

/** Funds have no order book; their chart is a % development series priced once a day. */
export const fundChartQuery = (orderbookId: string, period: ChartPeriod) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "fund-chart", period],
    queryFn: ({ signal }) => avanza.funds.chart(orderbookId, period, signal),
    staleTime: 30 * 60_000,
  });

export const quoteQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "quote"],
    queryFn: ({ signal }) => avanza.market.quote(orderbookId, signal),
  });

export const orderDepthQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "depth"],
    queryFn: ({ signal }) => avanza.market.orderDepth(orderbookId, signal),
  });

export const priceChartQuery = (orderbookId: string, period: ChartPeriod, live: boolean) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "chart", period],
    queryFn: ({ signal }) => avanza.market.priceChart(orderbookId, period, undefined, signal),
    // The last candle moves; a full redraw every quote tick would be wasteful.
    refetchInterval: live && period === "today" && 15_000,
  });

export const positionsQuery = queryOptions({
  queryKey: ["positions"],
  queryFn: ({ signal }) => avanza.positions.list(getAccount() ?? undefined, signal),
  refetchInterval: refreshEvery("positions"),
});

/** Totals, cash, buying power and development per period, for all accounts and each one. */
export const totalValuesQuery = queryOptions({
  queryKey: ["portfolio", "total-values"],
  queryFn: ({ signal }) => avanza.performance.totalValues(accountIds(), signal),
  refetchInterval: refreshEvery("positions"),
});

/** Portfolio history over all accounts: value and return (percent units) series. */
export const portfolioChartQuery = (period: PerformancePeriod) =>
  queryOptions({
    queryKey: ["portfolio", "chart", period],
    queryFn: ({ signal }) => avanza.performance.chart(period, { accountIds: accountIds() }, signal),
    staleTime: 5 * 60_000,
  });

/** CAGR, Sharpe ratio and standard deviation over all accounts. */
export const keyRatiosQuery = queryOptions({
  queryKey: ["portfolio", "key-ratios"],
  queryFn: ({ signal }) => avanza.performance.keyRatios({ accountIds: accountIds() }, signal),
  staleTime: 60 * 60_000,
});

/** Look-through of all fund holdings: industry, country and currency exposure, fees. */
export const fundAnalysisQuery = queryOptions({
  queryKey: ["portfolio", "fund-analysis"],
  queryFn: ({ signal }) => avanza.positions.fundAnalysis(accountIds(), signal),
  staleTime: 60 * 60_000,
});

/** Dividend yield and next dividend per stock position. */
export const stockKeyRatiosQuery = queryOptions({
  queryKey: ["portfolio", "stock-key-ratios"],
  queryFn: ({ signal }) => avanza.positions.stockKeyRatios(getAccount() ?? undefined, signal),
  staleTime: 60 * 60_000,
});

/** An ETF's country and sector exposure; Avanza updates it with the fund's monthly report. */
export const etfDetailsQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "etf-details"],
    queryFn: ({ signal }) => avanza.market.etfDetails(orderbookId, signal),
    staleTime: 24 * 60 * 60_000,
  });

/** A fund's or ETF's yearly total fee, percent units (0.11 = 0.11 %). */
export const totalFeeQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "total-fee"],
    // shortcut: published avanza-ts 1.2.0 lacks funds.totalFee; switch to it after the next release.
    queryFn: async (): Promise<number | null> => {
      const res = await tauriFetch(
        `https://www.avanza.se/_api/fund-guide/total-fee/${orderbookId}`,
      );
      return res.ok ? (JSON.parse(await res.text()) as number) : null;
    },
    staleTime: 24 * 60 * 60_000,
  });

/**
 * What one stock, fund or ETF is exposed to (countries, sectors, underlying holdings), with
 * fund-of-funds opened up. Raw reads go through their own cached queries.
 */
export const lookThroughQuery = (orderbookId: string, type: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "look-through"],
    queryFn: ({ client }) =>
      loadLookThrough(orderbookId, type, {
        instrument: (id, t) => client.fetchQuery(instrumentQuery(id, t)),
        etf: (id) => client.fetchQuery(etfDetailsQuery(id)),
      }),
    staleTime: 24 * 60 * 60_000,
  });

/** The user's own buys and sells of one instrument, for chart markers. */
export const tradesByIsinQuery = (isin: string | undefined) =>
  queryOptions({
    queryKey: ["transactions", "trades", isin],
    // Avanza's transaction type codes for executed trades.
    queryFn: ({ signal }) =>
      avanza.transactions.list(
        { isin, transactionTypes: [TransactionSide.Buy, TransactionSide.Sell] },
        signal,
      ),
    enabled: !!isin,
    staleTime: 5 * 60_000,
  });

export const headerIndicesQuery = queryOptions({
  queryKey: ["market", "header-indices"],
  queryFn: ({ signal }) => avanza.market.headerIndices(signal),
  refetchInterval: refreshEvery("indices"),
});

/**
 * Every index on Avanza's market overview (Nordic, European and world), each with today's
 * chart: name, country, last price and previous close. One request per index.
 */
export const worldIndicesQuery = queryOptions({
  queryKey: ["market", "world-indices"],
  queryFn: async ({ signal }) => {
    const overviews = await avanza.market.overviews(signal);
    const widgets = (overviews.find((o) => o.active) ?? overviews[0])?.widgets ?? [];
    const ids = Object.values(OverviewWidget).flatMap((type) =>
      widgets
        .filter((w) => w.type === type)
        // Untyped in the SDK: `{ orderbooks: [{ orderbookId }] }` on index widgets.
        .flatMap(
          (w) => (w.data as { orderbooks?: { orderbookId: string }[] } | null)?.orderbooks ?? [],
        )
        .map((o) => o.orderbookId),
    );
    // One failing index shouldn't blank the map.
    const charts = await Promise.allSettled(
      [...new Set(ids)].map((id) => avanza.market.overviewChart(id, "today", signal)),
    );
    return charts.flatMap((c) => (c.status === "fulfilled" ? [c.value] : []));
  },
  refetchInterval: refreshEvery("market"),
});

export const searchQuery = (query: string) =>
  queryOptions({
    queryKey: ["search", query],
    queryFn: async ({ signal }): Promise<readonly SearchHit[]> =>
      (await avanza.market.search(query, { types: searchTypes, size: 12 }, signal)).hits.filter(
        (h) => h.orderBookId,
      ),
    enabled: query.trim().length > 0,
    staleTime: 60_000,
  });

// Orders, deals and stop losses refetch when their push stream reports a change.
export const ordersQuery = queryOptions({
  queryKey: ["orders"],
  queryFn: ({ signal }) => avanza.orders.orders(signal).then(captureRaw("orders")),
});

/** Today's executed deals, listed and fund. */
export const dealsQuery = queryOptions({
  queryKey: ["orders", "deals"],
  queryFn: ({ signal }) => avanza.orders.deals(signal).then(captureRaw("deals")),
});

// Every account, even with one picked: the notifier watches them all. Tables filter.
export const stopLossesQuery = queryOptions({
  queryKey: ["orders", "stop-losses"],
  queryFn: ({ signal }) =>
    avanza.orders.stopLosses(undefined, signal).then(captureRaw("stop-losses")),
});

/** Today's trade tape (time & sales), newest first. */
export const marketTradesQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "trades"],
    queryFn: ({ signal }) => avanza.market.trades(orderbookId, signal),
  });

/** Volume bought and sold per broker today. */
export const brokerSummaryQuery = (orderbookId: string, live: boolean) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "brokers"],
    queryFn: ({ signal }) => avanza.market.brokerTradeSummaries(orderbookId, signal),
    refetchInterval: live && 30_000,
  });

export const instrumentNewsQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "news"],
    queryFn: ({ signal }) => avanza.market.news(orderbookId, signal),
    refetchInterval: refreshEvery("news"),
  });

/**
 * Analyst view, ownership, short interest, insider trades and report dates for a stock. Each
 * part is `null` when Avanza has none (no coverage answers with an error), so one missing
 * source never blanks the rest.
 */
export const fundamentalsQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "fundamentals"],
    queryFn: async ({ signal }) => {
      const m = avanza.market;
      const parts = await Promise.allSettled([
        m.analystRecommendations(orderbookId, signal),
        m.priceTargets(orderbookId, signal),
        m.numberOfOwners(orderbookId, signal),
        m.shortSelling(orderbookId, signal),
        m.insiderTrades(orderbookId, signal),
        m.companyEvents(orderbookId, "one_year", signal),
      ]);
      // Every part failing is a real error (offline, signed out), not missing coverage.
      const failed = parts.find((p) => p.status === "rejected");
      if (failed && parts.every((p) => p.status === "rejected")) throw failed.reason;
      const [recommendations, targets, owners, shorts, insiders, events] = parts.map((p) =>
        p.status === "fulfilled" ? p.value : null,
      ) as [
        Awaited<ReturnType<typeof m.analystRecommendations>> | null,
        Awaited<ReturnType<typeof m.priceTargets>> | null,
        Awaited<ReturnType<typeof m.numberOfOwners>> | null,
        Awaited<ReturnType<typeof m.shortSelling>> | null,
        Awaited<ReturnType<typeof m.insiderTrades>> | null,
        Awaited<ReturnType<typeof m.companyEvents>> | null,
      ];
      return { recommendations, targets, owners, shorts, insiders, events };
    },
    staleTime: 60 * 60_000,
  });

/** News for held and watched instruments, newest first. */
export const newsFeedQuery = queryOptions({
  queryKey: ["news", "feed"],
  queryFn: ({ signal }) => avanza.news.feed({ count: 100 }, signal),
  refetchInterval: refreshEvery("news"),
});

export const newsArticleQuery = (url: string) =>
  queryOptions({
    queryKey: ["news", "article", url],
    queryFn: ({ signal }) => avanza.news.article(url, signal),
    staleTime: Infinity,
  });

/** Upcoming dividends and reports for your holdings, by month. */
export const newsCalendarQuery = queryOptions({
  queryKey: ["news", "calendar"],
  queryFn: ({ signal }) => avanza.news.calendar(signal),
  staleTime: 60 * 60_000,
});

/** One kind of alert, or the alerts that have triggered. */
export const alertsQuery = (list: keyof AlertsResponse | "triggered") =>
  queryOptions({
    queryKey: ["alerts", list],
    queryFn: async ({ signal }) =>
      list === "triggered"
        ? avanza.collections.triggeredAlerts(signal).then(captureRaw("triggered alerts"))
        : (await avanza.collections.alerts(signal).then(captureRaw("alerts")))[list],
    refetchInterval: refreshEvery("alerts"),
  });

export const gainersLosersQuery = queryOptions({
  queryKey: ["market", "gainers-losers"],
  queryFn: ({ signal }) => avanza.instruments.getGainersLosers(undefined, signal),
  refetchInterval: refreshEvery("market"),
});

export const indexConstituentsQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "constituents"],
    queryFn: ({ signal }) => avanza.market.indexConstituents(orderbookId, signal),
    refetchInterval: 60_000,
  });

/** Market caps in SEK by orderbook id; Avanza converts foreign stocks, so a Nordic index's
 *  DKK, EUR and SEK members compare fairly (the stock guide gives each in its own currency). */
export const marketCapsQuery = (orderbookIds: readonly string[]) =>
  queryOptions({
    queryKey: ["market", "market-caps", orderbookIds],
    queryFn: async ({ signal }) => {
      const { stocks } = await avanza.instruments.getThemeStocks(
        orderbookIds,
        { field: "marketCap", order: "desc" },
        signal,
      );
      return Object.fromEntries(stocks.map((s) => [s.orderbookId, s.marketCap ?? 0]));
    },
    staleTime: 60 * 60_000,
  });

/** Stocks matching `name` (all when empty), most owned first. */
export const screenStocksQuery = (name: string) =>
  queryOptions({
    queryKey: ["market", "screener", name],
    queryFn: ({ signal }) =>
      avanza.instruments.screenStocks({
        filter: name ? { nameQuery: name } : {},
        sortBy: { field: "numberOfOwners", order: "desc" },
        limit: 100,
        signal,
      }),
    staleTime: 60_000,
  });

/** Stocks gaining Avanza owners fastest this week, of those with at least 500 owners. */
export const trendingStocksQuery = queryOptions({
  queryKey: ["market", "trending"],
  queryFn: ({ signal }) =>
    avanza.instruments.screenStocks({
      // The floor keeps tiny stocks from topping the list on a handful of new owners.
      filter: { numberOfOwners: { minValue: 500 } },
      sortBy: { field: "ownersChangeOneWeek", order: "desc" },
      limit: 60,
      signal,
    }),
  staleTime: 30 * 60_000,
});

/** Placera forum activity for a stock: new posts, followers and owners lately. */
export const forumStatsQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "forum-stats"],
    queryFn: ({ signal }) => avanza.market.forumStats(orderbookId, signal),
    staleTime: 30 * 60_000,
  });

/** Every transaction on every account since `from` (yyyy-MM-dd), newest first. */
export const transactionsQuery = (from: string) =>
  queryOptions({
    queryKey: ["transactions", "all", from],
    queryFn: ({ signal }) => avanza.transactions.list({ from, accountIds: accountIds() }, signal),
    staleTime: 5 * 60_000,
  });

/** Dividends paid out to you, on every account. */
export const paidDividendsQuery = queryOptions({
  queryKey: ["transactions", "dividends"],
  queryFn: ({ signal }) =>
    avanza.transactions.dividends({ accountId: getAccount() ?? undefined }, signal),
  staleTime: 60 * 60_000,
});

/** Development, best and worst holdings and days for one calendar year, all accounts. */
export const yearSummaryQuery = (year: number) =>
  queryOptions({
    queryKey: ["portfolio", "year-summary", year],
    queryFn: ({ signal }) => avanza.performance.yearSummary(year, accountIds(), signal),
    staleTime: 60 * 60_000,
  });

/** Trading rules for an orderbook: tick size table, trading unit, order validity range. */
export const tradingRulesQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "trading-rules"],
    queryFn: ({ signal }) => avanza.orders.orderbook(orderbookId, signal),
    staleTime: 24 * 60 * 60_000,
  });

/** Avanza's currency exchange rates (buy and sell price per currency, in SEK). */
export const exchangeRatesQuery = queryOptions({
  queryKey: ["market", "exchange-rates"],
  queryFn: ({ signal }) => avanza.orders.exchangeRates(signal),
  staleTime: 5 * 60_000,
});

/** Reports, dividends and other company events in a chart period, for chart markers. */
export const companyEventsQuery = (orderbookId: string, period: ChartPeriod) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "events", period],
    queryFn: ({ signal }) => avanza.market.companyEvents(orderbookId, period, signal),
    staleTime: 60 * 60_000,
  });

/** Company profile, major owners, dividends and report summaries of a stock. */
export const stockDetailsQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "stock-details"],
    // Same endpoint family as other listed details; the SDK just doesn't type "stock".
    queryFn: async ({ signal }) =>
      (await avanza.market.instrumentDetails(
        "stock" as ListedInstrumentType,
        orderbookId,
        signal,
      )) as unknown as StockDetails,
    staleTime: 60 * 60_000,
  });

/** Key ratios and financials by year, with their latest and historical average. */
export const stockAnalysisQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "analysis"],
    queryFn: ({ signal }) => avanza.market.stockAnalysis(orderbookId, signal),
    staleTime: 60 * 60_000,
  });

/** The stock's key ratios next to its sector's averages. */
export const sectorAnalysisQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "sector"],
    queryFn: ({ signal }) => avanza.market.sectorAnalysis(orderbookId, signal),
    staleTime: 24 * 60 * 60_000,
  });

/** Your own Avanza notes on an instrument. */
export const notesQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "notes"],
    queryFn: ({ signal }) => avanza.collections.notes(orderbookId, signal),
    staleTime: 5 * 60_000,
  });

/** Every account with its value, for the account picker. Not account-scoped itself. */
export const accountsQuery = queryOptions({
  queryKey: ["accounts"],
  queryFn: async ({ signal }) => (await avanza.performance.totalValues(undefined, signal)).accounts,
  staleTime: 5 * 60_000,
});

// ---- Insights: signals, benchmarks, income, tax. ----

/** Positions on every account, whatever the account picker says: signals and snapshots. */
export const allPositionsQuery = queryOptions({
  queryKey: ["positions", "all"],
  queryFn: ({ signal }) => avanza.positions.list(undefined, signal),
  staleTime: 5 * 60_000,
});

/** Stocks you hold (any account) or watch, deduplicated; see `src/lib/avanza/universe.ts`. */
export const universeQuery = queryOptions({
  queryKey: ["universe"],
  queryFn: async ({ client }) => {
    const [positions, lists] = await Promise.all([
      client.fetchQuery(allPositionsQuery),
      client.fetchQuery(watchlistsQuery),
    ]);
    const rows = await Promise.all(
      lists.map((l) => client.fetchQuery(watchlistRowsQuery(l.watchListId, l.orderbookIds))),
    );
    return buildUniverse(positions, rows.flat());
  },
  staleTime: 10 * 60_000,
});

/** Morningstar fair value, moat and bull/bear case; `morningstar` is null without coverage. */
export const morningstarQuery = (orderbookId: string) =>
  queryOptions({
    queryKey: ["instrument", orderbookId, "morningstar"],
    queryFn: ({ signal }) => avanza.market.morningstarAnalysis(orderbookId, signal),
    staleTime: 24 * 60 * 60_000,
  });

/** Announced (confirmed or preliminary) dividends on what you hold, per account. */
export const upcomingDividendsQuery = queryOptions({
  queryKey: ["transactions", "upcoming-dividends"],
  queryFn: ({ signal }) => avanza.transactions.upcomingDividends(undefined, signal),
  staleTime: 60 * 60_000,
});

/** What each position earned over the period, split into price development and dividends. */
export const insightsQuery = (period: InsightsPeriod) =>
  queryOptions({
    queryKey: ["portfolio", "insights", period],
    // Avanza answers 400 to an empty account list (despite the SDK docs), so name them all.
    queryFn: async ({ client, signal }) =>
      avanza.performance.insights(
        period,
        accountIds() ?? (await client.fetchQuery(accountsQuery)).map((a) => a.info.id),
        signal,
      ),
    staleTime: 30 * 60_000,
  });

/** Portfolio value and return over a date range, for explicit accounts (all when omitted). */
export const portfolioRangeQuery = (range: PerformanceDateRange, ids?: readonly string[]) =>
  queryOptions({
    queryKey: ["portfolio", "range", range, ids],
    queryFn: ({ signal }) => avanza.performance.chart(range, { accountIds: ids }, signal),
    staleTime: 30 * 60_000,
  });

/** Relative development of the average Avanza customer. */
export const averageCustomerQuery = (range: PerformanceDateRange) =>
  queryOptions({
    queryKey: ["market", "average-customer", range],
    queryFn: ({ signal }) => avanza.performance.averageCustomerChart(range, signal),
    staleTime: 60 * 60_000,
  });

/** Relative development of instruments (indices, funds, stocks) over a date range. */
export const orderbookChartsQuery = (
  orderbookIds: readonly string[],
  range: PerformanceDateRange,
) =>
  queryOptions({
    queryKey: ["market", "orderbook-charts", orderbookIds, range],
    queryFn: ({ signal }) => avanza.performance.orderbookCharts(orderbookIds, range, signal),
    enabled: orderbookIds.length > 0,
    staleTime: 60 * 60_000,
  });

/** Transactions matching `filter` (explicit accounts and types), newest first. */
export const transactionFilterQuery = (filter: TransactionListFilter) =>
  queryOptions({
    queryKey: ["transactions", "filter", filter],
    queryFn: ({ signal }) => avanza.transactions.list(filter, signal),
    staleTime: 10 * 60_000,
  });

/** Credit limit, used credit, interest and loan-to-value per account with credit. */
export const creditInfoQuery = queryOptions({
  queryKey: ["portfolio", "credit"],
  queryFn: ({ signal }) => avanza.savings.creditInfo("credited", signal),
  staleTime: 5 * 60_000,
});
