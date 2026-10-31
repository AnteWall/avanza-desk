import {
  AvanzaHttpError,
  type FundGuide,
  type ListedInstrumentType,
  type StockInfo,
} from "avanza-ts";

import { avanza } from "./client";

/** What every panel needs to know about the focused instrument, whatever its type. */
export type Instrument = {
  kind: "listed" | "fund";
  orderbookId: string;
  name: string;
  shortName: string;
  isin: string;
  currency: string;
  countryCode?: string;
  marketPlaceName?: string;
  /** Stocks only: Avanza's top-level sector, e.g. "Industri". */
  sector?: string;
  /** Closing prices one week, month, … ago (`oneWeek`, `startOfYear`), for period returns. */
  closingPrices?: Readonly<Record<string, number | string>>;
  /** Stocks only: key ratios, dividend and report dates, straight from Avanza's stock guide. */
  stock?: StockInfo;
  /** Funds only: NAV pricing and development, straight from Avanza's fund guide. */
  fund?: FundGuide;
};

// Avanza's instrument type codes (watchlists, positions, search) → the SDK's listed endpoints.
const listedTypes: Record<string, ListedInstrumentType> = {
  CERTIFICATE: "certificate",
  WARRANT: "warrant",
  FUTURE_FORWARD: "futureforward",
  OPTION: "option",
};

async function load(orderbookId: string, type: string, signal?: AbortSignal): Promise<Instrument> {
  if (type === "FUND") {
    const fund = await avanza.funds.guide(orderbookId, signal);
    return {
      kind: "fund",
      orderbookId,
      name: fund.name,
      shortName: fund.name,
      isin: fund.isin,
      currency: fund.currency,
      fund,
    };
  }
  const stock =
    type === "EXCHANGE_TRADED_FUND" || listedTypes[type]
      ? undefined
      : await avanza.market.stock(orderbookId, signal);
  const info =
    stock ??
    (type === "EXCHANGE_TRADED_FUND"
      ? await avanza.market.etf(orderbookId, signal)
      : await avanza.market.instrument(listedTypes[type], orderbookId, signal));
  return {
    kind: "listed",
    orderbookId,
    name: info.name,
    shortName: info.listing.shortName,
    isin: info.isin,
    currency: info.listing.currency,
    countryCode: info.listing.countryCode,
    marketPlaceName: info.listing.marketPlaceName,
    sector: "sectors" in info ? info.sectors[0]?.sectorName : undefined,
    closingPrices: info.historicalClosingPrices,
    stock,
  };
}

// When the type is unknown (default focus, or a code we don't map), try common types in turn.
const probeOrder = ["STOCK", "EXCHANGE_TRADED_FUND", "FUND", "CERTIFICATE"];

const knownTypes = new Set(["STOCK", "FUND", "EXCHANGE_TRADED_FUND", ...Object.keys(listedTypes)]);

export async function loadInstrument(orderbookId: string, type?: string, signal?: AbortSignal) {
  const code = type?.toUpperCase();
  if (code && knownTypes.has(code)) return load(orderbookId, code, signal);
  for (const [i, t] of probeOrder.entries()) {
    try {
      return await load(orderbookId, t, signal);
    } catch (error) {
      if (!(error instanceof AvanzaHttpError) || i === probeOrder.length - 1) throw error;
    }
  }
  throw new Error("unreachable");
}
