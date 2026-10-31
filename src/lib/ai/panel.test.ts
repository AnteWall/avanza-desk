import { describe, expect, it } from "vitest";

import { clampWidth, MIN_WIDTH, panelCssWidth } from "./panel";

describe("clampWidth", () => {
  it("keeps the panel between its minimum and what leaves the app usable", () => {
    expect(clampWidth(100, 1600)).toBe(MIN_WIDTH);
    expect(clampWidth(700.4, 1600)).toBe(700);
    expect(clampWidth(1500, 1600)).toBe(1120);
    // A window too small for both still gets the minimum panel.
    expect(clampWidth(500, 700)).toBe(MIN_WIDTH);
  });
});

describe("panelCssWidth", () => {
  it("uses the dragged width, or most of the window when expanded", () => {
    expect(panelCssWidth({ width: 420, expanded: false })).toBe("420px");
    expect(panelCssWidth({ width: 420, expanded: true })).toContain("100vw");
  });
});
