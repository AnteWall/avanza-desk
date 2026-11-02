import type { EtfDetailsResponse } from "avanza-ts";

import { formatCountry } from "@/lib/format";

import { InstrumentType } from "./codes";
import type { Instrument } from "./instrument";
import type { Exposure } from "./portfolio";

/** What one instrument is exposed to, as fractions of its value. */
export type LookThrough = {
  countries: Exposure[];
  sectors: Exposure[];
  /**
   * Underlying holdings, keyed by orderbook id where Avanza lists the company so direct and fund
   * holdings merge. Funds and ETFs disclose only their largest, so this rarely sums to 1.
   */
  holdings: Exposure[];
};

/** Where the loader gets its raw data; the query layer passes cached fetches. */
export type LookThroughSources = {
  instrument: (orderbookId: string, type: string) => Promise<Instrument>;
  etf: (orderbookId: string) => Promise<EtfDetailsResponse>;
};

type Raw = {
  countries: Exposure[];
  sectors: Exposure[];
  holdings: (Exposure & { type?: string })[];
};

/** Instrument types whose holdings we can look into. */
export const lookThroughTypes = new Set<string>([
  InstrumentType.Stock,
  InstrumentType.Fund,
  InstrumentType.Etf,
]);

// Fund-of-funds rarely nest deeper than two levels; the cap also guards against cycles.
const maxDepth = 2;

const country = (code: string | null | undefined, weight: number, fallback?: string) => ({
  name: code ? formatCountry(code) : (fallback ?? code ?? ""),
  key: code ? code.toUpperCase() : fallback,
  code: code || undefined,
  weight,
});

const sum = (xs: readonly Exposure[]) => xs.reduce((s, x) => s + Math.max(x.weight, 0), 0);

async function raw(
  orderbookId: string,
  type: string,
  get: LookThroughSources,
): Promise<Raw | null> {
  if (type === InstrumentType.Fund) {
    const fund = (await get.instrument(orderbookId, type)).fund;
    if (!fund) return null;
    return {
      countries: fund.countryChartData.map((p) => country(p.countryCode, p.y, p.name)),
      sectors: fund.sectorChartData.map((p) => ({ name: p.name, weight: p.y })),
      holdings: fund.holdingChartData.map((p) => ({
        name: p.name,
        key: p.orderbookId ?? p.isin ?? p.name,
        code: p.countryCode ?? undefined,
        orderbookId: p.orderbookId ?? undefined,
        type: p.type ?? undefined,
        weight: p.y,
      })),
    };
  }
  if (type === InstrumentType.Etf) {
    const etf = await get.etf(orderbookId);
    return {
      countries: etf.countryExposures.exposures.map((e) =>
        country(e.countryCode, e.weight, e.countryName),
      ),
      sectors: etf.sectorExposures.exposures.map((e) => ({ name: e.sector, weight: e.weight })),
      holdings: etf.fundExposures.map((e) => ({
        name: e.name,
        key: e.orderbookId ?? e.name,
        code: e.countryCode ?? undefined,
        orderbookId: e.orderbookId ?? undefined,
        type: e.instrumentType ?? undefined,
        weight: e.exposure,
      })),
    };
  }
  return null;
}

/**
 * Look-through of one instrument. Stocks are their own single holding. Funds and ETFs use their
 * reported allocation; holdings that are themselves funds are opened up into their holdings,
 * and fill in countries or sectors the outer fund doesn't report.
 */
export async function loadLookThrough(
  orderbookId: string,
  type: string,
  get: LookThroughSources,
  depth = 0,
): Promise<LookThrough | null> {
  if (type === InstrumentType.Stock) {
    const stock = await get.instrument(orderbookId, type);
    return {
      countries: stock.countryCode ? [country(stock.countryCode, 1)] : [],
      sectors: stock.sector ? [{ name: stock.sector, weight: 1 }] : [],
      holdings: [
        { name: stock.name, key: orderbookId, code: stock.countryCode, orderbookId, weight: 1 },
      ],
    };
  }
  const data = await raw(orderbookId, type, get);
  if (!data) return null;

  // Funds report percent, some ETF feeds fractions: anything summing past 1.5 must be percent.
  const scale =
    Math.max(sum(data.countries), sum(data.sectors), sum(data.holdings)) > 1.5 ? 0.01 : 1;
  const scaled = (xs: readonly Exposure[]) => xs.map((x) => ({ ...x, weight: x.weight * scale }));
  const result: LookThrough = {
    countries: scaled(data.countries),
    sectors: scaled(data.sectors),
    holdings: [],
  };

  const nested = await Promise.all(
    scaled(data.holdings).map(async (h, i) => {
      const t = data.holdings[i]?.type?.toUpperCase();
      const fund = t === InstrumentType.Fund || t === InstrumentType.Etf;
      if (!fund || !h.orderbookId || depth >= maxDepth) return { h, inner: null };
      // A nested fund we can't load stays a single holding rather than failing the whole fund.
      const inner = await loadLookThrough(h.orderbookId, t, get, depth + 1).catch(() => null);
      return { h, inner };
    }),
  );
  const borrowCountries = sum(result.countries) === 0;
  const borrowSectors = sum(result.sectors) === 0;
  for (const { h, inner } of nested) {
    const within = (xs: readonly Exposure[]) =>
      xs.map((x) => ({ ...x, weight: x.weight * h.weight }));
    if (inner?.holdings.length) result.holdings.push(...within(inner.holdings));
    else result.holdings.push(h);
    if (inner && borrowCountries) result.countries.push(...within(inner.countries));
    if (inner && borrowSectors) result.sectors.push(...within(inner.sectors));
  }
  return result;
}
