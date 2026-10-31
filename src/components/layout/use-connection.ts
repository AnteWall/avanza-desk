import { notifyManager, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

/** Newest successful and failed fetch times across every query, updated as the cache changes. */
export function useLastFetches() {
  const cache = useQueryClient().getQueryCache();
  // Batched like TanStack's own hooks: cache events fire while other components render.
  const subscribe = (onChange: () => void) => cache.subscribe(notifyManager.batchCalls(onChange));
  const newest = (pick: (q: ReturnType<typeof cache.getAll>[number]) => number) => () =>
    Math.max(0, ...cache.getAll().map(pick));
  const lastSuccess = useSyncExternalStore(
    subscribe,
    newest((q) => q.state.dataUpdatedAt),
  );
  const lastError = useSyncExternalStore(
    subscribe,
    newest((q) => (q.state.status === "error" ? q.state.errorUpdatedAt : 0)),
  );
  const online = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
    () => navigator.onLine,
  );
  return { lastSuccess, lastError, online };
}
