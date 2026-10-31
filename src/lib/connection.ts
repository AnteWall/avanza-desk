export type Connection = { state: "live" | "stale" | "error"; label: string };

// Something always polls (indices every 30s, positions every minute), so no success for this
// long means requests are failing or hanging.
const staleAfter = 90_000;

/**
 * Connection health from the query cache: when the newest error is newer than the newest
 * success, Avanza can't be reached; when nothing succeeded for a while, data is stale.
 */
export function connection(
  lastSuccess: number,
  lastError: number,
  now: number,
  online: boolean,
): Connection {
  if (!online) return { state: "error", label: "Offline" };
  if (lastError > lastSuccess) return { state: "error", label: "Can't reach Avanza" };
  if (!lastSuccess) return { state: "live", label: "Connecting…" };
  const age = Math.max(0, Math.round((now - lastSuccess) / 1000));
  return {
    state: now - lastSuccess > staleAfter ? "stale" : "live",
    label: `Updated ${age < 60 ? `${age}s` : `${Math.round(age / 60)} min`} ago`,
  };
}
