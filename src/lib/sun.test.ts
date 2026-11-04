import { describe, expect, it } from "vitest";

import { nightPath, subsolarPoint } from "./sun";

describe("subsolarPoint", () => {
  it("is over the Tropic of Cancer near Greenwich at noon UTC on the June solstice", () => {
    const [lat, lon] = subsolarPoint(new Date("2024-06-20T12:00:00Z"));
    expect(lat).toBeCloseTo(23.4, 0);
    expect(Math.abs(lon)).toBeLessThan(2);
  });

  it("is over the Tropic of Capricorn and the date line at midnight UTC in December", () => {
    const [lat, lon] = subsolarPoint(new Date("2024-12-21T00:00:00Z"));
    expect(lat).toBeCloseTo(-23.4, 0);
    expect(Math.abs(lon)).toBeGreaterThan(178);
  });
});

describe("nightPath", () => {
  it("closes on the dark pole", () => {
    expect(nightPath(new Date("2024-06-20T12:00:00Z"), 84, -58)).toMatch(/^M0 142L.*L360 142Z$/);
    expect(nightPath(new Date("2024-12-21T12:00:00Z"), 84, -58)).toMatch(/^M0 0L.*L360 0Z$/);
  });
});
