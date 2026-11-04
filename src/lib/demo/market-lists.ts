import type {
  AlertsResponse,
  ExchangeRate,
  GainersLosersResponse,
  HeaderIndicesResponse,
  IndexConstituent,
  MarketOverview,
  Note,
  OverviewChartResponse,
  ScreenedStock,
  ScreenStocksResponse,
  SearchHit,
  SearchResponse,
  ThemeStocksResponse,
  Watchlist,
  WatchlistRow,
} from "avanza-ts";

import { InstrumentType, OverviewWidget } from "@/lib/avanza/codes";

import {
  allInstruments,
  findInstrument,
  historicalClosingPrices,
  intraday,
  OMXS30,
  owners,
  ownersChangeWeek,
  pick,
  prevClose,
  type Priced,
  returnOver,
  stocks,
  volumeToday,
} from "./market-data";
import { quote } from "./market-instrument";
import { HOLDINGS, WATCHLIST } from "./portfolio";
import { round } from "./random";
import { type DemoRequest, get, post, type Route } from "./route";
import { type DemoIndex, type DemoInstrument, FX, INDICES } from "./universe";

// Lists across instruments: watchlists, indices and the world map, screener, movers, search.

const DAY = 86_400_000;
const date = (t: number) => new Date(t).toISOString().slice(0, 10);
const formatPercent = (ratio: number) =>
  `${ratio >= 0 ? "+" : ""}${(ratio * 100).toFixed(2).replace(".", ",")} %`;
const direction = (x: number) => Math.sign(Math.round(x * 1e4));

// ---- Watchlists ----

const LISTS = [
  { id: "70001", name: "Bevakning", ids: WATCHLIST },
  { id: "70002", name: "Utdelare", ids: ["5241", "5255", "5246", "5269", "5263", "5247"] },
];

const watchlists = (): Watchlist[] =>
  LISTS.map((l) => ({
    watchListId: l.id,
    name: l.name,
    customerId: { id: 1000001 },
    orderbookIds: l.ids,
    watchListItems: l.ids.map((orderbookId) => ({ orderbookId })),
    created: "2024-02-11T09:12:00",
    modified: date(Date.now() - 3 * DAY),
  }));

// A couple of rows carry an alert or a note, so the watchlist shows its markers.
const ALERTED = new Set(["5260", "4478"]);
const NOTED = new Set(["5240"]);

export function watchlistRow(i: DemoInstrument): WatchlistRow {
  const q = quote(i);
  return {
    id: i.orderbookId,
    name: i.name,
    shortName: i.ticker,
    isin: i.isin,
    instrumentId: `i${i.orderbookId}`,
    instrumentType: i.type,
    currency: i.currency,
    flagCode: i.country,
    tradable: true,
    buyable: true,
    sellable: true,
    quote: {
      change: q.change ?? 0,
      changePercent: q.changePercent ?? 0,
      lastPrice: i.price,
      closingPrice: round(prevClose(i), 2),
      highestPrice: q.highest ?? i.price,
      lowestPrice: q.lowest ?? i.price,
      buyPrice: q.buy ?? i.price,
      sellPrice: q.sell ?? i.price,
      spread: q.spread ?? 0,
      totalVolumeTraded: q.totalVolumeTraded ?? 0,
      totalValueTraded: q.totalValueTraded ?? 0,
      lastPriceUpdated: new Date(q.updated).toISOString(),
      updated: new Date(q.updated).toISOString(),
    },
    keyIndicators: {
      numberOfOwners: owners(i),
      ...(i.pe && { priceEarningsRatio: i.pe }),
      ...(i.yield !== undefined && { directYield: i.yield }),
      marketCapital: i.marketCap,
    },
    performance: {
      ONE_WEEK: round(returnOver(i, 5) * 100, 2),
      ONE_MONTH: round(returnOver(i, 21) * 100, 2),
      ONE_YEAR: round(returnOver(i, 252) * 100, 2),
    },
    tools: { hasAlert: ALERTED.has(i.orderbookId), hasNote: NOTED.has(i.orderbookId) },
  };
}

function watchlistData(req: DemoRequest): WatchlistRow[] {
  const { orderbookIds } = req.body as { orderbookIds: string[] };
  return orderbookIds.flatMap((id) => {
    const i = findInstrument(id);
    return i ? [watchlistRow(i)] : [];
  });
}

function notes(req: DemoRequest): Note[] {
  const id = req.query.get("orderbookId") ?? "";
  const i = findInstrument(id);
  if (!i || !NOTED.has(id)) return [];
  const original = round(i.price * 0.92, 2);
  return [
    {
      noteId: "note-1",
      orderbookId: id,
      text: "Watch the order intake in the Q4 report. Buy more under 80 kr if the margin holds.",
      color: "YELLOW",
      createdDate: date(Date.now() - 40 * DAY),
      reminderDate: null,
      originalPrice: original,
      lastPrice: i.price,
      priceDevelopmentPercentage: round((i.price / original - 1) * 100, 2),
      currency: i.currency,
      instrumentName: i.name,
      instrumentType: i.type,
      countryCode: i.country,
    },
  ];
}

