import { expect, test } from "vitest";

import { sinceClose, stockholmTime, weightedLine } from "./intraday";

test("sinceClose is each close against the previous close", () => {
  expect(sinceClose([{ timestamp: 1, close: 110 }], 100)[0]!.value).toBeCloseTo(0.1);
  expect(sinceClose([{ timestamp: 1, close: 110 }], null)).toEqual([]);
});

test("weightedLine carries values forward and counts 0 before the first trade", () => {
  const line = weightedLine([
    { weight: 3, points: [{ timestamp: 1, value: 0.04 }] },
    {
      weight: 1,
      points: [
        { timestamp: 2, value: 0.08 },
        { timestamp: 3, value: -0.04 },
      ],
    },
  ]);
  expect(line.map((p) => p.timestamp)).toEqual([1, 2, 3]);
  expect(line[0]!.value).toBeCloseTo(0.03);
  expect(line[1]!.value).toBeCloseTo(0.05);
  expect(line[2]!.value).toBeCloseTo(0.02);
  expect(weightedLine([])).toEqual([]);
});

test("stockholmTime follows Swedish summer and winter time", () => {
  expect(new Date(stockholmTime("2026-11-02", "09:00")).toISOString()).toBe(
    "2026-11-02T08:00:00.000Z",
  );
  expect(new Date(stockholmTime("2026-07-01", "09:00")).toISOString()).toBe(
    "2026-07-01T07:00:00.000Z",
  );
});
