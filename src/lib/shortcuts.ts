import { pageDigit, pages } from "@/components/layout/pages";

import { isTyping } from "./keys";
import { getSetting, saveSetting } from "./settings";

// Global shortcuts the user can rebind (Settings › Shortcuts). Saved as overrides of the
// defaults, so new defaults still reach people who changed something else.

/** A key combination. `code` is the physical key (`KeyK`, `Digit1`), layout-independent. */
export type Binding = { code: string; mod?: boolean; alt?: boolean; shift?: boolean };

export type ShortcutAction = "search" | "assistant" | `page:${string}`;

export const shortcutActions: {
  action: ShortcutAction;
  group: "general" | "pages";
  label: string;
  /** One line on what it does, under the label in Settings (general actions only). */
  hint?: string;
  fallback: Binding;
}[] = [
  {
    action: "search",
    group: "general",
    label: "Search",
    hint: "Find an instrument or page from anywhere.",
    fallback: { code: "KeyK", mod: true },
  },
  {
    action: "assistant",
    group: "general",
    label: "Assistant",
    hint: "Open or close the assistant panel.",
    fallback: { code: "KeyJ", mod: true },
  },
  ...pages.map((p, i) => ({
    action: `page:${p.to}` as const,
    group: "pages" as const,
    label: p.label,
    fallback: { code: `Digit${pageDigit(i)}`, alt: true },
  })),
];

const KEY = "shortcuts";
const listeners = new Set<() => void>();
const none: Partial<Record<ShortcutAction, Binding>> = {};

export const getShortcutOverrides = () =>
  getSetting<Partial<Record<ShortcutAction, Binding>>>(KEY, none);

export const getBinding = (action: ShortcutAction): Binding | undefined =>
  getShortcutOverrides()[action] ?? shortcutActions.find((a) => a.action === action)?.fallback;

const same = (a: Binding | undefined, b: Binding) =>
  !!a && a.code === b.code && !!a.mod === !!b.mod && !!a.alt === !!b.alt && !!a.shift === !!b.shift;

/** The action already on `binding`, other than `except`. */
export const boundTo = (binding: Binding, except?: ShortcutAction) =>
  shortcutActions.find((a) => a.action !== except && same(getBinding(a.action), binding));

/**
 * Binds `action` to `binding` (`null` restores the default). An action that had the same
 * keys gets its default back, or none if that's taken too, so one combination never does two things.
 */
export function setBinding(action: ShortcutAction, binding: Binding | null) {
  const next = { ...getShortcutOverrides() };
  if (binding) {
    next[action] = binding;
    const clash = boundTo(binding, action);
    if (clash) {
      const fallback = clash.fallback;
      // An empty code never matches: the action is left without a shortcut.
      next[clash.action] = same(fallback, binding) ? { code: "" } : fallback;
    }
  } else delete next[action];
  void saveSetting(KEY, next);
  for (const l of listeners) l();
}

export function subscribeShortcuts(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

const plain = (b: Binding) => !b.mod && !b.alt;

export const matches = (e: KeyboardEvent, b: Binding | undefined) =>
  !!b?.code &&
  // A key without Ctrl/⌘ or Alt is a letter while typing in a field.
  !(plain(b) && isTyping(e)) &&
  e.code === b.code &&
  // Ctrl and ⌘ both count as `mod`, so one binding works on every platform.
  (e.ctrlKey || e.metaKey) === !!b.mod &&
  e.altKey === !!b.alt &&
  e.shiftKey === !!b.shift;

const modifierCodes = /^(Control|Shift|Alt|Meta|OS|CapsLock)(Left|Right)?$/;

// Plain keys the pages already use: chart ranges, table navigation, Rebalance's add.
const taken = /^(Digit[1-6]|KeyA|KeyJ|KeyK|Arrow\w+|Enter|Escape|Tab|Space|Backspace)$/;

/**
 * What a key press records: a binding, `"modifier"` while only modifiers are down (keep
 * waiting), or `"taken"` for a plain key a page already uses (add Ctrl/⌘ or Alt).
 */
export function bindingFromEvent(e: KeyboardEvent): Binding | "modifier" | "taken" {
  if (modifierCodes.test(e.code)) return "modifier";
  const mod = e.ctrlKey || e.metaKey;
  if (!mod && !e.altKey && taken.test(e.code)) return "taken";
  return {
    code: e.code,
    ...(mod ? { mod: true } : {}),
    ...(e.altKey ? { alt: true } : {}),
    ...(e.shiftKey ? { shift: true } : {}),
  };
}

const mac = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);

/** The keys of a binding, for `<Kbd>`s: ["Ctrl", "K"]. */
export function bindingKeys(b: Binding | undefined): string[] {
  if (!b?.code) return [];
  const key = b.code.replace(/^Key|^Digit|^Numpad/, "");
  return [
    ...(b.mod ? [mac ? "⌘" : "Ctrl"] : []),
    ...(b.alt ? [mac ? "⌥" : "Alt"] : []),
    ...(b.shift ? ["Shift"] : []),
    key,
  ];
}
