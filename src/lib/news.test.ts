import type { NewsFeedItem } from "avanza-ts";

import { eventDay, eventGroup, groupNews, headline, newsTime, weeksAhead } from "./news";

const ob = (id: string) => ({
  id,
  name: id,
  instrumentType: "STOCK",
  flagCode: "SE",
  dailyPerformance: 0,
});
const item = (title: string, at: string, ...ids: string[]) =>
  ({ title, publishDateTime: at, url: title, orderbooks: ids.map(ob) }) as unknown as NewsFeedItem;

test("groupNews groups per instrument, newest group first, drops repeats and old news", () => {
  const groups = groupNews(
    [
      item("Alphabet föll på rapport", "2026-10-30T06:00:00Z", "goog"),
      item("ALPHABET FÖLL PÅ RAPPORT (OMS)", "2026-10-30T07:00:00Z", "goog"),
      item("Saab toppar", "2026-10-31T07:00:00Z", "saab", "goog"),
      item("Old", "2026-10-01T07:00:00Z", "mips"),
    ],
    "2026-10-31T10:00:00Z",
  );
  expect(groups.map((g) => [g.orderbook.id, g.items.map((i) => i.title)])).toEqual([
    ["saab", ["Saab toppar"]],
    ["goog", ["Saab toppar", "ALPHABET FÖLL PÅ RAPPORT (OMS)"]],
  ]);
});

test("headline sentence-cases all-caps titles only", () => {
  expect(headline("SAAB I TOPPEN, OMXS30 +0,4%")).toBe("Saab i toppen, omxs30 +0,4%");
  expect(headline("Saab toppar i USA")).toBe("Saab toppar i USA");
});

test("newsTime: clock today, weekday this week, date before", () => {
  const now = "2026-10-31T14:00:00Z";
  expect(newsTime("2026-10-31T06:00:00Z", now)).toBe("07:00");
  expect(newsTime("2026-10-29T12:00:00Z", now)).toBe("Thu");
  expect(newsTime("2026-10-20T12:00:00Z", now)).toBe("2026-10-20");
});

test("weeksAhead counts Monday-based weeks", () => {
  // 2026-10-31 is a Saturday.
  expect(weeksAhead("2026-11-01", "2026-10-31")).toBe(0);
  expect(weeksAhead("2026-11-02", "2026-10-31")).toBe(1);
  expect(weeksAhead("2026-11-09", "2026-10-31")).toBe(2);
  expect(eventDay("2026-11-02")).toBe("Mon 2");
});

test("eventGroup: this week, next week, then months", () => {
  expect(eventGroup("2026-11-01", "2026-10-31")).toBe("This week");
  expect(eventGroup("2026-11-03", "2026-10-31")).toBe("Next week");
  expect(eventGroup("2026-12-09", "2026-10-31")).toBe("December");
  expect(eventGroup("2027-01-15", "2026-10-31")).toBe("January 2027");
});
