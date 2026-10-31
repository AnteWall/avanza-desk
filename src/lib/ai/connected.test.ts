import { beforeEach, expect, test } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn<() => Promise<void>>(async () => undefined),
}));

beforeEach(() => vi.resetModules());

test("carries over the old switch as the provider in use", async () => {
  const { saveSetting } = await import("@/lib/settings");
  void saveSetting("ai:enabled", true);
  void saveSetting("ai:provider", "codex");
  const { getConnected } = await import("./connected");
  expect(getConnected()).toEqual(["codex"]);
});

test("connects and disconnects providers one by one", async () => {
  const { connect, disconnect, getConnected, subscribeConnected } = await import("./connected");
  let changes = 0;
  subscribeConnected(() => changes++);
  connect("claude");
  connect("codex");
  connect("claude");
  expect(getConnected()).toEqual(["codex", "claude"]);
  disconnect("codex");
  expect(getConnected()).toEqual(["claude"]);
  expect(changes).toBe(4);
});
