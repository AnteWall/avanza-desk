import { describe, expect, it } from "vitest";

import { ema, macd, rsi, sma, vwap } from "./indicators";

describe("indicators", () => {
  it("sma averages the last n closes", () => {
    expect(sma([1, 2, 3, 4], 2)).toEqual([null, 1.5, 2.5, 3.5]);
  });

  it("ema seeds with the simple average, then weights recent closes", () => {
    const e = ema([1, 2, 3, 4], 3);
    expect(e.slice(0, 3)).toEqual([null, null, 2]);
    expect(e[3]).toBeCloseTo(3);
  });

  it("rsi is 100 when prices only rise and 0 when they only fall", () => {
    const up = Array.from({ length: 20 }, (_, i) => i + 1);
    expect(rsi(up, 14)[13]).toBeNull();
    expect(rsi(up, 14)[14]).toBe(100);
    expect(rsi([...up].reverse(), 14)[19]).toBe(0);
  });

  it("macd histogram is the line minus its signal", () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const m = macd(closes);
    expect(m.line[24]).toBeNull();
    expect(m.line[25]).not.toBeNull();
    expect(m.signal[32]).toBeNull();
    expect(m.histogram[40]).toBeCloseTo(m.line[40]! - m.signal[40]!);
  });

  it("vwap weights typical prices by volume", () => {
    const bar = (p: number, v: number) => ({
      timestamp: 0,
      open: p,
      high: p,
      low: p,
      close: p,
      totalVolumeTraded: v,
    });
    expect(vwap([bar(10, 1), bar(20, 3)])).toEqual([10, 17.5]);
  });
});
