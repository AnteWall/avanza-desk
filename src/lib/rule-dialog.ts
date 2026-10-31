import type { AlertRule } from "./alert-rules";

// The "New alert rule" dialog, opened from anywhere (a table row's menu, a dossier fact, the
// Rules tab) with whatever that place already knows filled in. Mounted once in the app shell.

/** A rule in the making. With `kind` set the dialog skips the kind picker; with `id` it edits. */
export type RuleDraft = Partial<Omit<AlertRule, "created">> & { created?: string };

let draft: RuleDraft | null = null;
const listeners = new Set<() => void>();
const emit = () => {
  for (const l of listeners) l();
};

export const getRuleDraft = () => draft;

export function openRuleDialog(next: RuleDraft = {}) {
  draft = next;
  emit();
}

export function closeRuleDialog() {
  draft = null;
  emit();
}

export function subscribeRuleDialog(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
