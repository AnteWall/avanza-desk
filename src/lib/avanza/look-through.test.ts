import type { EtfDetailsResponse } from "avanza-ts";

import type { Instrument } from "./instrument";
import { loadLookThrough, type LookThroughSources } from "./look-through";

const point = (name: string, y: number, extra: object = {}) => ({
  name,
  y,
  countryCode: null,
  isin: null,
  orderbookId: null,
  type: null,
  ...extra,
});

const fund = (data: object) => ({ kind: "fund", fund: data }) as unknown as Instrument;

const sources = (funds: Record<string, Instrument>): LookThroughSources => ({
  instrument: async (id) => funds[id]!,
  etf: async () => ({}) as EtfDetailsResponse,
});

test("a fund's percent allocations become fractions", async () => {
  const get = sources({
    f: fund({
      countryChartData: [
        point("Sverige", 60, { countryCode: "SE" }),
        point("USA", 40, { countryCode: "US" }),
      ],
      sectorChartData: [point("Teknik", 100)],
      holdingChartData: [point("Volvo", 5, { orderbookId: "5269" })],
    }),
  });
  const result = await loadLookThrough("f", "FUND", get);
  expect(result?.countries.map((c) => [c.key, c.name, c.weight])).toEqual([
    ["SE", "Sweden", 0.6],
    ["US", "United States", 0.4],
  ]);
  expect(result?.holdings).toMatchObject([{ key: "5269", weight: 0.05 }]);
});

test("a fund of funds opens its funds up and borrows their countries", async () => {
  const get = sources({
    outer: fund({
      countryChartData: [],
      sectorChartData: [point("Teknik", 100)],
      holdingChartData: [
        point("Inner fund", 50, { orderbookId: "inner", type: "FUND" }),
        point("Volvo", 50, { orderbookId: "5269", type: "STOCK" }),
      ],
    }),
    inner: fund({
      countryChartData: [point("USA", 100, { countryCode: "US" })],
      sectorChartData: [point("Hälsa", 100)],
      holdingChartData: [point("Apple", 20, { orderbookId: "aapl" })],
    }),
  });
  const result = await loadLookThrough("outer", "FUND", get);
  expect(result?.holdings.map((h) => [h.key, h.weight])).toEqual([
    ["aapl", 0.1],
    ["5269", 0.5],
  ]);
  expect(result?.countries.map((c) => [c.key, c.weight])).toEqual([["US", 0.5]]);
  // The outer fund reports its own sectors, so the inner one's aren't added on top.
  expect(result?.sectors.map((s) => s.name)).toEqual(["Teknik"]);
});

test("nesting stops at the depth cap instead of looping on a cycle", async () => {
  const self = fund({
    countryChartData: [],
    sectorChartData: [],
    holdingChartData: [point("Itself", 100, { orderbookId: "loop", type: "FUND" })],
  });
  const result = await loadLookThrough("loop", "FUND", sources({ loop: self }));
  expect(result?.holdings).toMatchObject([{ key: "loop", weight: 1 }]);
});
