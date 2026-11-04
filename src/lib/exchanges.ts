import { TZDate } from "@date-fns/tz";

import { getSetting, saveSetting } from "./settings";

// Regular trading hours of the exchanges Avanza trades or shows indices from, in each exchange's own time zone, so
// daylight-saving shifts (Europe and the US switch on different dates) come out right.
// shortcut: no holidays or half days; the focused instrument's status comes from Avanza
// (marketplaceQuery) and is exact. Use an exchange-calendar feed if the SDK gets one.
// `country` is the ISO code Avanza flags an index with; `at` is [latitude, longitude] for the world map.
// shortcut: Tokyo's and Hong Kong's lunch breaks count as open; add a second session if it matters.
export type Exchange = {
  short: string;
  name: string;
  tz: string;
  open: number;
  close: number;
  country: string;
  at: [number, number];
};

const hm = (h: number, m = 0) => h * 60 + m;

export const exchanges: Exchange[] = [
  {
    short: "STO",
    name: "Stockholm",
    tz: "Europe/Stockholm",
    open: hm(9),
    close: hm(17, 30),
    country: "SE",
    at: [59.3, 18.1],
  },
  {
    short: "OSL",
    name: "Oslo",
    tz: "Europe/Oslo",
    open: hm(9),
    close: hm(16, 20),
    country: "NO",
    at: [59.9, 10.8],
  },
  {
    short: "CPH",
    name: "Copenhagen",
    tz: "Europe/Copenhagen",
    open: hm(9),
    close: hm(17),
    country: "DK",
    at: [55.7, 12.6],
  },
  {
    short: "HEL",
    name: "Helsinki",
    tz: "Europe/Helsinki",
    open: hm(10),
    close: hm(18, 30),
    country: "FI",
    at: [60.2, 24.9],
  },
  {
    short: "XETRA",
    name: "Xetra",
    tz: "Europe/Berlin",
    open: hm(9),
    close: hm(17, 30),
    country: "DE",
    at: [50.1, 8.7],
  },
  {
    short: "PAR",
    name: "Paris",
    tz: "Europe/Paris",
    open: hm(9),
    close: hm(17, 30),
    country: "FR",
    at: [48.9, 2.3],
  },
  {
    short: "LSE",
    name: "London",
    tz: "Europe/London",
    open: hm(8),
    close: hm(16, 30),
    country: "GB",
    at: [51.5, -0.1],
  },
  {
    short: "US",
    name: "NYSE / Nasdaq",
    tz: "America/New_York",
    open: hm(9, 30),
    close: hm(16),
    country: "US",
    at: [40.7, -74],
  },
  {
    short: "TSX",
    name: "Toronto",
    tz: "America/Toronto",
    open: hm(9, 30),
    close: hm(16),
    country: "CA",
    at: [43.7, -79.4],
  },
  {
    short: "AMS",
    name: "Amsterdam",
    tz: "Europe/Amsterdam",
    open: hm(9),
    close: hm(17, 30),
    country: "NL",
    at: [52.4, 4.9],
  },
  {
    short: "BRU",
    name: "Brussels",
    tz: "Europe/Brussels",
    open: hm(9),
    close: hm(17, 30),
    country: "BE",
    at: [50.8, 4.4],
  },
  {
    short: "MIL",
    name: "Milan",
    tz: "Europe/Rome",
    open: hm(9),
    close: hm(17, 30),
    country: "IT",
    at: [45.5, 9.2],
  },
  {
    short: "LIS",
    name: "Lisbon",
    tz: "Europe/Lisbon",
    open: hm(8),
    close: hm(16, 30),
    country: "PT",
    at: [38.7, -9.1],
  },
  {
    short: "NSE",
    name: "Mumbai",
    tz: "Asia/Kolkata",
    open: hm(9, 15),
    close: hm(15, 30),
    country: "IN",
    at: [19.1, 72.9],
  },
  {
    short: "KRX",
    name: "Seoul",
    tz: "Asia/Seoul",
    open: hm(9),
    close: hm(15, 30),
    country: "KR",
    at: [37.6, 127],
  },
  {
    short: "TYO",
    name: "Tokyo",
    tz: "Asia/Tokyo",
    open: hm(9),
    close: hm(15, 30),
    country: "JP",
    at: [35.7, 139.7],
  },
  {
    short: "HKG",
    name: "Hong Kong",
    tz: "Asia/Hong_Kong",
    open: hm(9, 30),
    close: hm(16),
    country: "HK",
    at: [22.3, 114.2],
  },
];

const KEY = "status-exchanges";

/** The exchanges the status bar shows, by `short`. Stockholm and the US unless changed. */
export const getShownExchanges = () => getSetting<string[]>(KEY, ["STO", "US"]);
export const setShownExchanges = (shorts: string[]) => saveSetting(KEY, shorts);

/** Weekday (0 = Sunday) and minutes since midnight on the exchange's wall clock. */
function wallClock(tz: string, now: Date) {
  const wall = new TZDate(now, tz);
  return { day: wall.getDay(), minutes: hm(wall.getHours(), wall.getMinutes()) };
}

const weekday = (day: number) => day >= 1 && day <= 5;

/** Open now, and when it next opens or closes. */
export function exchangeStatus(ex: Exchange, now: Date) {
  const { day, minutes } = wallClock(ex.tz, now);
  const open = weekday(day) && minutes >= ex.open && minutes < ex.close;
  let until: number;
  if (open) until = ex.close - minutes;
  else if (weekday(day) && minutes < ex.open) until = ex.open - minutes;
  else {
    let ahead = 1;
    while (!weekday((day + ahead) % 7)) ahead++;
    until = hm(24) - minutes + (ahead - 1) * hm(24) + ex.open;
  }
  // Whole minutes on the wall clock; drop the seconds already past.
  let next = now.getTime() + until * 60_000 - (now.getTime() % 60_000);
  // A clock change in between shifts the wall clock: correct by what it actually reads then.
  const target = open ? ex.close : ex.open;
  const drift = target - wallClock(ex.tz, new Date(next)).minutes;
  next += drift * 60_000;
  return { open, next: new Date(next) };
}

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * The trading day Avanza's "last trading day" changes refer to, as a label: "Today" once
 * Stockholm has opened on a weekday, else the weekday before ("Yesterday", "Friday").
 * shortcut: holidays count as trading days, like `exchangeStatus`.
 */
export function sessionLabel(now: Date) {
  const sto = exchanges[0]!;
  const { day, minutes } = wallClock(sto.tz, now);
  if (weekday(day) && minutes >= sto.open) return "Today";
  let back = 1;
  while (!weekday((day - back + 7) % 7)) back++;
  return back === 1 ? "Yesterday" : dayNames[(day - back + 7) % 7]!;
}
