import { expect, test } from "vitest";

import { rebalance, type Position, type RebalanceOptions } from "./rebalance";

const exact = (newMoney: number, buyOnly: boolean): RebalanceOptions => ({
  newMoney,
  buyOnly,
  band: 0,
  minOrder: 0,
});
const amounts = (positions: Position[], options: RebalanceOptions) =>
  rebalance(positions, options).map((o) => o?.amount ?? 0);

const positions: Position[] = [
  { value: 600, price: 100, target: 0.5 },
  { value: 400, price: null, target: 0.5 },
];

test("full rebalance sells the overweight and buys the underweight", () => {
  const [s, f] = rebalance(positions, exact(0, false));
  expect(s).toEqual({ side: "sell", amount: -100, shares: -1 });
  expect(f).toEqual({ side: "buy", amount: 100, shares: null });
});

test("whole shares round toward zero, leaving no order", () => {
  const [s] = rebalance([{ ...positions[0]!, target: 0.55 }, positions[1]!], exact(0, false));
  expect(s).toBeNull();
});

test("buy only never sells and splits short money by deficit", () => {
  const result = amounts(
    [
      { value: 500, price: null, target: 0.2 },
      { value: 300, price: null, target: 0.4 },
      { value: 200, price: null, target: 0.4 },
    ],
    exact(100, true),
  );
  // Total 1100: the 2nd is 140 short, the 3rd 240; 100 SEK split 140:240.
  expect(result).toEqual([0, Math.round((100 * 140) / 380), Math.round((100 * 240) / 380)]);
});

test("buy only with plenty of money fills each gap and no more", () => {
  // Total 2000: stock 400 short (4 shares), fund 600 short.
  expect(rebalance(positions, exact(1000, true)).map((o) => [o?.amount, o?.shares])).toEqual([
    [400, 4],
    [600, null],
  ]);
});

test("an added instrument with no value is bought up to its target", () => {
  const [, , added] = rebalance(
    [
      { value: 900, price: null, target: 0.45 },
      { value: 100, price: null, target: 0.45 },
      { value: 0, price: 25, target: 0.1 },
    ],
    exact(0, false),
  );
  expect(added).toEqual({ side: "buy", amount: 100, shares: 4 });
});

test("positions within the band or below the smallest order are left alone", () => {
  const banded = amounts(
    [
      { value: 600, price: null, target: 0.5 }, // 10 % over
      { value: 210, price: null, target: 0.2 }, // 1 % over: inside the band
      { value: 190, price: null, target: 0.3 }, // 11 % under
    ],
    { newMoney: 0, buyOnly: false, band: 0.02, minOrder: 0 },
  );
  expect(banded).toEqual([-100, 0, 100]);
  expect(amounts(positions, { newMoney: 0, buyOnly: false, band: 0, minOrder: 150 })).toEqual([
    0, 0,
  ]);
});

test("buys never spend more than the sells free up", () => {
  // Targets add up to 120 %: the 100 SEK sold is all there is to buy with.
  const result = amounts(
    [
      { value: 600, price: null, target: 0.5 },
      { value: 400, price: null, target: 0.7 },
    ],
    exact(0, false),
  );
  expect(result).toEqual([-100, 100]);
});

test("buys never spend more than the sells free up after rounding to whole shares", () => {
  // The stock should sell 150 SEK but only whole 100 SEK shares sell: 1 share, 100 SEK freed.
  const result = amounts(
    [
      { value: 650, price: 100, target: 0.5 },
      { value: 350, price: null, target: 0.5 },
    ],
    exact(0, false),
  );
  expect(result).toEqual([-100, 100]);
});
