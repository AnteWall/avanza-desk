import { queryOptions } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

// Daily numbers Avanza only shows as "now" (src-tauri/src/snapshots.rs). `Snapshotter` writes
// one row per kind and key a day; features read them back as series to show trends.

/** What a snapshot measures; `key` is an orderbook id unless noted. */
export type SnapshotKind =
  | "short" // short interest, as Avanza reports it
  | "target" // average analyst price target
  | "analysts" // number of analysts behind the target
  | "consensus" // buy share of recommendations, 0…1
  | "owners" // Avanza customers holding the stock
  | "price" // last price
  | "weight" // share of the portfolio, 0…1; key: holding key
  | "ltv"; // loan-to-value per credit account, 0…1; key: account id

export type SnapshotRow = { kind: SnapshotKind; key: string; value: number };
export type SnapshotPoint = { day: string; value: number };

/** Today's date in Stockholm (yyyy-MM-dd): the snapshot day. */
export const stockholmDay = (date = new Date()) =>
  date.toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" });

export const saveSnapshots = (rows: readonly SnapshotRow[], day = stockholmDay()) =>
  invoke("snapshot_save", { day, rows });

/** Each key's points of `kind` since `from` (yyyy-MM-dd), oldest first. */
export const snapshotSeriesQuery = (kind: SnapshotKind, from: string) =>
  queryOptions({
    queryKey: ["snapshots", kind, from],
    queryFn: async () => {
      const rows = await invoke<[string, string, number][]>("snapshot_series", { kind, from });
      const byKey = new Map<string, SnapshotPoint[]>();
      for (const [key, day, value] of rows) {
        const points = byKey.get(key) ?? [];
        points.push({ day, value });
        byKey.set(key, points);
      }
      return byKey;
    },
    staleTime: 10 * 60_000,
  });
