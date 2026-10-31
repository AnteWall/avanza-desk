import { expect, test } from "vitest";

import { rebalance, type Position } from "./rebalance";

const positions: Position[] = [
  { key: "stock", type: "STOCK", value: 600, volume: 6, target: 0.5 }, // 100 SEK a share
  { key: "fund", type: "FUND", value: 400, volume: 4, target: 0.5 },
];

test("full rebalance sells the overweight and buys the underweight", () => {
  const [s, f] = rebalance(positions, 0, false);
  expect(s).toMatchObject({ amount: -100, shares: -1, desired: 500 });
  expect(f).toMatchObject({ amount: 100, shares: null, desired: 500 });
});

test("whole shares round toward zero", () => {
  const [s] = rebalance([{ ...positions[0]!, target: 0.55 }, positions[1]!], 0, false);
  expect(s).toMatchObject({ amount: -0, shares: -0 });
});

test("buy only never sells and splits short money by deficit", () => {
  const trades = rebalance(
    [
      { key: "a", type: "FUND", value: 500, volume: 1, target: 0.2 },
      { key: "b", type: "FUND", value: 300, volume: 1, target: 0.4 },
      { key: "c", type: "FUND", value: 200, volume: 1, target: 0.4 },
    ],
    100,
    true,
  );
  // Total 1100: b is 140 short, c 240 short; 100 SEK split 140:240.
  const expected = [0, (100 * 140) / 380, (100 * 240) / 380];
  trades.forEach((t, i) => expect(t.amount).toBeCloseTo(expected[i]!));
});

test("buy only with plenty of money fills each gap and no more", () => {
  const trades = rebalance(positions, 1000, true);
  // Total 2000: stock 400 short (4 shares), fund 600 short.
  expect(trades.map((t) => [t.amount, t.shares])).toEqual([
    [400, 4],
    [600, null],
  ]);
});
