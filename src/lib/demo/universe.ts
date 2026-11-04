import { InstrumentType } from "@/lib/avanza/codes";

// The demo's instruments: real companies (so logos resolve by ISIN) with made-up prices.
// Every fixture reads from here, so a holding, its quote, its chart and its news agree.

export type DemoInstrument = {
  orderbookId: string;
  name: string;
  ticker: string;
  isin: string;
  type: InstrumentType;
  currency: "SEK" | "USD" | "EUR";
  country: "SE" | "US" | "CH" | "GB" | "LU" | "DK" | "FI";
  marketplace: string;
  sector: string;
  /** Last price in `currency`. */
  price: number;
  /** Today's change as a fraction (0.0124 = +1,24 %). */
  change: number;
  /** Market cap in SEK. */
  marketCap: number;
  /** Price/earnings and dividend yield, for key ratios and the screener. */
  pe?: number;
  yield?: number;
};

const stock = (
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
  country: DemoInstrument["country"] = "SE",
): DemoInstrument => ({
  orderbookId,
  name,
  ticker,
  isin,
  type: InstrumentType.Stock,
  currency: country === "US" ? "USD" : "SEK",
  country,
  marketplace: country === "US" ? "NASDAQ" : "Stockholmsbörsen",
  sector,
  price,
  change,
  marketCap: marketCapBn * 1e9,
  pe,
  yield: dividendYield,
});

export const STOCKS: DemoInstrument[] = [
  stock("5269", "Volvo B", "VOLV B", "SE0000115446", "Industri", 268.4, 0.0142, 546, 11.8, 0.067),
  stock(
    "5240",
    "Ericsson B",
    "ERIC B",
    "SE0000108656",
    "Telekom",
    84.12,
    -0.0183,
    280,
    15.2,
    0.033,
  ),
  stock("5247", "Investor B", "INVE B", "SE0015811963", "Finans", 302.6, 0.0061, 927, 6.4, 0.016),
  stock(
    "5234",
    "Atlas Copco A",
    "ATCO A",
    "SE0017486889",
    "Industri",
    171.35,
    0.0215,
    835,
    29.1,
    0.017,
  ),
  stock("5260", "Saab B", "SAAB B", "SE0021921269", "Industri", 521.4, 0.0312, 280, 52.3, 0.0077),
  stock(
    "5364",
    "H&M B",
    "HM B",
    "SE0000106270",
    "Sällanköpsvaror",
    158.9,
    -0.0074,
    258,
    24.6,
    0.042,
  ),
  stock(
    "5447",
    "ABB Ltd",
    "ABB",
    "CH0012221716",
    "Industri",
    612.4,
    0.0098,
    1140,
    28.7,
    0.015,
    "CH",
  ),
  stock(
    "5361",
    "AstraZeneca",
    "AZN",
    "GB0009895292",
    "Hälsovård",
    1512.0,
    0.0036,
    2340,
    31.2,
    0.021,
    "GB",
  ),
  stock(
    "549768",
    "Evolution",
    "EVO",
    "SE0012673267",
    "Sällanköpsvaror",
    762.6,
    -0.0274,
    157,
    13.1,
    0.039,
  ),
  stock("5255", "SEB A", "SEB A", "SE0000148884", "Finans", 171.05, 0.0047, 357, 9.2, 0.068),
  stock("5241", "Swedbank A", "SWED A", "SE0000242455", "Finans", 248.3, 0.0082, 279, 8.4, 0.088),
  stock(
    "5271",
    "Assa Abloy B",
    "ASSA B",
    "SE0007100581",
    "Industri",
    334.2,
    0.0119,
    371,
    23.9,
    0.016,
  ),
  stock("4928", "Sandvik", "SAND", "SE0000667891", "Industri", 232.7, 0.0164, 292, 19.3, 0.025),
  stock("5580", "Alfa Laval", "ALFA", "SE0000695876", "Industri", 452.1, -0.0105, 187, 27.4, 0.017),
  stock("5568", "Boliden", "BOL", "SE0020050417", "Material", 389.6, 0.0418, 107, 14.8, 0.019),
  stock("5254", "Hexagon B", "HEXA B", "SE0015961909", "Teknik", 108.45, 0.0187, 292, 22.1, 0.013),
  stock("982295", "EQT", "EQT", "SE0012853455", "Finans", 318.9, 0.0228, 377, 35.6, 0.013),
  stock(
    "5246",
    "Telia Company",
    "TELIA",
    "SE0000667925",
    "Telekom",
    34.86,
    -0.0028,
    137,
    18.7,
    0.057,
  ),
  stock(
    "5263",
    "Essity B",
    "ESSITY B",
    "SE0009922164",
    "Dagligvaror",
    284.6,
    -0.0042,
    201,
    16.9,
    0.028,
  ),
  stock(
    "5249",
    "Nibe Industrier B",
    "NIBE B",
    "SE0015988019",
    "Industri",
    41.38,
    -0.0311,
    83,
    41.2,
    0.015,
  ),
  stock(
    "1102542",
    "Spotify Technology",
    "SPOT",
    "LU1778762911",
    "Teknik",
    702.2,
    0.0263,
    1510,
    98.4,
    0,
    "US",
  ),
  stock(
    "4478",
    "NVIDIA",
    "NVDA",
    "US67066G1040",
    "Teknik",
    204.85,
    0.0194,
    52800,
    46.2,
    0.0002,
    "US",
  ),
  stock(
    "3873",
    "Microsoft",
    "MSFT",
    "US5949181045",
    "Teknik",
    521.3,
    0.0063,
    40900,
    37.8,
    0.0064,
    "US",
  ),
  stock(
    "238449",
    "Apple",
    "AAPL",
    "US0378331005",
    "Teknik",
    268.9,
    -0.0051,
    42600,
    35.1,
    0.0039,
    "US",
  ),
  stock(
    "238656",
    "Tesla",
    "TSLA",
    "US88160R1014",
    "Sällanköpsvaror",
    438.9,
    -0.0264,
    15100,
    162,
    0,
    "US",
  ),
];

