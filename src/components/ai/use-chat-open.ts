import { useSyncExternalStore } from "react";

import { useShortcut } from "@/components/layout/use-shortcuts";
import { isAssistantOpen, setAssistantOpen, subscribeAssistant } from "@/lib/ai/ask";

/** Whether the AI chat panel is open; remembered across restarts. Ctrl+J (rebindable) toggles it. */
export function useChatOpen() {
  const open = useSyncExternalStore(subscribeAssistant, isAssistantOpen);

  useShortcut("assistant", () => setAssistantOpen(!isAssistantOpen()));

  return [open, () => setAssistantOpen(!open)] as const;
}
