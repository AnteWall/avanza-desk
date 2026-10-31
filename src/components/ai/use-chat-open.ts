import { useEffect, useSyncExternalStore } from "react";

import { isAssistantOpen, setAssistantOpen, subscribeAssistant } from "@/lib/ai/ask";

/** Whether the AI chat panel is open; remembered across restarts. Ctrl+J toggles it. */
export function useChatOpen() {
  const open = useSyncExternalStore(subscribeAssistant, isAssistantOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.altKey || e.metaKey || e.code !== "KeyJ") return;
      e.preventDefault();
      setAssistantOpen(!isAssistantOpen());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return [open, () => setAssistantOpen(!open)] as const;
}
