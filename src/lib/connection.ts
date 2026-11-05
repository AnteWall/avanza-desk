import { m } from "@/lib/i18n";

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
  if (!online) return { state: "error", label: m.layout.statusBar.offline };
  if (lastError > lastSuccess) return { state: "error", label: m.layout.statusBar.unreachable };
  if (!lastSuccess) return { state: "live", label: m.layout.statusBar.connecting };
  const age = Math.max(0, Math.round((now - lastSuccess) / 1000));
  return {
    state: now - lastSuccess > staleAfter ? "stale" : "live",
    label:
      age < 60
        ? m.layout.statusBar.updatedSeconds(age)
        : m.layout.statusBar.updatedMinutes(Math.round(age / 60)),
  };
}
