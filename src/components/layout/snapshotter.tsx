import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { collectSnapshots } from "@/lib/avanza/collect-snapshots";
import { getSetting, saveSetting } from "@/lib/settings";
import { saveSnapshots, stockholmDay } from "@/lib/snapshots";

const KEY = "snapshots:day";

/**
 * Records the day's snapshot (src/lib/snapshots.ts) once per Stockholm day: at startup, then
 * hourly checks catch midnight while the app stays open. A failed pass retries next hour.
 * Renders nothing.
 */
export function Snapshotter() {
  const client = useQueryClient();
  useEffect(() => {
    let running = false;
    const run = async () => {
      const day = stockholmDay();
      if (running || getSetting<string | null>(KEY, null) === day) return;
      running = true;
      try {
        await saveSnapshots(await collectSnapshots(client), day);
        await saveSetting(KEY, day);
        void client.invalidateQueries({ queryKey: ["snapshots"] });
      } catch (e) {
        console.warn("snapshot failed", e);
      } finally {
        running = false;
      }
    };
    void run();
    const timer = setInterval(run, 60 * 60_000);
    return () => clearInterval(timer);
  }, [client]);
  return null;
}
