import { expect, test } from "vitest";

import {
  alignGrowth,
  covariance,
  dailyReturns,
  effectiveHoldings,
  historyStats,
  holdValue,
  maxDrawdown,
  portfolioVol,
  riskShares,
  trackingError,
} from "./rebalance-check";

const DAY = 24 * 60 * 60_000;
const series = (values: number[], startDay = 0) =>
  values.map((v, i) => ({ timestamp: (startDay + i) * DAY, value: v }));

test("aligns from the youngest series, carries prices over gaps and rebases to 1", () => {
  const a = series([0, 0.1, 0.2, 0.32]);
  // Starts a day later and has no price on day 2.
  const b = [
    { timestamp: 1 * DAY, value: 0 },
    { timestamp: 3 * DAY, value: 0.5 },
  ];
  const g = alignGrowth([a, b]);
  expect(g.timestamps).toEqual([1 * DAY, 2 * DAY, 3 * DAY]);
  expect(g.growth[0]).toEqual([1, 1.2 / 1.1, 1.32 / 1.1]);
  expect(g.growth[1]).toEqual([1, 1, 1.5]);
});

test("holding without rebalancing lets weights drift, cash stays flat", () => {
  const g = {
    timestamps: [0, 1],
    growth: [
      [1, 2],
      [1, 1],
    ],
  };
  // 50 % in a doubler, 25 % flat, 25 % cash.
  expect(holdValue([0.5, 0.25], g)).toEqual([1, 1.5]);
});

test("drawdown is the worst fall from a peak", () => {
  expect(maxDrawdown([1, 1.2, 0.9, 1.3, 1.17])).toBeCloseTo(0.25);
  expect(maxDrawdown([1, 1.1, 1.2])).toBe(0);
});

test("history stats: return and volatility of a steady and a choppy series", () => {
  const steady = historyStats([1, 1.01, 1.0201]);
  expect(steady.ret).toBeCloseTo(0.0201);
  expect(steady.vol).toBeCloseTo(0);
  const choppy = historyStats([1, 1.1, 0.99, 1.089]);
  expect(choppy.vol).toBeGreaterThan(1);
  expect(choppy.maxDrawdown).toBeCloseTo(0.1);
});

test("equal weights in two uncorrelated assets cut volatility by √2", () => {
  const a = [0.01, -0.01, 0.01, -0.01];
  const b = [0.01, 0.01, -0.01, -0.01];
  const cov = covariance([a, b]);
  expect(cov[0]![1]).toBeCloseTo(0);
  const single = portfolioVol([1, 0], cov);
  expect(portfolioVol([0.5, 0.5], cov)).toBeCloseTo(single / Math.SQRT2);
  expect(riskShares([0.5, 0.5], cov)).toEqual([0.5, 0.5]);
});

test("risk shares sum to 1 and favour the volatile holding", () => {
  const calm = [0.001, -0.002, 0.001, 0.0005];
  const wild = [0.03, -0.05, 0.04, -0.01];
  const shares = riskShares([0.8, 0.2], covariance([calm, wild]));
  expect(shares[0]! + shares[1]!).toBeCloseTo(1);
  expect(shares[1]).toBeGreaterThan(0.8);
});

test("tracking error is zero for identical portfolios", () => {
  const v = [1, 1.02, 0.98, 1.05];
  expect(trackingError(v, v)).toBe(0);
  expect(trackingError(v, [1, 1, 1, 1])).toBeGreaterThan(0);
  expect(dailyReturns([1, 1.1])[0]).toBeCloseTo(0.1);
});

test("effective holdings counts even weights and shrinks with concentration", () => {
  expect(effectiveHoldings([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(4);
  expect(effectiveHoldings([0.7, 0.1, 0.1, 0.1])).toBeLessThan(2);
});
