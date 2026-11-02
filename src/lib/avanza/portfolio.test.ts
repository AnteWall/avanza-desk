import type { PositionListResponse } from "avanza-ts";

import {
  aggregateHoldings,
  dailyPerformance,
  holding,
  lookThrough,
  slices,
  type Exposure,
  type Holding,
} from "./portfolio";

const amount = (value: number) => ({
  value,
  unit: "SEK",
  unitType: "MONETARY",
  decimalPrecision: 2,
});
const position = (ob: string, volume: number, avg: number) => ({
  instrument: { orderbook: { id: ob } },
  volume: amount(volume),
  averageAcquiredPriceInstrumentCurrency: amount(avg),
});

test("holding weights the average price by volume across accounts", () => {
  const positions = {
    withOrderbook: [position("1", 10, 100), position("1", 30, 200), position("2", 5, 50)],
  } as unknown as PositionListResponse;
  expect(holding(positions, "1")).toEqual({ volume: 40, averagePrice: 175 });
  expect(holding(positions, "3")).toBeNull();
});

test("dailyPerformance sums today's change against yesterday's value", () => {
  const positions = {
    withOrderbook: [
      { value: amount(1100), lastTradingDayPerformance: { absolute: amount(100) } },
      { value: amount(900), lastTradingDayPerformance: { absolute: amount(-50) } },
      { value: amount(500) },
    ],
    withoutOrderbook: [],
    cashPositions: [{ totalBalance: amount(250) }],
  } as unknown as PositionListResponse;
  expect(dailyPerformance(positions)).toEqual({
    value: 2500,
    change: 50,
    ratio: 50 / 2450,
    cash: 250,
  });
});

test("aggregateHoldings merges one instrument across accounts, P/L only where cost is known", () => {
  const p = (id: string, ob: string, account: string, value: number, cost?: number) => ({
    id,
    account: { name: account },
    instrument: { name: ob, type: "STOCK", currency: "SEK", orderbook: { id: ob } },
    volume: amount(1),
    value: amount(value),
    acquiredValue: cost == null ? null : amount(cost),
    lastTradingDayPerformance: { absolute: amount(1) },
  });
  const [a, b] = aggregateHoldings({
    withOrderbook: [
      p("1", "A", "ISK", 100, 80),
      p("2", "B", "ISK", 500),
      p("3", "A", "KF", 300, 200),
    ],
    withoutOrderbook: [],
  } as unknown as PositionListResponse);
  expect(b).toMatchObject({ key: "A", value: 400, cost: 280, profit: 120, today: 2 });
  expect(b.accounts).toEqual(["ISK", "KF"]);
  expect(a).toMatchObject({ key: "B", value: 500, cost: 0, profit: 0 });
});

test("lookThrough spreads each holding by fractions and leaves the uncovered part as the rest", () => {
  const h = (key: string, value: number) => ({ key, value }) as Holding;
  const parts: Record<string, Exposure[] | undefined> = {
    fund: [
      { name: "Apple", key: "AAPL", weight: 0.1 },
      { name: "Microsoft", key: "MSFT", weight: 0.05 },
    ],
    stock: [{ name: "Apple Inc", key: "AAPL", weight: 1 }],
  };
  const result = lookThrough(
    [h("fund", 1000), h("stock", 200), h("cert", 50)],
    (x) => parts[x.key],
  );
  // Apple merges by key across the fund and the direct holding, keeping the first name.
  expect(result.map((s) => [s.key, s.name, s.value])).toEqual([
    ["AAPL", "Apple", 300],
    ["MSFT", "Microsoft", 50],
    ["Unclassified", "Unclassified", 900],
  ]);
  expect(result.reduce((sum, s) => sum + s.share, 0)).toBeCloseTo(1);
});

test("lookThrough caps overlapping weights at the holding's value", () => {
  const result = lookThrough([{ key: "x", value: 100 } as Holding], () => [
    { name: "A", weight: 0.7 },
    { name: "B", weight: 0.7 },
  ]);
  expect(result.map((s) => Math.round(s.value))).toEqual([70, 30]);
});

test("slices puts the rest last even when it is largest", () => {
  expect(
    slices([
      { name: "Unclassified", value: 90 },
      { name: "SE", value: 10 },
    ]).map((s) => s.name),
  ).toEqual(["SE", "Unclassified"]);
});
