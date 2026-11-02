import { invoke } from "@tauri-apps/api/core";
import { documentDir, join } from "@tauri-apps/api/path";
import { save } from "@tauri-apps/plugin-dialog";

// CSV for spreadsheets set to Swedish: `;` between fields, since numbers use a decimal comma.

const field = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

export const toCsv = (rows: readonly (readonly string[])[]) =>
  rows.map((r) => r.map(field).join(";")).join("\r\n") + "\r\n";

/** Writes `csv` to a `.csv` path (src-tauri/src/csv.rs). */
export const writeCsv = (path: string, csv: string) => invoke("csv_write", { path, csv });

/** Asks where to save a `.csv` file, starting in Documents; undefined if cancelled. */
export async function pickCsvPath(title: string, fileName: string) {
  // A bare file name would start in the process's working directory, wherever that is.
  const defaultPath = await documentDir()
    .then((dir) => join(dir, fileName))
    .catch(() => fileName);
  const path = await save({ title, defaultPath, filters: [{ name: "CSV", extensions: ["csv"] }] });
  if (!path) return undefined;
  return path.toLowerCase().endsWith(".csv") ? path : `${path}.csv`;
}
