import { getSetting, saveSetting } from "@/lib/settings";

import type { ContextItem } from "./context";

// Whether the assistant panel is open, and "Ask the assistant" requests from anywhere in the
// app (a table row's menu, a header button). A request opens the panel; the chat picks it up.

export type Ask = {
  /** Context to attach to the next message, beyond what's on screen. */
  items: ContextItem[];
  /** Text for the message box. */
  prompt?: string;
  /** Send `prompt` right away instead of leaving it to edit. */
  send?: boolean;
  /** Bumped per request, so asking the same thing twice still lands. */
  n: number;
};

let open = false;
let loaded = false;
let ask: Ask | undefined;
let count = 0;
const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) listener();
};

export function subscribeAssistant(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function isAssistantOpen() {
  if (!loaded) {
    loaded = true;
    open = getSetting("ai:open", false);
  }
  return open;
}

export function setAssistantOpen(next: boolean) {
  open = next;
  loaded = true;
  void saveSetting("ai:open", next);
  notify();
}

let handler: ((ask: Ask) => void) | undefined;

/** Opens the assistant with this context (and prompt). */
export function askAssistant(request: Omit<Ask, "n">) {
  const next = { ...request, n: ++count };
  // The open chat takes it now; otherwise it waits for the chat to mount.
  if (handler) handler(next);
  else ask = next;
  setAssistantOpen(true);
}

/** The chat receives requests through `take`, starting with one that came before it mounted. */
export function takeAsks(take: (ask: Ask) => void) {
  handler = take;
  if (ask) {
    const pending = ask;
    ask = undefined;
    take(pending);
  }
  return () => {
    if (handler === take) handler = undefined;
  };
}

/** How many asks there have been; the panel watches it to leave its history list. */
export const getAskCount = () => count;
