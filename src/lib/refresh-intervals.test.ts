import {
  getRefreshIntervals,
  refreshEvery,
  refreshIntervalDefaults,
  setRefreshIntervals,
} from "./refresh-intervals";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn<() => Promise<void>>(async () => undefined),
}));

test("saved intervals override defaults and feed refreshEvery", async () => {
  expect(getRefreshIntervals().positions).toBe(60_000);
  await setRefreshIntervals({ ...refreshIntervalDefaults, positions: 30_000 });
  expect(refreshEvery("positions")()).toBe(30_000);
  expect(refreshEvery("indices")()).toBe(refreshIntervalDefaults.indices);
});
