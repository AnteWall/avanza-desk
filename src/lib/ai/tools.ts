import type { QueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { chartPeriods, performancePeriods } from "avanza-ts";

import { linkFor } from "@/lib/ai/links";
import { getPreferences } from "@/lib/ai/preferences";
import { summarizeSeries } from "@/lib/ai/series";
import { articleParagraphs, pageParagraphs } from "@/lib/article-text";
import { aggregateHoldings } from "@/lib/avanza/portfolio";
import {
  accountsQuery,
  alertsQuery,
  companyEventsQuery,
  exchangeRatesQuery,
  fundamentalsQuery,
  fundAnalysisQuery,
  gainersLosersQuery,
  indexConstituentsQuery,
  keyRatiosQuery,
  lookThroughQuery,
  newsArticleQuery,
  newsCalendarQuery,
  orderDepthQuery,
  paidDividendsQuery,
  portfolioChartQuery,
  priceChartQuery,
  screenStocksQuery,
  stockKeyRatiosQuery,
  stopLossesQuery,
  transactionsQuery,
  watchlistRowsQuery,
  watchlistsQuery,
  yearSummaryQuery,
  dealsQuery,
  instrumentNewsQuery,
  instrumentQuery,
  newsFeedQuery,
  ordersQuery,
  positionsQuery,
  quoteQuery,
  searchQuery,
  totalValuesQuery,
} from "@/lib/avanza/queries";
import { getGroupId, getGroups, inGroup } from "@/lib/groups";
import { addedKey, targetsKey, type AddedInstrument } from "@/lib/rebalance";
import { getSetting } from "@/lib/settings";

// Read-only Avanza tools for Claude, served over MCP by src-tauri/src/ai/mcp.rs. They read
// through the query cache, so data a panel already shows costs no extra request.

type Args = Record<string, unknown>;

export type AiTool = {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: readonly string[];
  };
  /** What the chat shows while the call runs, and after: ["Reading …", "Read your holdings"]. */
  activity: (args: Args) => [running: string, done: string];
  run: (queryClient: QueryClient, args: Args) => Promise<unknown>;
};

const none = { type: "object", properties: {} } as const;
const orderbookId = {
  type: "object",
  properties: {
    orderbookId: { type: "string", description: "Avanza orderbook id, from search_instrument" },
  },
  required: ["orderbookId"],
} as const;

const id = (args: Args) => String(args.orderbookId);

const withProps = (properties: Record<string, unknown>, required: string[] = []) =>
  ({ type: "object", properties, required }) as const;
const idProp = orderbookId.properties.orderbookId;
const chartPeriod = { type: "string", enum: [...chartPeriods], description: "Default one_year" };
const performancePeriod = {
  type: "string",
  enum: [...performancePeriods],
  description: "Default ONE_YEAR",
};

const daysAgo = (days: number) =>
  new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);

