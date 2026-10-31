import { useSyncExternalStore } from "react";

import { getPanelSize, subscribePanelSize } from "@/lib/ai/panel";

/** The assistant panel's width and expanded state (src/lib/ai/panel.ts). */
export const usePanelSize = () => useSyncExternalStore(subscribePanelSize, getPanelSize);
