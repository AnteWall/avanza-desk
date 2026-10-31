import { expect, test } from "vitest";

import { rebase, simulate, xirr } from "./benchmark";

const YEAR = 365.25 * 24 * 60 * 60_000;

test("rebase starts at zero and compounds from the first point", () => {
  const r = rebase([
    { timestamp: 0, value: 10 },
    { timestamp: 1, value: 21 },
  ]);
  expect(r[0]!.value).toBe(0);
  expect(r[1]!.value).toBeCloseTo(0.1);
});

test("simulate grows each flow from its own date to the end", () => {
  const series = [
    { timestamp: 0, value: 0 },
    { timestamp: 10, value: 1 }, // doubled
    { timestamp: 20, value: 3 }, // doubled again
  ];
  // 100 at the start ×4, 50 mid-way ×2, −20 at the end ×1.
  expect(
    simulate(
      [
        { date: 0, amount: 100 },
        { date: 15, amount: 50 },
        { date: 20, amount: -20 },
      ],
      series,
    ),
  ).toBeCloseTo(480);
});

test("xirr finds the annual rate and gives up without a sign change", () => {
  expect(
    xirr([
      { date: 0, amount: -100 },
      { date: YEAR, amount: 110 },
    ]),
  ).toBeCloseTo(0.1, 6);
  expect(
    xirr([
      { date: 0, amount: -100 },
      { date: 2 * YEAR, amount: 121 },
    ]),
  ).toBeCloseTo(0.1, 6);
  expect(
    xirr([
      { date: 0, amount: 100 },
      { date: YEAR, amount: 110 },
    ]),
  ).toBeNull();
});
