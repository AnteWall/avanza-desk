import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import {
  AvanzaAuthenticationRequiredError,
  AvanzaClient,
  AvanzaHttpError,
  type SessionInfoResponse,
} from "avanza-ts";

import { tauriFetch } from "./tauri-fetch";

export type User = SessionInfoResponse["user"];

export const avanza = new AvanzaClient({ fetch: tauriFetch });

export function isUnauthorized(error: unknown) {
  return (
    error instanceof AvanzaAuthenticationRequiredError ||
    (error instanceof AvanzaHttpError && error.status === 401)
  );
}

// shortcut: refreshed cookies are only persisted here and after login; add an SDK
// session-change hook if sessions start dropping before Avanza's own timeout.
export function saveSession() {
  return invoke("session_save", { session: JSON.stringify(avanza.session) });
}

/** Signed in user, or `null` when there is no valid session (the sign-in overlay opens). */
export const meQuery = queryOptions({
  queryKey: ["auth", "me"],
  staleTime: Infinity,
  queryFn: async (): Promise<User | null> => {
    if (!avanza.session) {
      const stored = await invoke<string | null>("session_load");
      if (!stored) return null;
      avanza.setSession(JSON.parse(stored));
    }
    if (!(await avanza.auth.validateSession())) {
      await invoke("session_clear");
      return null;
    }
    const { user } = await avanza.auth.getSessionInfo();
    await saveSession();
    return user;
  },
});

/** Drops the session locally and opens the sign-in overlay. */
export async function signOut(queryClient: QueryClient, { remote = false } = {}) {
  if (remote) await avanza.auth.logout().catch(() => avanza.clearSession());
  else avanza.clearSession();
  await invoke("session_clear");
  // Drop everything fetched with the old session. Suspense queries cached in an error state
  // don't refetch on remount, so without this every panel would show the 401 after sign-in.
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== "auth" });
  queryClient.setQueryData(meQuery.queryKey, null);
}
