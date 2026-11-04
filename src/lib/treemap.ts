export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Squarified treemap (Bruls, Huizing, van Wijk): splits `rect` into one rectangle per item with
 * an area proportional to its weight, keeping tiles as close to square as it can. Items with no
 * positive weight are left out. Biggest first, so the largest tile lands top left.
 */
export function squarify<T>(
  items: readonly T[],
  weight: (item: T) => number,
  rect: Rect,
): (Rect & { item: T })[] {
  const total = items.reduce((sum, item) => sum + Math.max(weight(item), 0), 0);
  if (total <= 0 || rect.w <= 0 || rect.h <= 0) return [];
  const scale = (rect.w * rect.h) / total;
  const queue = items
    .map((item) => ({ item, area: weight(item) * scale }))
    .filter((n) => n.area > 0)
    .sort((a, b) => b.area - a.area);

  const out: (Rect & { item: T })[] = [];
  let free = { ...rect };
  let row: typeof queue = [];

  // The worst aspect ratio in a row laid along a side of length `side`.
  const worst = (r: typeof queue, side: number) => {
    const sum = r.reduce((s, n) => s + n.area, 0);
    const max = Math.max(...r.map((n) => n.area));
    const min = Math.min(...r.map((n) => n.area));
    return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
  };

  // Lay the row along the shorter side of the free space, then shrink it.
  const place = (r: typeof queue) => {
    const sum = r.reduce((s, n) => s + n.area, 0);
    if (free.w >= free.h) {
      const w = sum / free.h;
      let y = free.y;
      for (const n of r) {
        const h = n.area / w;
        out.push({ item: n.item, x: free.x, y, w, h });
        y += h;
      }
      free = { ...free, x: free.x + w, w: free.w - w };
    } else {
      const h = sum / free.w;
      let x = free.x;
      for (const n of r) {
        const w = n.area / h;
        out.push({ item: n.item, x, y: free.y, w, h });
        x += w;
      }
      free = { ...free, y: free.y + h, h: free.h - h };
    }
  };

  for (const n of queue) {
    const side = Math.min(free.w, free.h);
    if (row.length === 0 || worst([...row, n], side) <= worst(row, side)) row.push(n);
    else {
      place(row);
      row = [n];
    }
  }
  if (row.length > 0) place(row);
  return out;
}
