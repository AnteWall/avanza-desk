import { act, fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn<() => Promise<void>>(() => Promise.resolve()),
}));

import { getBinding } from "@/lib/shortcuts";

import { ShortcutRecorder } from "./shortcut-recorder";

test("click, then a key combination, rebinds the action", () => {
  render(<ShortcutRecorder action="search" />);
  const button = screen.getByRole("button", { name: /change shortcut/i });
  fireEvent.click(button);
  act(() => {
    fireEvent.keyDown(window, { code: "KeyP", key: "p", ctrlKey: true });
  });
  expect(getBinding("search")).toEqual({ code: "KeyP", mod: true });
});

test("a plain key pages use is refused with a reason, and recording continues", () => {
  render(<ShortcutRecorder action="assistant" />);
  fireEvent.click(screen.getByRole("button", { name: /change shortcut/i }));
  act(() => {
    fireEvent.keyDown(window, { code: "KeyA", key: "a" });
  });
  expect(screen.getByText(/add ctrl or alt/i)).toBeTruthy();
  act(() => {
    fireEvent.keyDown(window, { code: "KeyM", key: "m" });
  });
  expect(getBinding("assistant")).toEqual({ code: "KeyM" });
});
