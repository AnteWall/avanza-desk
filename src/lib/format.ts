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
const regions = new Intl.DisplayNames(["en"], { type: "region" });

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
    return regions.of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
};

const time = new Intl.DateTimeFormat("sv-SE", {
  timeStyle: "medium",
  timeZone: "Europe/Stockholm",
});
const date = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeZone: "Europe/Stockholm" });
const dateTime = new Intl.DateTimeFormat("sv-SE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Stockholm",
});

/** Stockholm wall-clock time: "09:00:05". Takes epoch ms or an ISO string. */
export const formatTime = (value: number | string) => time.format(new Date(value));
/** "2026-10-30". A bare ISO date is shown as given, so time zones can't shift the day. */
export const formatDate = (value: number | string) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : date.format(new Date(value));
/** "2026-10-30 09:00". */
export const formatDateTime = (value: number | string) => dateTime.format(new Date(value));
/** A countdown: "2h 05m", "45m", "<1m". */
export function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "<1m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
