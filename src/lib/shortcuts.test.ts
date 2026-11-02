import { beforeEach, expect, test, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn<() => Promise<void>>(() => Promise.resolve()),
}));

import { saveSetting } from "./settings";
import { bindingFromEvent, getBinding, matches, setBinding } from "./shortcuts";

const key = (code: string, mods: Partial<KeyboardEventInit> = {}) =>
  new KeyboardEvent("keydown", { code, ...mods });

beforeEach(() => void saveSetting("shortcuts", {}));

test("defaults match Ctrl or ⌘ and Alt digits", () => {
  expect(matches(key("KeyK", { ctrlKey: true }), getBinding("search"))).toBe(true);
  expect(matches(key("KeyK", { metaKey: true }), getBinding("search"))).toBe(true);
  expect(matches(key("KeyK"), getBinding("search"))).toBe(false);
  expect(matches(key("Digit2", { altKey: true }), getBinding("page:/"))).toBe(true);
});

test("taking another action's keys gives that action its default back", () => {
  setBinding("search", { code: "KeyJ", mod: true });
  expect(getBinding("search")).toEqual({ code: "KeyJ", mod: true });
  // The assistant's default is now taken, so it's left without a shortcut.
  expect(getBinding("assistant")?.code).toBe("");
  setBinding("search", null);
  expect(getBinding("search")).toEqual({ code: "KeyK", mod: true });
});

test("recording waits through modifiers and refuses plain keys pages use", () => {
  expect(bindingFromEvent(key("ControlLeft", { ctrlKey: true }))).toBe("modifier");
  expect(bindingFromEvent(key("KeyA"))).toBe("taken");
  expect(bindingFromEvent(key("KeyA", { altKey: true, shiftKey: true }))).toEqual({
    code: "KeyA",
    alt: true,
    shift: true,
  });
  expect(bindingFromEvent(key("KeyM"))).toEqual({ code: "KeyM" });
});

test("plain-key shortcuts don't fire while typing", () => {
  setBinding("search", { code: "KeyM" });
  const input = document.createElement("input");
  document.body.append(input);
  const typed = new KeyboardEvent("keydown", { code: "KeyM" });
  Object.defineProperty(typed, "target", { value: input });
  expect(matches(typed, getBinding("search"))).toBe(false);
  expect(matches(key("KeyM"), getBinding("search"))).toBe(true);
});
