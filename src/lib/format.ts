import { TZDate } from "@date-fns/tz";
import { format, type Locale } from "date-fns";

import { dateLocale, lang, m } from "@/lib/i18n";

// Swedish formatting everywhere (decimal comma, thin-space grouping), like Avanza.
const price = new Intl.NumberFormat("sv-SE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const integer = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("sv-SE", { notation: "compact", maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("sv-SE", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});
const share = new Intl.NumberFormat("sv-SE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const signedShare = new Intl.NumberFormat("sv-SE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
const decimal = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2, useGrouping: false });
// Built on first use: the language is only known once settings have loaded.
let regions: Intl.DisplayNames | undefined;

export const formatPrice = (value: number) => price.format(value);
export const formatInteger = (value: number) => integer.format(value);
/** `ratio` is a fraction: 0.0123 → "+1,23 %". */
export const formatPercent = (ratio: number) => percent.format(ratio);
/** Large amounts in short form: 916 400 000 → "916,4 mn". */
export const formatCompact = (value: number) => compact.format(value);
/** An unsigned share of a whole: 0.123 → "12,3 %". */
export const formatShare = (ratio: number) => share.format(ratio);
/** A signed share with one decimal, e.g. drift from a target: 0.0753 → "+7,5 %". */
export const formatSignedShare = (ratio: number) => signedShare.format(ratio);
/** A plain number for an editable field: 4.5 → "4,5". Read it back with `parseDecimal`. */
export const formatDecimal = (value: number) => decimal.format(value);
/** "4,5" or "4.5" → 4.5; NaN when it isn't a number. */
export const parseDecimal = (text: string) =>
  text.trim() === "" ? Number.NaN : Number(text.replace(/\s/g, "").replace(",", "."));
/** "SE" → "Sweden"; codes Intl doesn't know come back as given. */
export const formatCountry = (code: string) => {
  try {
    regions ??= new Intl.DisplayNames([lang], { type: "region" });
    return regions.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
};

// Dates and times go through date-fns, always on Stockholm's wall clock.
const STOCKHOLM = "Europe/Stockholm";
const bareDate = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `value` on Stockholm's wall clock. Takes epoch ms, an ISO timestamp or a Date; a bare
 * `yyyy-MM-dd` is that calendar day, so time zones can't shift it.
 */
export function inStockholm(value: number | string | Date) {
  const bare = typeof value === "string" ? bareDate.exec(value) : null;
  return bare
    ? new TZDate(Number(bare[1]), Number(bare[2]) - 1, Number(bare[3]), STOCKHOLM)
    : new TZDate(new Date(value).getTime(), STOCKHOLM);
}

/** Any date-fns pattern on Stockholm's wall clock: `formatAs(at, "EEE HH:mm")`. */
export const formatAs = (
  value: number | string | Date,
  pattern: string,
  locale: Locale = dateLocale,
) => format(inStockholm(value), pattern, { locale });

/** Stockholm wall-clock time: "09:00:05". Takes epoch ms or an ISO string. */
export const formatTime = (value: number | string | Date) => formatAs(value, "HH:mm:ss");
/** "09:00", for chart axes and clocks without seconds. */
export const formatClock = (value: number | string | Date) => formatAs(value, "HH:mm");
/** "2026-10-30". A bare ISO date is shown as given. */
export const formatDate = (value: number | string | Date) => formatAs(value, "yyyy-MM-dd");
/**
 * A date as a reader says it: "Thu 30 Oct" this year, "30 Oct 2027" otherwise. For prose and
 * lists people read; tables people sort and export keep `formatDate`.
 */
export function formatDay(value: number | string | Date) {
  const thisYear = formatAs(value, "yyyy") === formatAs(Date.now(), "yyyy");
  return formatAs(value, thisYear ? "EEE d MMM" : "d MMM yyyy");
}
/** "2026-10-30 09:00". */
export const formatDateTime = (value: number | string | Date) =>
  formatAs(value, "yyyy-MM-dd HH:mm");
/** A countdown: "2h 05m", "45m", "<1m". */
export function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  const d = m.common.duration;
  if (minutes < 1) return d.underMinute;
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  return h ? d.hours(h, String(min).padStart(2, "0")) : d.minutes(String(min));
}
