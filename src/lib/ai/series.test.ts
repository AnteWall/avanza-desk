import { describe, expect, it } from "vitest";

import { summarizeSeries } from "./series";

const DAY = 86_400_000;
const t0 = Date.UTC(2026, 0, 1);

describe("summarizeSeries", () => {
  it("keeps the ends, extremes and change of a long series", () => {
    const points = Array.from({ length: 250 }, (_, i) => ({
      time: t0 + i * DAY,
      value: i === 100 ? 500 : i === 200 ? 10 : 100 + i * 0.1,
    }));
    const s = summarizeSeries(points, 30);
    expect(s).toMatchObject({
      from: { time: "2026-01-01", value: 100 },
      high: { value: 500 },
      low: { value: 10 },
    });
    expect(s.sample?.length).toBeLessThanOrEqual(31);
    expect(s.sample?.at(-1)).toEqual(s.to);
    expect("change" in s && s.change).toBeCloseTo(0.249);
  });

  it("shows times for intraday series and handles tiny ones", () => {
    const intraday = summarizeSeries([
      { time: t0 + 9 * 3_600_000, value: 1 },
      { time: t0 + 10 * 3_600_000, value: 2 },
    ]);
    expect(intraday).toMatchObject({ from: { time: "2026-01-01 09:00" }, change: 1 });
    expect(summarizeSeries([])).toEqual({ points: 0 });
  });
});
