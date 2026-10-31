import type { PositionListResponse, WatchlistRow } from "avanza-ts";
import { expect, test } from "vitest";

import { buildUniverse } from "./universe";

const position = (id: string, type: string, value: number) => ({
  instrument: { name: id, type, currency: "SEK", isin: null, orderbook: { id, flagCode: "SE" } },
  value: { value },
});

test("merges held and watched stocks, held first by value, skips other types", () => {
  const positions = {
    withOrderbook: [
      position("a", "STOCK", 10),
      position("b", "STOCK", 30),
      position("f", "FUND", 99),
      position("a", "STOCK", 5),
    ],
  } as unknown as PositionListResponse;
  const rows = [
    { id: "a", name: "a", instrumentType: "STOCK", currency: "SEK" },
    { id: "w", name: "w", instrumentType: "STOCK", currency: "SEK" },
    { id: "e", name: "e", instrumentType: "EXCHANGE_TRADED_FUND", currency: "SEK" },
  ] as unknown as WatchlistRow[];
  const u = buildUniverse(positions, rows);
  expect(u.map((s) => [s.orderbookId, s.held, s.watched, s.value])).toEqual([
    ["b", true, false, 30],
    ["a", true, true, 15],
    ["w", false, true, 0],
  ]);
});
