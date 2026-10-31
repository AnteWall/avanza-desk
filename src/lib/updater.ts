import { queryOptions } from "@tanstack/react-query";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { toast } from "sonner";

/** The newer release on GitHub, or null. Shared by the startup toast and Settings. */
export const updateQuery = queryOptions({
  queryKey: ["app", "update"],
  queryFn: async () => (await check()) ?? null,
  // The app stays open for days; recheck every few hours.
  staleTime: 6 * 60 * 60_000,
  refetchInterval: 6 * 60 * 60_000,
  retry: false,
});

/** Downloads and installs the update, then restarts into it. */
export async function installUpdate(update: Update) {
  const id = toast.loading(`Downloading v${update.version}…`, { duration: Infinity });
  try {
    await update.downloadAndInstall();
    await relaunch();
  } catch (e) {
    toast.error("Update failed", { id, description: String(e) });
  }
}
