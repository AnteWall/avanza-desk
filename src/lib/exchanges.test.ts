import { exchanges, exchangeStatus, sessionLabel } from "./exchanges";

const us = exchanges.find((e) => e.short === "US")!;
const sto = exchanges.find((e) => e.short === "STO")!;

test("US opens 13:30 UTC in the week Europe is off summer time but the US is not", () => {
  // Friday 2026-10-30 10:00 UTC (11:00 Stockholm, 06:00 New York).
  const s = exchangeStatus(us, new Date("2026-10-30T10:00:00Z"));
  expect(s.open).toBe(false);
  expect(s.next.toISOString()).toBe("2026-10-30T13:30:00.000Z");
});

test("open Stockholm closes at 17:30 local", () => {
  const s = exchangeStatus(sto, new Date("2026-10-30T10:00:00Z"));
  expect(s.open).toBe(true);
  expect(s.next.toISOString()).toBe("2026-10-30T16:30:00.000Z");
});

test("after Friday's close the next open is Monday", () => {
  const s = exchangeStatus(sto, new Date("2026-10-30T17:00:00Z"));
  expect(s.open).toBe(false);
  expect(s.next.toISOString()).toBe("2026-11-02T08:00:00.000Z");
});

test("Friday night: US next opens Monday 09:30 New York, after its clocks go back on Sunday", () => {
  const s = exchangeStatus(us, new Date("2026-10-30T21:14:00Z"));
  expect(s.open).toBe(false);
  expect(s.next.toISOString()).toBe("2026-11-02T14:30:00.000Z");
});

test("session label: today once Stockholm opens, else the last weekday", () => {
  // 2026-10-31 is a Saturday; Stockholm is UTC+1 after the clocks went back on Oct 25.
  expect(sessionLabel(new Date("2026-10-31T12:00:00Z"))).toBe("Yesterday"); // Saturday
  expect(sessionLabel(new Date("2026-11-01T12:00:00Z"))).toBe("Friday"); // Sunday
  expect(sessionLabel(new Date("2026-11-02T07:30:00Z"))).toBe("Friday"); // Monday 08:30
  expect(sessionLabel(new Date("2026-11-02T08:00:00Z"))).toBe("Today"); // Monday 09:00
  expect(sessionLabel(new Date("2026-11-03T07:00:00Z"))).toBe("Yesterday"); // Tuesday 08:00
});
