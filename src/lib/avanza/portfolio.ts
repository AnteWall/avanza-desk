import type { PositionListResponse, StockPositionKeyRatiosResponse } from "avanza-ts";

/** The user's holding in one orderbook across all accounts, with a volume-weighted average price. */
export function holding(positions: PositionListResponse | undefined, orderbookId: string) {
  let volume = 0;
  let cost = 0;
  for (const p of positions?.withOrderbook ?? []) {
    const avg = p.averageAcquiredPriceInstrumentCurrency?.value;
    if (p.instrument.orderbook?.id !== orderbookId || avg == null) continue;
    volume += p.volume.value;
    cost += p.volume.value * avg;
  }
  return volume ? { volume, averagePrice: cost / volume } : null;
}

/**
 * Today's development across all positions: value now, change since yesterday's close in SEK,
 * and that change as a ratio of yesterday's value. Cash is reported separately and excluded.
 */
export function dailyPerformance(positions: PositionListResponse) {
  let value = 0;
  let change = 0;
  for (const p of positions.withOrderbook) {
    value += p.value.value;
    change += p.lastTradingDayPerformance?.absolute?.value ?? 0;
  }
  const cash = positions.cashPositions.reduce((sum, c) => sum + c.totalBalance.value, 0);
  const yesterday = value - change;
  return { value, change, ratio: yesterday > 0 ? change / yesterday : 0, cash };
}

type Position = PositionListResponse["withOrderbook"][number];

/** One instrument summed over every account that holds it. Values in SEK. */
export type Holding = {
  key: string;
  orderbookId?: string;
  name: string;
  type: string;
  currency: string;
  isin?: string;
  flagCode?: string;
  volume: number;
  value: number;
  /** Profit and cost over the positions with a known acquisition value. */
  profit: number;
  cost: number;
  today: number;
  accounts: string[];
  positionIds: string[];
};

/** Holdings across accounts, largest first. */
export function aggregateHoldings(positions: PositionListResponse): Holding[] {
  const byKey = new Map<string, Holding>();
  for (const p of [...positions.withOrderbook, ...positions.withoutOrderbook] as Position[]) {
    const ob = p.instrument.orderbook;
    const key = ob?.id ?? p.instrument.isin ?? p.instrument.name;
    const h = byKey.get(key) ?? {
      key,
      orderbookId: ob?.id,
      name: p.instrument.name,
      type: p.instrument.type,
      currency: p.instrument.currency,
      isin: p.instrument.isin ?? undefined,
      flagCode: ob?.flagCode ?? undefined,
      volume: 0,
      value: 0,
      profit: 0,
      cost: 0,
      today: 0,
      accounts: [],
      positionIds: [],
    };
    const cost = p.acquiredValue?.value;
    h.volume += p.volume.value;
    h.value += p.value.value;
    if (cost) {
      h.cost += cost;
      h.profit += p.value.value - cost;
    }
    h.today += p.lastTradingDayPerformance?.absolute?.value ?? 0;
    if (!h.accounts.includes(p.account.name)) h.accounts.push(p.account.name);
    h.positionIds.push(p.id);
    byKey.set(key, h);
  }
  return [...byKey.values()].sort((a, b) => b.value - a.value);
}

/**
 * A share of something (a country, a sector, an underlying company). `weight` is a fraction of
 * the instrument; `key` merges the same thing reported under different names (an ISIN).
 */
export type Exposure = {
  name: string;
  weight: number;
  key?: string;
  code?: string;
  orderbookId?: string;
};
export type Slice = { key: string; name: string; code?: string; value: number; share: number };
type Entry = { key: string; name: string; code?: string; value: number };

export const unclassified = "Unclassified";

/** Rescales weights in any unit so they sum to 1. Empty when there is nothing to scale. */
export function fractions(exposures: readonly Exposure[]): Exposure[] {
  const total = exposures.reduce((sum, e) => sum + Math.max(e.weight, 0), 0);
  return total > 0 ? exposures.map((e) => ({ ...e, weight: Math.max(e.weight, 0) / total })) : [];
}

/**
 * Value of the holdings on one dimension (country, sector, underlying holding). `partsOf` gives
 * each holding's exposures as fractions; whatever they don't cover (no data, or a fund that only
 * discloses its top holdings) lands in `rest`.
 */
export function lookThrough(
  holdings: readonly Holding[],
  partsOf: (h: Holding) => readonly Exposure[] | undefined,
  rest = unclassified,
): Slice[] {
  const entries: Entry[] = [];
  for (const h of holdings) {
    let covered = 0;
    for (const p of partsOf(h) ?? []) {
      const weight = Math.max(0, Math.min(p.weight, 1 - covered));
      covered += weight;
      entries.push({ key: p.key ?? p.name, name: p.name, code: p.code, value: h.value * weight });
    }
    // Ignore rounding dust from reported weights that sum to 99.9 %.
    if (covered < 0.995) entries.push({ key: rest, name: rest, value: h.value * (1 - covered) });
  }
  return slices(entries, rest);
}

/** Groups entries by key, sums them and adds each one's share of the total. Largest first. */
export function slices(
  entries: readonly (Omit<Entry, "key"> & { key?: string })[],
  rest = unclassified,
): Slice[] {
  const byKey = new Map<string, Slice>();
  for (const e of entries) {
    const key = e.key ?? e.name;
    const s = byKey.get(key) ?? { key, name: e.name, code: e.code, value: 0, share: 0 };
    s.value += e.value;
    s.code ??= e.code;
    byKey.set(key, s);
  }
  const total = entries.reduce((sum, e) => sum + e.value, 0);
  return (
    [...byKey.values()]
      .filter((s) => s.value > 0)
      .map((s) => ({ ...s, share: total ? s.value / total : 0 }))
      // The rest goes last whatever its size: it's a data gap, not an exposure.
      .sort((a, b) => +(a.key === rest) - +(b.key === rest) || b.value - a.value)
  );
}

/** Dividend yield per position id, as a ratio (Avanza sends percent units). */
export function dividendYields(ratios: StockPositionKeyRatiosResponse) {
  return new Map(ratios.map((r) => [r.positionId, r.relativeYearlyDividend.value / 100]));
}

/** A holding's dividend yield: all its positions are the same instrument, so any one will do. */
export function holdingYield(h: Holding, yields: ReadonlyMap<string, number>) {
  for (const id of h.positionIds) if (yields.has(id)) return yields.get(id);
}

const typeLabels: Record<string, string> = {
  STOCK: "Stocks",
  FUND: "Funds",
  EXCHANGE_TRADED_FUND: "ETFs",
  CERTIFICATE: "Certificates",
  WARRANT: "Warrants",
  BOND: "Bonds",
  OPTION: "Options",
  FUTURE_FORWARD: "Futures",
  PREMIUM_BOND: "Premium bonds",
  EQUITY_LINKED_BOND: "Structured products",
};

/** "EXCHANGE_TRADED_FUND" → "ETFs"; unknown codes become "Subscription option" style. */
export const typeLabel = (type: string) =>
  typeLabels[type] ?? type.charAt(0) + type.slice(1).toLowerCase().replaceAll("_", " ");
