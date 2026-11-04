import { expect, test } from "vitest";

import { basketOrders, type BasketItem } from "./basket";

const item = (weight: number): BasketItem => ({
  orderbookId: String(weight),
  name: "x",
  type: "STOCK",
  currency: "SEK",
  weight,
});

test("splits the money by weight, whole shares, funds in SEK", () => {
  const orders = basketOrders([item(1), item(3)], [100, null], 4000, 0);
  expect(orders).toEqual([
    { side: "buy", amount: 1000, shares: 10 },
    { side: "buy", amount: 3000, shares: null },
  ]);
});

test("legs under the minimum order are skipped", () => {
  const [small, big] = basketOrders([item(1), item(9)], [null, null], 2000, 500);
  expect(small).toBeNull();
  expect(big?.amount).toBe(1800);
});

test("zero weights or no money give no orders", () => {
  expect(basketOrders([item(0)], [null], 1000, 0)).toEqual([null]);
  expect(basketOrders([item(1)], [null], 0, 0)).toEqual([null]);
});
