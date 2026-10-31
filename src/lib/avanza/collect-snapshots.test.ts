import { expect, test } from "vitest";

import { stockRows } from "./collect-snapshots";

test("turns fundamentals into snapshot rows and skips what is missing", () => {
  const f = {
    shorts: {
      shortSellingHistory: [
        { timestamp: 1, ratio: 0.5 },
        { timestamp: 2, ratio: 1.2 },
      ],
    },
    targets: { averagePriceTarget: 120, numberOfEstimates: 4 },
    recommendations: {
      numberOfBuy: 2,
      numberOfOutperform: 1,
      numberOfHold: 1,
      numberOfSell: 0,
      numberOfUnderperform: 0,
    },
    owners: null,
    insiders: null,
    events: null,
  } as never;
  expect(stockRows("x", f, { last: 100 } as never)).toEqual([
    { kind: "short", key: "x", value: 1.2 },
    { kind: "target", key: "x", value: 120 },
    { kind: "analysts", key: "x", value: 4 },
    { kind: "consensus", key: "x", value: 0.75 },
    { kind: "price", key: "x", value: 100 },
  ]);
});
