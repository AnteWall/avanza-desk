import { connection } from "./connection";

test("reports live, stale, failing and offline", () => {
  expect(connection(1_000, 0, 4_000, true)).toEqual({ state: "live", label: "Updated 3s ago" });
  expect(connection(0, 0, 4_000, true).state).toBe("live");
  expect(connection(1_000, 0, 200_000, true)).toEqual({
    state: "stale",
    label: "Updated 3 min ago",
  });
  expect(connection(1_000, 2_000, 3_000, true).label).toBe("Can't reach Avanza");
  expect(connection(1_000, 0, 2_000, false).label).toBe("Offline");
});