// ---- Indices ----

// The top bar shows these, in this order.
const HEADER = ["19002", "18988", "19005", "18985", "18990"];

const shortName = (x: DemoIndex) =>
  ({ "OMX Stockholm PI": "OMXSPI", "OMX Copenhagen 25": "OMXC25", "OMX Helsinki 25": "OMXH25" })[
    x.name
  ] ?? x.name;

function headerIndices(): HeaderIndicesResponse {
  return {
    indexes: HEADER.map((id) => {
      const x = INDICES.find((i) => i.orderbookId === id)!;
      const ytd = x.price / historicalClosingPrices(x).startOfYear - 1;
      return {
        link: {
          orderbookId: x.orderbookId,
          type: "INDEX",
          flagCode: x.country,
          tradeStatus: "OPEN",
          linkDisplay: x.name,
          urlDisplayName: x.name,
          shortLinkDisplay: shortName(x),
          tradeable: false,
          sellable: false,
          buyable: false,
        },
        quoteChangeToday: formatPercent(x.change),
        todayChangeDirection: direction(x.change),
        todayPriceUpdated: new Date().toISOString(),
        quoteChangeYear: formatPercent(ytd),
        yearChangeDirection: direction(ytd),
        priceAtStartOfYear: historicalClosingPrices(x).startOfYear.toString(),
      };
    }),
  };
}

const usMembers = () => stocks().filter((s) => s.country === "US");

function constituents(id: string): IndexConstituent[] {
  // shortcut: only the Swedish and US indices have members; others answer empty, which the
  // index picker hides.
  const members =
    id === "19002" || id === "18988"
      ? OMXS30
      : id === "18985" || id === "18990" || id === "155541"
        ? usMembers()
        : [];
  return members.map((s) => ({
    name: s.name,
    countryCode: s.country,
    orderbookId: s.orderbookId,
    changePercent: round(s.change, 4),
  }));
}

// Indices beyond the universe's, so the world map has a dot on most exchanges.
const WORLD: DemoIndex[] = [
  ...INDICES,
  { orderbookId: "18999", name: "OBX", country: "NO", price: 1488.2, change: 0.0044 },
  { orderbookId: "18983", name: "CAC 40", country: "FR", price: 8172.4, change: 0.0019 },
  { orderbookId: "18984", name: "AEX", country: "NL", price: 951.6, change: 0.0026 },
  { orderbookId: "18986", name: "Dow Jones", country: "US", price: 47562.1, change: 0.0033 },
  { orderbookId: "18989", name: "S&P/TSX", country: "CA", price: 30211.8, change: 0.0029 },
  { orderbookId: "18991", name: "Hang Seng", country: "HK", price: 26105.3, change: -0.0087 },
  { orderbookId: "18992", name: "KOSPI", country: "KR", price: 4012.7, change: 0.0112 },
  { orderbookId: "18993", name: "Nifty 50", country: "IN", price: 25841.2, change: 0.0038 },
  { orderbookId: "18994", name: "FTSE MIB", country: "IT", price: 43518.9, change: -0.0011 },
];

const worldIndex = (id: string) => WORLD.find((w) => w.orderbookId === id);

function overviews(): MarketOverview[] {
  const widget = (type: string, name: string, countries: string[], x: number) => ({
    type,
    name,
    configuration: null,
    settings: null,
    position: { x, y: 0 },
    data: {
      orderbooks: WORLD.filter((w) => countries.includes(w.country)).map((w) => ({
        orderbookId: w.orderbookId,
      })),
    },
  });
  return [
    {
      id: "default",
      title: "Översikt",
      active: true,
      layoutMode: "DEFAULT",
      generation: 1,
      hasMap: true,
      widgets: [
        widget(OverviewWidget.NordicIndices, "Norden", ["SE", "NO", "DK", "FI"], 0),
        widget(OverviewWidget.EuropeIndices, "Europa", ["DE", "FR", "GB", "NL", "IT"], 1),
        widget(OverviewWidget.WorldIndices, "Världen", ["US", "CA", "JP", "HK", "KR", "IN"], 2),
      ],
    },
  ];
}

