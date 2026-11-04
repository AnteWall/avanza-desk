import { TZDate } from "@date-fns/tz";

import type { ReturnPoint } from "@/lib/benchmark";

/** A deal executed today at `timestamp` (epoch ms): `volume` shares, negative when sold. */
export type Fill = { timestamp: number; volume: number; price: number };

/**
 * Each close as a return since the previous close. With `held` (the volume held now and today's
 * fills) it is the result of what was actually held at each point, over yesterday's value plus
 * what was bought: a holding bought at 14:00 starts at 14:00 from its buy price. Empty without
 * a previous close for shares held since yesterday.
 */
export function sinceClose(
  ohlc: readonly { timestamp: number; close: number }[],
  previousClose: number | null,
  held?: { volume: number; fills: readonly Fill[] },
): ReturnPoint[] {
  const fills = [...(held?.fills ?? [])].sort((a, b) => a.timestamp - b.timestamp);
  const start = held ? held.volume - fills.reduce((n, f) => n + f.volume, 0) : 1;
  const yesterday = start > 0 ? start * (previousClose ?? NaN) : 0;
  const base = yesterday + fills.reduce((n, f) => n + Math.max(f.volume, 0) * f.price, 0);
  if (!base) return [];
  let volume = start;
  let invested = 0;
  let next = 0;
  const points: ReturnPoint[] = [];
  for (const p of ohlc) {
    for (let f = fills[next]; f && f.timestamp <= p.timestamp; f = fills[++next]) {
      volume += f.volume;
      invested += f.volume * f.price;
    }
    // Nothing held yet: a new holding starts at its first buy.
    if (start <= 0 && next === 0) continue;
    points.push({
      timestamp: p.timestamp,
      value: (volume * p.close - yesterday - invested) / base,
    });
  }
  return points;
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
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = hm.split(":").map(Number);
  return new TZDate(y!, m! - 1, d!, h!, min!, "Europe/Stockholm").getTime();
}
