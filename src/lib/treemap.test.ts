import { describe, expect, it } from "vitest";

import { squarify } from "./treemap";

describe("squarify", () => {
  const rect = { x: 10, y: 20, w: 600, h: 400 };
  const weights = [6, 6, 4, 3, 2, 2, 1, 0, -1];
  const tiles = squarify(weights, (w) => w, rect);

  it("gives each positive weight a proportional area that fills the rect", () => {
    expect(tiles.map((t) => t.item)).toEqual([6, 6, 4, 3, 2, 2, 1]);
    const total = 24;
    for (const t of tiles) expect(t.w * t.h).toBeCloseTo((t.item / total) * 600 * 400, 6);
  });

  it("keeps tiles inside the rect without overlapping", () => {
    const eps = 1e-9;
    for (const t of tiles) {
      expect(t.x).toBeGreaterThanOrEqual(rect.x - eps);
      expect(t.y).toBeGreaterThanOrEqual(rect.y - eps);
      expect(t.x + t.w).toBeLessThanOrEqual(rect.x + rect.w + eps);
      expect(t.y + t.h).toBeLessThanOrEqual(rect.y + rect.h + eps);
    }
    for (const a of tiles)
      for (const b of tiles) {
        if (a === b) continue;
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        expect(overlapX <= eps || overlapY <= eps).toBe(true);
      }
  });

  it("returns nothing for an empty rect or no weight", () => {
    expect(squarify([1, 2], (w) => w, { x: 0, y: 0, w: 0, h: 100 })).toEqual([]);
    expect(squarify([0], (w) => w, rect)).toEqual([]);
  });
});