function overviewChart(id: string): OverviewChartResponse {
  const x: Priced & { name: string } = worldIndex(id) ?? findInstrument(id) ?? WORLD[0];
  const points = intraday(x, 1, 5);
  return {
    id,
    name: x.name,
    shortName: "ticker" in x ? (x as DemoInstrument).ticker : shortName(x as DemoIndex),
    fromDate: new Date(points[0].t).toISOString(),
    toDate: new Date(points.at(-1)!.t).toISOString(),
    dataSerie: points.map((p) => ({ x: p.t, y: round(p.price, 2) })),
    orderbook: {
      orderbookId: id,
      name: x.name,
      currency: "SEK",
      countryCode: x.country,
      instrumentType: "INDEX",
      instrumentSubType: null,
      closingPrice: round(prevClose(x), 2),
      priceThreeMonthsAgo: round(historicalClosingPrices(x).threeMonths, 2),
      priceStartOfYear: round(historicalClosingPrices(x).startOfYear, 2),
      lastPrice: x.price,
      updated: Date.now(),
    },
  };
}

// ---- Stock screener ----

const held = new Set(HOLDINGS.map((h) => h.orderbookId));

export function screened(i: DemoInstrument): ScreenedStock {
  const own = owners(i);
  const week = ownersChangeWeek(i);
  const month = week * 2.4 + pick(i.orderbookId, "own1m", -0.004, 0.01);
  const sek = i.marketCap;
  return {
    orderbookId: i.orderbookId,
    companyId: `c${i.orderbookId}`,
    type: i.type,
    name: i.name,
    shortName: i.ticker,
    currency: i.currency,
    countryCode: i.country,
    marketPlaceCode: i.country === "US" ? "XNAS" : "XSTO",
    hasPosition: held.has(i.orderbookId),
    hasAnalysis: true,
    lastPrice: i.price,
    // The stock filter sends ratios, unlike quotes.
    oneDayChangePercent: round(i.change, 4),
    oneWeekChangePercent: round(returnOver(i, 5), 4),
    oneMonthChangePercent: round(returnOver(i, 21), 4),
    startOfYearChangePercent: round(i.price / historicalClosingPrices(i).startOfYear - 1, 4),
    oneYearChangePercent: round(returnOver(i, 252), 4),
    priceEarningsRatio: i.pe,
    directYield: i.yield,
    marketCapitalization: sek,
    marketCap: sek,
    numberOfOwners: own,
    ownersChangeOneWeek: round(week, 4),
    ownersChangeOneWeekAbsolute: Math.round(own - own / (1 + week)),
    ownersChangeOneMonth: round(month, 4),
    totalValueTraded: Math.round(volumeToday(i) * i.price * FX[i.currency]),
    totalVolumeTraded: volumeToday(i),
    lastPriceUpdated: Date.now(),
  };
}

const FILTER_OPTIONS = { countryCodes: [], marketPlaces: [], sectors: [] };

function screenStocks(req: DemoRequest): ScreenStocksResponse {
  const body = req.body as {
    filter: { nameQuery?: string; numberOfOwners?: { minValue?: number } };
    offset: number;
    limit: number;
    sortBy: { field: string; order: "asc" | "desc" };
  };
  const q = body.filter.nameQuery?.toLowerCase();
  const min = body.filter.numberOfOwners?.minValue ?? 0;
  const rows = stocks()
    .map(screened)
    .filter((s) => (!q || s.name.toLowerCase().includes(q)) && (s.numberOfOwners ?? 0) >= min)
    .sort(
      (a, b) =>
        ((Number(b[body.sortBy.field]) || 0) - (Number(a[body.sortBy.field]) || 0)) *
        (body.sortBy.order === "desc" ? 1 : -1),
    );
  return {
    stocks: rows.slice(body.offset, body.offset + body.limit),
    filter: body.filter,
    pagination: { offset: body.offset, limit: body.limit },
    sortBy: body.sortBy,
    totalNumberOfOrderbooks: rows.length,
    filterOptions: FILTER_OPTIONS,
  };
}

function themeStocks(req: DemoRequest): ThemeStocksResponse {
  const body = req.body as {
    orderbookIds: string[];
    sortBy: { field: string; order: "asc" | "desc" };
  };
  return {
    stocks: body.orderbookIds.flatMap((id) => {
      const i = findInstrument(id);
      return i ? [screened(i)] : [];
    }),
    sortBy: body.sortBy,
  };
}

function gainersLosers(): GainersLosersResponse {
  const movers = stocks()
    .map((i) => ({
      orderbookId: i.orderbookId,
      type: "STOCK",
      name: i.name,
      countryCode: i.country,
      currency: i.currency,
      hasPosition: held.has(i.orderbookId),
      lastPrice: i.price,
      oneDayChangePercent: round(i.change, 4),
      totalValueTraded: Math.round(volumeToday(i) * i.price * FX[i.currency]),
      lastPriceUpdated: Date.now(),
    }))
    .sort((a, b) => b.oneDayChangePercent - a.oneDayChangePercent);
  return {
    gainers: movers.filter((m) => m.oneDayChangePercent > 0).slice(0, 10),
    losers: movers
      .filter((m) => m.oneDayChangePercent < 0)
      .reverse()
      .slice(0, 10),
    numberOfGainers: 214,
    numberOfLosers: 141,
    numberOfNeutrals: 38,
  };
}

