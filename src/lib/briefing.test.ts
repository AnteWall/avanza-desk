import type { PositionListResponse, Transaction } from "avanza-ts";

import type { AlertRow } from "@/lib/avanza/loose-records";
import {
  buildBriefing,
  lastVisitOf,
  markSignedIn,
  startOfDayOf,
  startsVisit,
} from "@/lib/briefing";
import type { CalendarEvent } from "@/lib/news";

const num = (value: number) => ({ value, unit: "SEK", unitType: "MONETARY", decimalPrecision: 2 });
const position = (id: string, volume: number, value: number) => ({
  id: `p-${id}`,
  account: { id: "1", type: "ISK", name: "ISK", urlParameterId: "1", hasCredit: false },
  instrument: {
    type: "STOCK",
    name: id,
    currency: "SEK",
    volumeFactor: 1,
    orderbook: { id, name: id, type: "STOCK" },
  },
  volume: num(volume),
  value: num(value),
});
const positions = (cash: number, ...ps: ReturnType<typeof position>[]) =>
  ({
    withOrderbook: ps,
    withoutOrderbook: [],
    cashPositions: [{ id: "c", account: ps[0]?.account, totalBalance: num(cash) }],
    withCreditAccount: false,
  }) as unknown as PositionListResponse;
let txId = 0;
const tx = (type: string, value: number, cancelled = false, date = "2026-10-02T00:00:00") =>
  ({ id: String(++txId), type, date, amount: num(value), cancelled }) as unknown as Transaction;

const before = positions(1000, position("A", 10, 1000), position("B", 10, 1000));
const last = lastVisitOf(before, Date.parse("2026-10-01T10:00:00Z"));

test("a visit starts on sign-in or after 12 hours, never without an earlier look", () => {
  const soon = Date.parse("2026-10-01T21:00:00Z");
  expect(startsVisit(null, Date.now())).toBe(false);
  expect(startsVisit(last, soon)).toBe(false);
  expect(startsVisit(last, Date.parse("2026-10-01T22:00:00Z"))).toBe(true);
  markSignedIn();
  expect(startsVisit(last, soon)).toBe(true);
  // The sign-in counts once.
  expect(startsVisit(last, soon)).toBe(false);
});

test("result excludes deposits, movers rank by size, alerts and events filter", () => {
  // A is up 20 %, B flat; 500 deposited and still in cash.
  const now = positions(1500, position("A", 10, 1200), position("B", 10, 1000));
  const b = buildBriefing({
    last,
    positions: now,
    transactions: [tx("DEPOSIT", 500), tx("BUY", -100), tx("DIVIDEND", 20), tx("DEPOSIT", 9, true)],
    triggered: [
      { id: "old", name: "A", channels: "", triggered: "2026-09-30T10:00:00Z" },
      { id: "new", name: "A", channels: "", triggered: "2026-10-02T10:00:00Z" },
    ] as AlertRow[],
    calendar: [
      { key: "1", date: "2026-10-05", orderbookId: "A" },
      { key: "2", date: "2026-10-05", orderbookId: "X" },
      { key: "3", date: "2026-10-30", orderbookId: "A" },
      { key: "4", date: "2026-10-01", orderbookId: "B" },
    ] as CalendarEvent[],
    today: "2026-10-03",
  });
  expect(b.total).toBe(3700);
  expect(b.deposits).toBe(500);
  expect(b.result).toBe(200);
  expect(b.ratio).toBeCloseTo(200 / 3000);
  expect(b.movers.map((m) => [m.key, m.ratio])).toEqual([["A", expect.closeTo(0.2)]]);
  expect(b.upcoming.map((e) => e.key)).toEqual(["1"]);
  expect(b.activity.map((a) => [a.kind, a.date])).toEqual([
    ["buy", "2026-10-02"],
    ["dividend", "2026-10-02"],
    ["alert", "2026-10-02"],
  ]);
});

test("start of day backs today's change out of value and prices", () => {
  const p = position("A", 10, 1100);
  const now = positions(500, {
    ...p,
    lastTradingDayPerformance: { absolute: num(100) },
  } as ReturnType<typeof position>);
  const start = startOfDayOf(now, "2026-10-02");
  expect(start.total).toBe(1500);
  expect(start.prices.A).toBe(100);
  const b = buildBriefing({
    last: start,
    positions: now,
    transactions: [],
    triggered: [],
    calendar: [],
    today: "2026-10-02",
  });
  expect(b.result).toBe(100);
  expect(b.movers[0]?.ratio).toBeCloseTo(0.1);
});
