// Answers for the app's own Tauri commands (src-tauri) in demo mode. Settings live in memory, so
// a demo run starts the same every time.

import { chatCommand } from "./chat";
import { snapshotCommand } from "./snapshots";

const DEMO_SESSION = { mode: "bankid", cookies: [{ key: "demo", value: "1" }] };

/** Settings the demo starts with, as the app saves them (JSON values by key). Others take defaults. */
export const demoSettings = new Map<string, unknown>();

/** `undefined` from a domain handler means "not mine"; the switch below answers the rest. */
export function commandResponse(cmd: string, args: Record<string, unknown>): unknown {
  for (const handler of [chatCommand, snapshotCommand]) {
    const answer = handler(cmd, args);
    if (answer !== undefined) return answer;
  }
  switch (cmd) {
    case "settings_load":
      return [...demoSettings].map(([key, value]) => [key, JSON.stringify(value)]);
    case "setting_save":
      demoSettings.set(args.key as string, JSON.parse(args.value as string));
      return null;
    case "session_load":
      return JSON.stringify(DEMO_SESSION);
    case "plugin:app|version":
      return "0.0.0-demo";
    case "plugin:app|name":
      return "AvanzaDesk";
    case "plugin:updater|check":
      return null;
    case "plugin:notification|is_permission_granted":
      return true;
    default:
      // session_save, snapshot_save, mcp_register… have nothing to answer.
      return null;
  }
}