// ---- Search ----

function search(req: DemoRequest): SearchResponse {
  const body = req.body as {
    query: string;
    searchFilter: { types: SearchResponse["searchFilter"]["types"] };
    pagination?: { from: number; size: number };
  };
  const q = body.query.toLowerCase();
  const hits: SearchHit[] = allInstruments()
    .filter((i) => i.name.toLowerCase().includes(q) || i.ticker.toLowerCase().includes(q))
    .slice(0, body.pagination?.size ?? 12)
    .map((i) => ({
      type:
        i.type === InstrumentType.Stock
          ? "STOCK"
          : i.type === InstrumentType.Fund
            ? "FUND"
            : "EXCHANGE_TRADED_FUND",
      title: i.name,
      highlightedTitle: i.name,
      description: i.ticker,
      highlightedDescription: i.ticker,
      path: null,
      flagCode: i.country,
      orderBookId: i.orderbookId,
      urlSlugName: null,
      tradeable: true,
      sellable: true,
      buyable: true,
      price: {
        last: i.price.toFixed(2).replace(".", ","),
        currency: i.currency,
        todayChangePercent: (i.change * 100).toFixed(2).replace(".", ","),
        todayChangeValue: (i.price - prevClose(i)).toFixed(2).replace(".", ","),
        todayChangeDirection: direction(i.change),
        threeMonthsAgoChangePercent: (returnOver(i, 63) * 100).toFixed(2).replace(".", ","),
        threeMonthsAgoChangeDirection: direction(returnOver(i, 63)),
        spread: null,
      },
      stockSectors: [],
      fundTags: [],
      marketPlaceName: i.marketplace,
      subType: null,
      highlightedSubType: null,
    }));
  return {
    totalNumberOfHits: hits.length,
    hits,
    searchQuery: body.query,
    searchFilter: body.searchFilter,
    facets: { types: [] },
    pagination: { from: 0, size: hits.length },
  };
}

// ---- Alerts and currency ----

function alerts(): AlertsResponse {
  const priceAlert = (id: string, factor: number) => {
    const i = findInstrument(id)!;
    return {
      messageTypes: ["PUSH_NOTIFICATION"],
      orderbookId: id,
      name: i.name,
      price: round(i.price * factor, 0),
      currency: i.currency,
      created: date(Date.now() - 9 * DAY),
    };
  };
  return {
    priceAlerts: [priceAlert("5260", 1.08), priceAlert("4478", 0.9)],
    percentAlerts: [],
    newsAlerts: [],
  };
}

const exchangeRates = (): ExchangeRate[] =>
  (["USD", "EUR"] as const).map((currency) => ({
    orderbookId: currency === "USD" ? "19000" : "18998",
    currency,
    flagCode: currency === "USD" ? "US" : "EU",
    buyPrice: (FX[currency] * 1.0025).toFixed(4),
    sellPrice: (FX[currency] * 0.9975).toFixed(4),
    updated: new Date().toISOString(),
  }));

export const listRoutes: Route[] = [
  get(/^\/_api\/watchlist\/watchlist$/, watchlists),
  post(/^\/_api\/watchlist\/data\/by-id$/, watchlistData),
  get(/^\/_api\/user-note\/?$/, notes),
  get(/^\/_api\/user-note\/available-orderbooks$/, () =>
    [...NOTED].map((orderbookId) => ({
      orderbookId,
      instrumentName: findInstrument(orderbookId)?.name ?? "",
    })),
  ),
  get(/^\/_api\/alert\/alerts$/, alerts),
  get(/^\/_api\/alert\/alerts\/triggered-alerts$/, () => []),
  get(/^\/_api\/market-index\/header-index$/, headerIndices),
  get(/^\/_api\/market-index\/(\d+)\/constituents$/, (_req, m) => constituents(m[1])),
  get(/^\/_api\/market-overview\/overviews$/, overviews),
  get(/^\/_api\/market-overview\/chart\/(\d+)\/([a-z_]+)$/, (_req, m) => overviewChart(m[1])),
  post(/^\/_api\/market-stock-filter\/stocks$/, screenStocks),
  post(/^\/_api\/market-stock-filter\/stocks\/theme-stocks$/, themeStocks),
  post(/^\/_api\/market-stock-filter\/stocks\/gainers-losers$/, gainersLosers),
  post(/^\/_api\/search\/filtered-search$/, search),
  get(/^\/_api\/trading\/rest\/exchangerates$/, exchangeRates),
];
