import {
  AvanzaHttpError,
  type MarketTrade,
  type PositionListResponse,
  type PriceChartResponse,
  type StockQuote,
  type WatchlistRow,
} from "avanza-ts";
import { toast } from "sonner";

import {
  applyChartQuote,
  applyDepth,
  applyPositionQuote,
  applyQuote,
  applyRowQuote,
  applyTrade,
  follow,
} from "./push";

vi.mock("sonner", () => ({ toast: { error: vi.fn<() => void>() } }));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn<() => Promise<void>>() }));

const quote = { last: 10, buy: 9.9, change: 1, updated: 1 } as StockQuote;

test("a push quote overrides only the fields it carries, null included", () => {
  expect(
    applyQuote(quote, { orderbookId: "1", lastPrice: 11, buyPrice: null, updated: 2 }),
  ).toEqual({ ...quote, last: 11, buy: null, updated: 2 });
  expect(applyQuote(undefined, { orderbookId: "1", lastPrice: 11 })).toBeUndefined();
});

test("a push quote updates only its watchlist row", () => {
  const rows = [
    { id: "1", quote: { lastPrice: 1, changePercent: 0 } },
    { id: "2", quote: { lastPrice: 2, changePercent: 0 } },
  ] as unknown as WatchlistRow[];
  const next = applyRowQuote(rows, { orderbookId: "2", lastPrice: 3, changePercent: null });
  expect(next?.[0]).toBe(rows[0]);
  expect(next?.[1]?.quote).toEqual({ lastPrice: 3, changePercent: 0 });
});

test("push depth levels become REST order depth sides", () => {
  const depth = applyDepth({
    orderbookId: "1",
    levels: [{ buyPrice: 10, buyVolume: 5, sellPrice: null, sellVolume: null }],
  });
  expect(depth.levels).toEqual([
    { buySide: { price: 10, volume: 5, priceString: "10" }, sellSide: null },
  ]);
});

test("a pushed trade is prepended once", () => {
  const tape = [{ dealTime: 1, price: 10, volume: 5 }] as MarketTrade[];
  expect(applyTrade(tape, { dealTime: 1, price: 10, volume: 5 })).toBe(tape);
  expect(applyTrade(tape, { dealTime: 2, price: 11, volume: 1, buyer: "AVA" })?.[0]).toEqual({
    buyer: "AVA",
    seller: "",
    matchedOnMarket: true,
    cancelled: false,
    dealTime: 2,
    price: 11,
    volume: 1,
  });
  const full = Array.from({ length: 500 }, (_, i) => ({ dealTime: i, price: 1, volume: 1 }));
  const capped = applyTrade(full as MarketTrade[], { dealTime: 999, price: 2, volume: 1 });
  expect(capped).toHaveLength(500);
  expect(capped?.[0]?.dealTime).toBe(999);
});

test("follow delivers events until stopped", async () => {
  const seen: number[] = [];
  const stop = follow(
    "numbers",
    async function* (signal) {
      yield 1;
      yield 2;
      await new Promise((r) => signal.addEventListener("abort", r));
    },
    (n) => seen.push(n),
  );
  await vi.waitFor(() => expect(seen).toEqual([1, 2]));
  stop();
});

test("a stream that fails for good shows an error that stays", async () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  follow(
    "quotes",
    // oxlint-disable-next-line require-yield -- fails before its first event
    async function* () {
      throw new AvanzaHttpError({ status: 400, statusText: "", headers: {}, body: undefined });
    },
    () => {},
  );
  await vi.waitFor(() =>
    expect(toast.error).toHaveBeenCalledWith(
      "Live quotes stopped",
      expect.objectContaining({ duration: Infinity }),
    ),
  );
});

test("a market without live access (403) stops quietly", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.mocked(toast.error).mockClear();
  follow(
    "order book",
    // oxlint-disable-next-line require-yield -- fails before its first event
    async function* () {
      throw new AvanzaHttpError({ status: 403, statusText: "", headers: {}, body: undefined });
    },
    () => {},
  );
  await vi.waitFor(() => expect(warn).toHaveBeenCalled());
  expect(toast.error).not.toHaveBeenCalled();
});

test("a push quote rescales the held position and today's change", () => {
  const position = {
    instrument: { orderbook: { id: "1", quote: { latest: { value: 10 } } } },
    value: { value: 1000 },
    lastTradingDayPerformance: { absolute: { value: 50 } },
  };
  const data = {
    withOrderbook: [position],
    withoutOrderbook: [],
  } as unknown as PositionListResponse;
  const next = applyPositionQuote(data, { orderbookId: "1", lastPrice: 11 });
  const p = next?.withOrderbook[0];
  expect(p?.value.value).toBe(1100);
  expect(p?.lastTradingDayPerformance?.absolute?.value).toBe(150);
  expect(p?.instrument.orderbook?.quote?.latest?.value).toBe(11);
  expect(applyPositionQuote(data, { orderbookId: "2", lastPrice: 11 })).toBe(data);
});

test("a push quote moves the last candle of the chart", () => {
  const candle = { timestamp: 1, open: 10, close: 10, high: 10.5, low: 9.5, totalVolumeTraded: 1 };
  const chart = { ohlc: [candle, candle] } as unknown as PriceChartResponse;
  const next = applyChartQuote(chart, { orderbookId: "1", lastPrice: 11 });
  expect(next?.ohlc[0]).toBe(candle);
  expect(next?.ohlc[1]).toEqual({ ...candle, close: 11, high: 11 });
});
