import { useSyncExternalStore } from "react";

import { getInAppFrame, subscribeInAppFrame } from "@/lib/window-frame";

/** Whether the app draws its own window controls (Settings → Window). */
export const useInAppFrame = () => useSyncExternalStore(subscribeInAppFrame, getInAppFrame);
