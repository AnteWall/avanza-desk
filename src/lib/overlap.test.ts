import { expect, test } from "vitest";

import { fundPairs, sharedHoldings, type Source } from "./overlap";

const src = (key: string, type: string, value: number, parts: [string, number][]) =>
  ({
    key,
    name: key,
    type,
    value,
    parts: parts.map(([k, weight]) => ({ name: k, key: k, weight })),
  }) as Source;

const sources = [
  src("F1", "FUND", 1000, [
    ["apple", 0.05],
    ["msft", 0.04],
    ["nvda", 0.03],
  ]),
  src("F2", "EXCHANGE_TRADED_FUND", 500, [
    ["apple", 0.02],
    ["msft", 0.06],
  ]),
  src("F3", "FUND", 100, [["volvo", 0.1]]),
  src("apple", "STOCK", 200, [["apple", 1]]),
];

test("pair overlap sums the smaller weight of shared holdings, stocks excluded", () => {
  const pairs = fundPairs(sources);
  expect(pairs).toHaveLength(1);
  expect(pairs[0]!.a.key).toBe("F1");
  expect(pairs[0]!.overlap).toBeCloseTo(0.06);
});

test("shared holdings add direct and fund exposure in SEK", () => {
  const shared = sharedHoldings(sources);
  expect(shared.map((s) => s.key)).toEqual(["apple", "msft"]);
  expect(shared[0]!.value).toBeCloseTo(50 + 10 + 200);
  expect(shared[0]!.sources).toEqual(["F1", "F2", "apple"]);
});
