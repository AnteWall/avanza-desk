// Price and performance histories run to hundreds of points; the assistant needs their shape,
// not every point. This keeps the ends, the extremes and an even sample in between.

export type SeriesPoint = { time: number; value: number };

const DAY = 86_400_000;

const stamp = (time: number, intraday: boolean) => {
  const iso = new Date(time).toISOString();
  return intraday ? iso.slice(0, 16).replace("T", " ") : iso.slice(0, 10);
};

/** Start, end, change, high, low and up to `samples` evenly spaced points (UTC times). */
export function summarizeSeries(points: readonly SeriesPoint[], samples = 30) {
  if (points.length === 0) return { points: 0 };
  const first = points[0];
  const last = points[points.length - 1];
  const intraday = last.time - first.time < 2 * DAY;
  let high = first;
  let low = first;
  for (const p of points) {
    if (p.value > high.value) high = p;
    if (p.value < low.value) low = p;
  }
  const step = Math.max(1, (points.length - 1) / Math.max(1, samples - 1));
  const picked = new Set<number>();
  for (let i = 0; i < points.length - 1; i += step) picked.add(Math.round(i));
  picked.add(points.length - 1);
  const at = (p: SeriesPoint) => ({ time: stamp(p.time, intraday), value: p.value });
  return {
    from: at(first),
    to: at(last),
    change: first.value ? (last.value - first.value) / Math.abs(first.value) : null,
    high: at(high),
    low: at(low),
    sample: [...picked].sort((a, b) => a - b).map((i) => at(points[i])),
  };
}
