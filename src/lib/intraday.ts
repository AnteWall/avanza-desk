import type { ReturnPoint } from "@/lib/benchmark";

/** Each close as a return since the previous close. Empty without a previous close. */
export function sinceClose(
  ohlc: readonly { timestamp: number; close: number }[],
  previousClose: number | null,
): ReturnPoint[] {
  if (!previousClose) return [];
  return ohlc.map((p) => ({ timestamp: p.timestamp, value: p.close / previousClose - 1 }));
}

/**
 * Weighted mean of several return lines at every timestamp any of them has. A line holds its
 * last value between points and counts as 0 before its first trade.
 */
export function weightedLine(
  lines: readonly { weight: number; points: readonly ReturnPoint[] }[],
): ReturnPoint[] {
  const total = lines.reduce((sum, l) => sum + l.weight, 0);
  if (!total) return [];
  const times = [...new Set(lines.flatMap((l) => l.points.map((p) => p.timestamp)))].sort(
    (a, b) => a - b,
  );
  const next = lines.map(() => 0);
  const last = lines.map(() => 0);
  return times.map((timestamp) => {
    let sum = 0;
    lines.forEach((l, i) => {
      for (let p = l.points[next[i]!]; p && p.timestamp <= timestamp; p = l.points[++next[i]!])
        last[i] = p.value;
      sum += l.weight * last[i]!;
    });
    return { timestamp, value: sum / total };
  });
}

/** Epoch ms of `hm` ("09:00") Stockholm time on `date` ("2026-11-02"), DST included. */
export function stockholmTime(date: string, hm: string) {
  const asUtc = Date.parse(`${date}T${hm}:00Z`);
  const wall = new Date(asUtc).toLocaleString("sv-SE", { timeZone: "Europe/Stockholm" });
  return asUtc - (Date.parse(`${wall.replace(" ", "T")}Z`) - asUtc);
}