export const tools: AiTool[] = [
  {
    name: "get_holdings",
    activity: () => ["Reading your holdings", "Read your holdings"],
    description:
      "The user's holdings summed over accounts, largest first: volume, value, profit, cost and " +
      "today's change in SEK. Follows the account picked in the app (all accounts if none).",
    inputSchema: none,
    run: async (qc) => aggregateHoldings(await qc.fetchQuery(positionsQuery)),
  },
  {
    name: "get_accounts",
    activity: () => ["Reading your accounts", "Read your accounts"],
    description: "The user's accounts with their total values.",
    inputSchema: none,
    run: (qc) => qc.fetchQuery(accountsQuery),
  },
  {
    name: "get_total_values",
    activity: () => ["Reading your account totals", "Read your account totals"],
    description: "Total value, cash, buying power and development per period, for all accounts.",
    inputSchema: none,
    run: (qc) => qc.fetchQuery(totalValuesQuery),
  },
  {
    name: "search_instrument",
    activity: (args) => [
      `Searching for “${String(args.query ?? "")}”`,
      `Searched for “${String(args.query ?? "")}”`,
    ],
    description: "Find stocks, funds, ETFs, certificates and warrants by name or ticker.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    run: (qc, args) => qc.fetchQuery(searchQuery(String(args.query))),
  },
  {
    name: "get_quote",
    activity: () => ["Fetching the latest quote", "Fetched the latest quote"],
    description: "Latest price, change, bid/ask and volume for a listed instrument.",
    inputSchema: orderbookId,
    run: (qc, args) => qc.fetchQuery(quoteQuery(id(args))),
  },
  {
    name: "get_instrument",
    activity: () => ["Looking up the instrument", "Looked up the instrument"],
    description: "Name, type, ISIN, currency and listing of an instrument.",
    inputSchema: orderbookId,
    run: (qc, args) => qc.fetchQuery(instrumentQuery(id(args))),
  },
  {
    name: "get_instrument_news",
    activity: () => ["Reading the instrument's news", "Read the instrument's news"],
    description: "Recent news for one instrument.",
    inputSchema: orderbookId,
    run: (qc, args) => qc.fetchQuery(instrumentNewsQuery(id(args))),
  },
  {
    name: "get_orders",
    activity: () => ["Reading your open orders", "Read your open orders"],
    description: "The user's open orders.",
    inputSchema: none,
    run: (qc) => qc.fetchQuery(ordersQuery),
  },
  {
    name: "get_deals",
    activity: () => ["Reading today's deals", "Read today's deals"],
    description: "The user's executed deals today.",
    inputSchema: none,
    run: (qc) => qc.fetchQuery(dealsQuery),
  },
  {
    name: "get_news_feed",
    activity: () => ["Reading your news feed", "Read your news feed"],
    description: "Latest news for the user's held and watched instruments, newest first.",
    inputSchema: none,
    run: (qc) => qc.fetchQuery(newsFeedQuery),
  },
  {
    name: "get_watchlists",
    activity: () => ["Reading your watchlists", "Read your watchlists"],
    description: "The user's watchlists with each instrument's latest price and change.",
    inputSchema: none,
    run: async (qc) => {
      const lists = await qc.fetchQuery(watchlistsQuery);
      return Promise.all(
        lists.map(async (list) => ({
          name: list.name,
          instruments: await qc.fetchQuery(watchlistRowsQuery(list.watchListId, list.orderbookIds)),
        })),
      );
    },
  },
  {
    name: "get_price_history",
    activity: () => ["Reading the price history", "Read the price history"],
    description:
      "An instrument's closing prices over a period, summarized: start, end, change (ratio), " +
      "high, low and about 30 evenly spaced points.",
    inputSchema: withProps({ orderbookId: idProp, period: chartPeriod }, ["orderbookId"]),
    run: async (qc, args) => {
      const period = (args.period as (typeof chartPeriods)[number]) ?? "one_year";
      const chart = await qc.fetchQuery(priceChartQuery(id(args), period, false));
      return summarizeSeries(chart.ohlc.map((p) => ({ time: p.timestamp, value: p.close })));
    },
  },
  {
    name: "get_portfolio_performance",
    activity: () => ["Reading your portfolio's performance", "Read your portfolio's performance"],
    description:
      "The user's portfolio value and return (percent) over a period, summarized like " +
      "get_price_history. Follows the account picked in the app.",
    inputSchema: withProps({ period: performancePeriod }),
    run: async (qc, args) => {
      const period = (args.period as (typeof performancePeriods)[number]) ?? "ONE_YEAR";
      const chart = await qc.fetchQuery(portfolioChartQuery(period));
      const series = (points: typeof chart.valueSeries) =>
        summarizeSeries(points.map((p) => ({ time: p.timestamp, value: p.performance.value })));
      return { value: series(chart.valueSeries), returnPercent: series(chart.relativeSeries) };
    },
  },
  {
    name: "get_portfolio_key_ratios",
    activity: () => ["Reading your key ratios", "Read your key ratios"],
    description: "The portfolio's CAGR, Sharpe ratio and standard deviation.",
    inputSchema: none,
    run: (qc) => qc.fetchQuery(keyRatiosQuery),
  },
  {
    name: "get_portfolio_exposure",
    activity: () => ["Reading your exposure", "Read your exposure"],
    description: "Look-through of the user's funds: industry, country and currency exposure, fees.",
    inputSchema: none,
    run: (qc) => qc.fetchQuery(fundAnalysisQuery),
  },
  {
    name: "get_instrument_exposure",
    activity: () => ["Looking through the holdings", "Looked through the holdings"],
    description:
      "What one stock, fund or ETF is exposed to: countries, sectors and underlying holdings.",
    inputSchema: withProps(
      {
        orderbookId: idProp,
        type: { type: "string", description: "STOCK, FUND, EXCHANGE_TRADED_FUND…" },
      },
      ["orderbookId", "type"],
    ),
    run: (qc, args) => qc.fetchQuery(lookThroughQuery(id(args), String(args.type))),
  },
  {
    name: "get_fundamentals",
    activity: () => ["Reading the fundamentals", "Read the fundamentals"],
    description:
      "A stock's analyst view, ownership, short interest, insider trades and report dates.",
    inputSchema: orderbookId,
    run: (qc, args) => qc.fetchQuery(fundamentalsQuery(id(args))),
  },
  {
    name: "get_company_events",
    activity: () => ["Reading company events", "Read company events"],
    description: "Reports, dividends and other company events for an instrument over a period.",
    inputSchema: withProps({ orderbookId: idProp, period: chartPeriod }, ["orderbookId"]),
    run: (qc, args) =>
      qc.fetchQuery(
        companyEventsQuery(id(args), (args.period as (typeof chartPeriods)[number]) ?? "one_year"),
      ),
  },
  {
    name: "get_order_depth",
    activity: () => ["Reading the order book", "Read the order book"],
    description: "Current bid and ask levels for a listed instrument.",
    inputSchema: orderbookId,
    run: (qc, args) => qc.fetchQuery(orderDepthQuery(id(args))),
  },
  {
    name: "get_dividend_outlook",
    activity: () => ["Reading dividend yields", "Read dividend yields"],
    description: "Dividend yield and next dividend for each stock the user holds.",
    inputSchema: none,
    run: (qc) => qc.fetchQuery(stockKeyRatiosQuery),
  },
  {
    name: "get_paid_dividends",
    activity: () => ["Reading your dividends", "Read your dividends"],
    description: "Dividends the user has received.",
    inputSchema: none,
    run: (qc) => qc.fetchQuery(paidDividendsQuery),
  },
  {
    name: "get_transactions",
    activity: () => ["Reading your transactions", "Read your transactions"],
    description: "The user's transactions (trades, deposits, dividends, fees) since a date.",
    inputSchema: withProps({
      from: { type: "string", description: "yyyy-MM-dd; default 90 days ago" },
    }),
    run: (qc, args) => {
      const from = typeof args.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.from);
      return qc.fetchQuery(transactionsQuery(from ? String(args.from) : daysAgo(90)));
    },
  },
  {
    name: "get_year_summary",
    activity: (args) => [
      `Reading ${String(args.year ?? "the year")}`,
      `Read ${String(args.year ?? "the year")}`,
    ],
    description: "The user's results for a calendar year: return, dividends, fees, deposits.",
    inputSchema: withProps({ year: { type: "integer" } }, ["year"]),
    run: (qc, args) => qc.fetchQuery(yearSummaryQuery(Number(args.year))),
  },
  {
    name: "get_stop_losses",
    activity: () => ["Reading your stop losses", "Read your stop losses"],
    description: "The user's active stop-loss orders on every account.",
    inputSchema: none,
    run: (qc) => qc.fetchQuery(stopLossesQuery),
  },
  {
    name: "get_alerts",
    activity: () => ["Reading your alerts", "Read your alerts"],
    description: "The user's price, percent and news alerts, and the ones that triggered recently.",
    inputSchema: none,
    run: async (qc) => {
      const [priceAlerts, percentAlerts, newsAlerts, triggered] = await Promise.all([
        qc.fetchQuery(alertsQuery("priceAlerts")),
        qc.fetchQuery(alertsQuery("percentAlerts")),
        qc.fetchQuery(alertsQuery("newsAlerts")),
        qc.fetchQuery(alertsQuery("triggered")),
      ]);
      return { priceAlerts, percentAlerts, newsAlerts, triggered };
    },
  },
  {
    name: "get_market_movers",
    activity: () => ["Reading today's movers", "Read today's movers"],
    description:
      "Today's biggest gainers and losers on the Stockholm exchange. Change fields are ratios, " +
      "not percents: 0.0389 means +3.89 %.",
    inputSchema: none,
    run: (qc) => qc.fetchQuery(gainersLosersQuery),
  },
  {
    name: "get_index_constituents",
    activity: () => ["Reading the index members", "Read the index members"],
    description:
      "The stocks in an index (e.g. OMXS30) with today's change. changePercent is a ratio, " +
      "not a percent: 0.0389 means +3.89 %.",
    inputSchema: orderbookId,
    run: (qc, args) => qc.fetchQuery(indexConstituentsQuery(id(args))),
  },
  {
    name: "screen_stocks",
    activity: () => ["Screening stocks", "Screened stocks"],
    description:
      "Stocks with key figures (P/E, yield, owners…), most owned first; filter by name or leave " +
      "empty for the most owned overall. Changes and yield are ratios, not percents: 0.0274 " +
      "means 2.74 %.",
    inputSchema: withProps({ name: { type: "string" } }),
    run: (qc, args) => qc.fetchQuery(screenStocksQuery(String(args.name ?? ""))),
  },
  {
    name: "get_news_calendar",
    activity: () => ["Reading the calendar", "Read the calendar"],
    description: "Upcoming reports and dividends for the user's holdings, by month.",
    inputSchema: none,
    run: (qc) => qc.fetchQuery(newsCalendarQuery),
  },
  {
    name: "read_article",
    activity: () => ["Reading the article", "Read the article"],
    description:
      "The full text of a news article, by the url from get_news_feed or get_instrument_news. " +
      "External articles (externalLink true) are fetched from their site; paywalled ones may " +
      "only give the intro.",
    inputSchema: withProps({ url: { type: "string" } }, ["url"]),
    run: async (qc, args) => {
      const url = String(args.url);
      if (await isExternalArticle(qc, url)) {
        if (!getPreferences().externalArticles) {
          throw new Error("Reading external articles is turned off in Settings › Assistant.");
        }
        const page = url.startsWith("/") ? `https://www.avanza.se${url}` : url;
        const html = await invoke<string>("article_fetch", { url: page });
        return { url, text: pageParagraphs(html).join("\n\n") };
      }
      const article = await qc.fetchQuery(newsArticleQuery(url));
      return { ...article, body: articleParagraphs(article.body).join("\n\n") };
    },
  },
  {
    name: "get_rebalance_plan",
    activity: () => ["Reading your rebalance plan", "Read your rebalance plan"],
    description:
      "The Rebalance page's plan: the group it covers (all holdings if none), each holding's " +
      "weight now and its target (shares 0…1; a target not set is today's weight), and " +
      "instruments added to buy.",
    inputSchema: none,
    run: async (qc) => {
      const group = getGroups().find((g) => g.id === getGroupId());
      const suffix = group ? `:${group.id}` : "";
      const targets = getSetting<Record<string, number>>(targetsKey + suffix, {});
      const held = aggregateHoldings(await qc.fetchQuery(positionsQuery)).filter(
        (h) => h.value > 0 && (!group || inGroup(group, h.key)),
      );
      const total = held.reduce((s, h) => s + h.value, 0);
      return {
        group: group?.name,
        holdings: held.map((h) => ({
          orderbookId: h.orderbookId,
          name: h.name,
          type: h.type,
          weight: h.value / total,
          target: targets[h.key] ?? h.value / total,
        })),
        added: getSetting<AddedInstrument[]>(addedKey + suffix, [])
          .filter((a) => !held.some((h) => h.key === a.orderbookId))
          .map((a) => ({ ...a, target: targets[a.orderbookId] ?? 0 })),
      };
    },
  },
  {
    name: "get_exchange_rates",
    activity: () => ["Reading exchange rates", "Read exchange rates"],
    description: "Current currency exchange rates against SEK.",
    inputSchema: none,
    run: (qc) => qc.fetchQuery(exchangeRatesQuery),
  },
];

