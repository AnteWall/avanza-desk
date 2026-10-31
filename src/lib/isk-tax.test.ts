import { expect, test } from "vitest";

import { iskTax, iskYear, quarterStarts } from "./isk-tax";

test("tax is 30 % of the rate on the base above the allowance", () => {
  const t = iskTax({
    quarterValues: [400_000, 400_000, 400_000, 400_000],
    deposits: 100_000,
    rate: 0.03,
    allowance: 150_000,
  });
  expect(t.base).toBe(425_000);
  expect(t.taxable).toBe(275_000);
  expect(t.tax).toBeCloseTo(275_000 * 0.03 * 0.3);
});

test("rate floor and allowance cover", () => {
  expect(
    iskTax({
      quarterValues: [100_000, 100_000, 100_000, 100_000],
      deposits: 0,
      rate: 0.01,
      allowance: 0,
    }).income,
  ).toBeCloseTo(1250);
  expect(
    iskTax({ quarterValues: [1, 1, 1, 1], deposits: 0, rate: 0.03, allowance: 300_000 }).tax,
  ).toBe(0);
});

test("years without a known rate use the nearest earlier one", () => {
  expect(iskYear(2030)).toEqual(iskYear(2026));
  expect(iskYear(2020)).toEqual(iskYear(2024));
  expect(quarterStarts(2026)[1]).toBe("2026-04-01");
});
