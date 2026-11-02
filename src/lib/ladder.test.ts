import { expect, test } from "vitest";

import { buildLadder } from "./ladder";

const side = (price: number, volume: number) => ({ price, volume, priceString: String(price) });

test("merges the book, open orders, stops and the last price into one row per price", () => {
  const depth = {
    receivedTime: 0,
    levels: [
      { buySide: side(10, 100), sellSide: side(10.1, 50) },
      { buySide: side(9.9, 200), sellSide: null },
    ],
  };
  const rows = buildLadder(
    depth,
    [
      { price: 9.9, side: "BUY", volume: 30, filled: 10 },
      { price: 10.5, side: "SELL", volume: 5 },
      { price: 10, side: "BUY", volume: 5, filled: 5 },
    ],
    [9.5],
    10.1,
  );
  expect(rows.map((r) => r.price)).toEqual([10.5, 10.1, 10, 9.9, 9.5]);
  expect(rows[0]).toMatchObject({ mySell: 5 });
  expect(rows[1]).toMatchObject({ askQty: 50, last: true });
  // A filled order no longer sits in the book.
  expect(rows[2]).toEqual({ price: 10, bidQty: 100 });
  expect(rows[3]).toMatchObject({ bidQty: 200, myBuy: 20 });
  expect(rows[4]).toMatchObject({ stops: 1 });
});
