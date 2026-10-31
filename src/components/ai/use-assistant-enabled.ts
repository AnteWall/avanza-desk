import { useSyncExternalStore } from "react";

import { getConnected, subscribeConnected } from "@/lib/ai/connected";

/** Whether any provider is connected, so the assistant is on (src/lib/ai/connected.ts). */
export const useAssistantEnabled = () =>
  useSyncExternalStore(subscribeConnected, () => getConnected().length > 0);