/**
 * Whether `url` is an external article the app was given by Avanza (the news feed or a loaded
 * instrument's news). Only those are fetched, so Claude can't send a request anywhere else.
 */
async function isExternalArticle(qc: QueryClient, url: string) {
  const feed = await qc.fetchQuery(newsFeedQuery);
  if (feed.news.some((n) => n.externalLink && n.url === url)) return true;
  return qc
    .getQueriesData<{ articles: { fullArticleLink: string; externalLink: boolean }[] }>({
      predicate: (q) => q.queryKey[0] === "instrument" && q.queryKey[2] === "news",
    })
    .some(([, data]) => data?.articles.some((a) => a.externalLink && a.fullArticleLink === url));
}

/** Claude Code's own tools we turn on, labeled like ours. */
const builtIn: Record<string, (args: Args) => [string, string]> = {
  WebSearch: (args) => [`Searching the web for “${String(args.query ?? "")}”`, "Searched the web"],
};

/** The activity label for a call, or the tool's name for tools we don't know. */
export function toolActivity(name: string, args: unknown, done = false) {
  const activity = tools.find((t) => t.name === name)?.activity ?? builtIn[name];
  return activity ? activity((args ?? {}) as Args)[done ? 1 : 0] : name;
}

const MAX_ITEMS = 50;
const MAX_CHARS = 40_000;

/**
 * JSON for a tool result: drops empty fields, caps lists so one call can't flood Claude, and
 * adds an in-app `link` to every instrument and article (see links.ts).
 */
export function compact(value: unknown) {
  const json = JSON.stringify(value, (_key, v: unknown) => {
    if (v === null || v === "" || (Array.isArray(v) && v.length === 0)) return undefined;
    if (Array.isArray(v) && v.length > MAX_ITEMS) {
      return [...v.slice(0, MAX_ITEMS), `… ${v.length - MAX_ITEMS} more not shown`];
    }
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const link = linkFor(v as Record<string, unknown>);
      if (link) return { ...v, link };
    }
    return v;
  });
  if (json === undefined) return "null";
  return json.length > MAX_CHARS ? `${json.slice(0, MAX_CHARS)} … (truncated)` : json;
}
