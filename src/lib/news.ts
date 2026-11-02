import type { CalendarResponse, NewsFeedItem, NewsFeedOrderbook } from "avanza-ts";

import { formatDate, formatPrice, formatTime } from "@/lib/format";

export type NewsGroup = { orderbook: NewsFeedOrderbook; items: NewsFeedItem[] };

const DAY = 86_400_000;

// "ALPHABET FÖLL PÅ RAPPORT (OMS)" and "Alphabet föll på rapport" are the same story.
const storyKey = (title: string) =>
  title
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();

/** All-caps wire headlines in sentence case; mixed-case titles as given. */
export const headline = (title: string) =>
  /\p{Ll}/u.test(title) ? title : title.charAt(0) + title.slice(1).toLowerCase();

/**
 * News of the last `days`, grouped per instrument it mentions, the group with the newest story
 * first. Repeats of a story (the same headline re-sent, often with a suffix) are dropped.
 */
export function groupNews(news: readonly NewsFeedItem[], now: string, days = 7): NewsGroup[] {
  const since = Date.parse(now) - days * DAY;
  const seen = new Set<string>();
  const groups = new Map<string, NewsGroup>();
  const newest = [...news].sort((a, b) => b.publishDateTime.localeCompare(a.publishDateTime));
  for (const item of newest) {
    if (Date.parse(item.publishDateTime) < since) continue;
    for (const ob of item.orderbooks) {
      const key = `${ob.id}|${storyKey(item.title)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const group = groups.get(ob.id) ?? { orderbook: ob, items: [] };
      group.items.push(item);
      groups.set(ob.id, group);
    }
  }
  return [...groups.values()];
}

const weekday = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  timeZone: "Europe/Stockholm",
});

/** "15:07" today, "Thu" within the week, "2026-10-20" before that. */
export function newsTime(value: string, now: string) {
  if (formatDate(value) === formatDate(now)) return formatTime(value).slice(0, 5);
  return Date.parse(now) - Date.parse(value) < 6 * DAY
    ? weekday.format(new Date(value))
    : formatDate(value);
}

/** Weeks from today's week to a `yyyy-MM-dd` date: 0 = this week (Mon–Sun), 1 = next. */
export function weeksAhead(date: string, today: string) {
  const days = (Date.parse(date) - Date.parse(today)) / DAY;
  const sinceMonday = (new Date(today).getUTCDay() + 6) % 7;
  return Math.floor((days + sinceMonday) / 7);
}

const day = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

/** "Mon 2" for a `yyyy-MM-dd` date. */
export const eventDay = (date: string) => `${day.format(new Date(date))} ${Number(date.slice(8))}`;

const month = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });
const monthYear = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Heading for a `yyyy-MM-dd` event: "This week", "Next week", then "December" / "January 2027". */
export function eventGroup(date: string, today: string) {
  const weeks = weeksAhead(date, today);
  if (weeks <= 0) return "This week";
  if (weeks === 1) return "Next week";
  return (date.slice(0, 4) === today.slice(0, 4) ? month : monthYear).format(new Date(date));
}

/** Today in Stockholm as `yyyy-MM-dd`. */
export const stockholmToday = () => formatDate(Date.now());

export type CalendarEvent = {
  key: string;
  date: string;
  orderbookId: string;
  type: string;
  name: string;
  /** "Interim report", "Ex-dividend 1,52 EUR". */
  what: string;
};

/** Reports and ex-dividend dates from Avanza's calendar, unsorted. */
export const calendarEvents = (data: CalendarResponse): CalendarEvent[] =>
  data.flatMap((month) => [
    ...(month.reports ?? []).map((r) => ({
      key: `r-${r.orderbook.id}-${r.date}`,
      date: r.date,
      orderbookId: r.orderbook.id,
      type: r.orderbook.instrumentType,
      name: r.companyName || r.orderbook.name,
      what: `${r.reportType.charAt(0)}${r.reportType.slice(1).toLowerCase().replaceAll("_", " ")} report`,
    })),
    ...(month.upcomingDividends?.upcomingDividends ?? []).map((d) => ({
      key: `d-${d.orderbook.id}-${d.exclusiveDividendDate}`,
      date: d.exclusiveDividendDate,
      orderbookId: d.orderbook.id,
      type: d.orderbook.instrumentType,
      name: d.orderbook.name,
      what: `Ex-dividend ${formatPrice(d.amount)} ${d.currency}${d.established ? "" : " (est.)"}`,
    })),
  ]);