const fund = (
  orderbookId: string,
  name: string,
  isin: string,
  sector: string,
  price: number,
  change: number,
): DemoInstrument => ({
  orderbookId,
  name,
  ticker: name,
  isin,
  type: InstrumentType.Fund,
  currency: "SEK",
  country: "SE",
  marketplace: "Fondmarknaden",
  sector,
  price,
  change,
  marketCap: 0,
});

export const FUNDS: DemoInstrument[] = [
  fund("878733", "Avanza Global", "SE0011527613", "Global", 248.31, 0.0058),
  fund("41567", "Avanza Zero", "SE0000736092", "Sverige", 1104.6, 0.0071),
  fund("1949", "Spiltan Investmentbolag", "SE0002699421", "Sverige", 612.08, 0.0049),
  fund(
    "325406",
    "Länsförsäkringar Tillväxtmarknad Indexnära",
    "SE0005993078",
    "Tillväxtmarknader",
    168.22,
    -0.0034,
  ),
];

export const ETFS: DemoInstrument[] = [
  {
    orderbookId: "5510",
    name: "XACT OMXS30",
    ticker: "XACT OMXS30",
    isin: "SE0001056045",
    type: InstrumentType.Etf,
    currency: "SEK",
    country: "SE",
    marketplace: "Stockholmsbörsen",
    sector: "Sverige",
    price: 312.45,
    change: 0.0064,
    marketCap: 0,
  },
];

export type DemoIndex = {
  orderbookId: string;
  name: string;
  country: string;
  price: number;
  change: number;
};

export const INDICES: DemoIndex[] = [
  { orderbookId: "19002", name: "OMXS30", country: "SE", price: 2718.42, change: 0.0064 },
  { orderbookId: "18988", name: "OMX Stockholm PI", country: "SE", price: 1104.87, change: 0.0051 },
  {
    orderbookId: "19005",
    name: "OMX Copenhagen 25",
    country: "DK",
    price: 1621.3,
    change: -0.0032,
  },
  { orderbookId: "19004", name: "OMX Helsinki 25", country: "FI", price: 5132.9, change: 0.0021 },
  { orderbookId: "18985", name: "S&P 500", country: "US", price: 6871.2, change: 0.0041 },
  { orderbookId: "18990", name: "Nasdaq 100", country: "US", price: 25612.4, change: 0.0078 },
  { orderbookId: "18981", name: "DAX", country: "DE", price: 24110.5, change: 0.0012 },
  { orderbookId: "18987", name: "FTSE 100", country: "GB", price: 9688.1, change: -0.0018 },
  { orderbookId: "18982", name: "Nikkei 225", country: "JP", price: 51280.0, change: 0.0136 },
];

export const INSTRUMENTS: DemoInstrument[] = [...STOCKS, ...FUNDS, ...ETFS];

const byId = new Map(INSTRUMENTS.map((i) => [i.orderbookId, i]));

/** The instrument with this orderbook id; an unknown id gets the first stock, so no page breaks. */
export const instrument = (orderbookId: string) => byId.get(orderbookId) ?? STOCKS[0];
export const index = (orderbookId: string) => INDICES.find((i) => i.orderbookId === orderbookId);

/** SEK per unit of each currency. */
export const FX: Record<DemoInstrument["currency"], number> = { SEK: 1, USD: 9.42, EUR: 10.96 };
