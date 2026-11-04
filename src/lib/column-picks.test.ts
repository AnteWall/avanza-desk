import { columnPicks } from "./column-picks";

test("an unsaved pick returns the same fallback array on every read", () => {
  const picks = columnPicks<"a" | "b">("test-columns", { a: "A", b: "B" }, () => ["a"]);
  expect(picks.get()).toBe(picks.get());
  expect(picks.get()).toEqual(["a"]);
});
