import { expect, test } from "vitest";

import { sinceClose, stockholmTime, weightedLine } from "./intraday";

test("sinceClose is each close against the previous close", () => {
  expect(sinceClose([{ timestamp: 1, close: 110 }], 100)[0]!.value).toBeCloseTo(0.1);
  expect(sinceClose([{ timestamp: 1, close: 110 }], null)).toEqual([]);
});

test("sinceClose starts a holding bought today at its buy and nets partial trades", () => {
  const ohlc = [
    { timestamp: 1, close: 100 },
    { timestamp: 2, close: 110 },
    { timestamp: 3, close: 121 },
  ];
  const bought = sinceClose(ohlc, 90, {
    volume: 10,
    fills: [{ timestamp: 2, volume: 10, price: 110 }],
  });
  expect(bought.map((p) => p.timestamp)).toEqual([2, 3]);
  expect(bought[0]!.value).toBeCloseTo(0);
  expect(bought[1]!.value).toBeCloseTo(0.1);

  // Held 10 from 100, bought 10 more at 110: +100 then +210+110 on 1000+1100.
  const added = sinceClose(ohlc, 100, {
    volume: 20,
    fills: [{ timestamp: 2, volume: 10, price: 110 }],
  });
  expect(added.map((p) => p.value)).toEqual([0, 100 / 2100, 320 / 2100]);

  // Sold half of 10 at 110: the sold half's +50 stays, the rest keeps moving.
  const sold = sinceClose(ohlc, 100, {
    volume: 5,
    fills: [{ timestamp: 2, volume: -5, price: 110 }],
  });
  expect(sold.at(-1)!.value).toBeCloseTo((50 + 5 * 21) / 1000);
});

test("weightedLine carries values forward and counts 0 before the first trade", () => {
  const line = weightedLine([
    { weight: 3, points: [{ timestamp: 1, value: 0.04 }] },
    {
      weight: 1,
      points: [
        { timestamp: 2, value: 0.08 },
        { timestamp: 3, value: -0.04 },
      ],
    },
  ]);
  expect(line.map((p) => p.timestamp)).toEqual([1, 2, 3]);
  expect(line[0]!.value).toBeCloseTo(0.03);
  expect(line[1]!.value).toBeCloseTo(0.05);
  expect(line[2]!.value).toBeCloseTo(0.02);
  expect(weightedLine([])).toEqual([]);
});

test("stockholmTime follows Swedish summer and winter time", () => {
  expect(new Date(stockholmTime("2026-11-02", "09:00")).toISOString()).toBe(
    "2026-11-02T08:00:00.000Z",
  );
  expect(new Date(stockholmTime("2026-07-01", "09:00")).toISOString()).toBe(
    "2026-07-01T07:00:00.000Z",
  );
});
