import { useNavigate } from "@tanstack/react-router";
import { useCallback, useSyncExternalStore } from "react";

import { getTab, setTab, subscribeTabs } from "@/lib/tabs";
import type { FileRoutesByTo } from "@/routeTree.gen";

/** The open tab of the TabbedPanel `id`, following changes made anywhere. */
export const useTab = (id: string) => useSyncExternalStore(subscribeTabs, () => getTab(id));

/** Opens a page on one of its tabs (`panel` is the page's TabbedPanel `id`). */
export function useOpenTab() {
  const navigate = useNavigate();
  return useCallback(
    (to: keyof FileRoutesByTo, panel: string, tab: string) => {
      setTab(panel, tab);
      void navigate({ to });
    },
    [navigate],
  );
}
