import { useEffect, useRef, useSyncExternalStore } from "react";

import {
  getBinding,
  getShortcutOverrides,
  matches,
  subscribeShortcuts,
  type ShortcutAction,
} from "@/lib/shortcuts";

/** Re-renders when a shortcut is rebound; read keys with `getBinding` after calling it. */
export const useShortcutBindings = () =>
  useSyncExternalStore(subscribeShortcuts, getShortcutOverrides);

/** Runs `run` when the action's (rebindable) keys are pressed, anywhere in the window. */
export function useShortcut(action: ShortcutAction, run: () => void) {
  const latest = useRef(run);
  useEffect(() => {
    latest.current = run;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!matches(e, getBinding(action))) return;
      e.preventDefault();
      latest.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [action]);
}
