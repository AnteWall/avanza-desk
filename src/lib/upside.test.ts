import { expect, test } from "vitest";

import { byUpside, parseFairValue, upside } from "./upside";

test("parses fair values in either decimal style", () => {
  expect(parseFairValue("123.45")).toBe(123.45);
  expect(parseFairValue("1 234,5")).toBe(1234.5);
  expect(parseFairValue("n/a")).toBeUndefined();
  expect(parseFairValue("")).toBeUndefined();
});

test("upside and its ordering, missing coverage last", () => {
  expect(upside(100, 125)).toBeCloseTo(0.25);
  expect(upside(null, 125)).toBeUndefined();
  const rows = [
    { id: "none" },
    { id: "fair", fairUpside: 0.5 },
    { id: "low", targetUpside: -0.1 },
    { id: "high", targetUpside: 0.3 },
  ];
  // Equal -Infinity on both sides gives NaN; the fair-value tie-break still has to apply.
  expect(rows.sort(byUpside).map((r) => r.id)).toEqual(["high", "low", "fair", "none"]);
});
