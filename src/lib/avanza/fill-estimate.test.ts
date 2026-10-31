import type { OrderDepth } from "avanza-ts";

import { estimateFill } from "./fill-estimate";

const side = (price: number, volume: number) => ({ price, volume, priceString: String(price) });
const depth: OrderDepth = {
  receivedTime: 0,
  levels: [
    { buySide: side(99, 10), sellSide: side(100, 10) },
    { buySide: side(98, 10), sellSide: side(101, 30) },
  ],
};

test("estimateFill walks the opposite side of the book", () => {
  expect(estimateFill(depth, "buy", 20)).toEqual({
    filled: 20,
    averagePrice: 100.5,
    cost: 2010,
    levels: 2,
  });
  expect(estimateFill(depth, "sell", 5)).toEqual({
    filled: 5,
    averagePrice: 99,
    cost: 495,
    levels: 1,
  });
  expect(estimateFill(depth, "sell", 50).filled).toBe(20);
});
