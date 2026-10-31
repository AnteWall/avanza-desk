import {
  formatCompact,
  formatDate,
  formatDateTime,
  formatDuration,
  formatInteger,
  formatPercent,
  formatPrice,
  formatTime,
} from "./format";

// sv-SE uses U+00A0 / U+2212 / U+202F; normalize so the expectations stay readable.
const plain = (s: string) => s.replace(/[  ]/g, " ").replace("−", "-");

test("formats prices, integers and signed percentages the Swedish way", () => {
  expect(plain(formatPrice(1234.5))).toBe("1 234,50");
  expect(plain(formatInteger(1234567))).toBe("1 234 567");
  expect(plain(formatPercent(0.0123))).toBe("+1,23 %");
  expect(plain(formatPercent(-0.004))).toBe("-0,40 %");
  expect(plain(formatPercent(0))).toBe("0,00 %");
  expect(plain(formatCompact(916_400_000))).toBe("916,4 mn");
});

test("formats Stockholm times and dates", () => {
  // 08:00 UTC is 09:00 in Stockholm in winter.
  expect(formatTime("2026-01-15T08:00:05Z")).toBe("09:00:05");
  expect(formatDate("2026-01-15")).toBe("2026-01-15");
  expect(formatDate("2026-01-15T23:30:00Z")).toBe("2026-01-16");
  expect(formatDateTime(Date.UTC(2026, 0, 15, 8, 0))).toBe("2026-01-15 09:00");
});

test("formatDuration", () => {
  expect(formatDuration(30_000)).toBe("<1m");
  expect(formatDuration(45 * 60_000)).toBe("45m");
  expect(formatDuration((2 * 60 + 5) * 60_000 + 59_000)).toBe("2h 05m");
});
