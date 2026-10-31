import { useMemo, useSyncExternalStore } from "react";

import { getConnected, subscribeConnected } from "@/lib/ai/connected";
import { providers } from "@/lib/ai/providers";

/** The connected providers, in menu order. */
export function useConnectedProviders() {
  const ids = useSyncExternalStore(subscribeConnected, getConnected);
  return useMemo(() => providers.filter((p) => ids.includes(p.id)), [ids]);
}
