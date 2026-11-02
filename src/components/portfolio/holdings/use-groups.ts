import { useSyncExternalStore } from "react";

import { getGroupId, getGroups, subscribeGroups } from "@/lib/groups";

export const useGroups = () => useSyncExternalStore(subscribeGroups, getGroups);

/** The group the portfolio page is narrowed to, if any. */
export function useGroup() {
  const id = useSyncExternalStore(subscribeGroups, getGroupId);
  return useGroups().find((g) => g.id === id);
}
