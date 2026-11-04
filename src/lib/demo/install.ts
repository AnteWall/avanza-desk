import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";

import { commandResponse, demoSettings } from "./commands";
import { respond } from "./server";

// Demo mode (`pnpm demo`): runs the real app in a browser on made-up data. Every Tauri command is
// answered here, so there is no Rust backend, Avanza account or AI provider involved.

type FetchArgs = { url: string; method: string; headers: [string, string][]; body: string | null };

const JSON_HEADERS: [string, string][] = [["content-type", "application/json"]];

function avanzaFetch({ url, method, body }: FetchArgs) {
  const u = new URL(url);
  const res = respond({
    method,
    path: u.pathname,
    query: u.searchParams,
    body: body ? JSON.parse(body) : undefined,
  });
  return {
    status: res.status,
    statusText: res.status === 200 ? "OK" : "Not Found",
    headers: JSON_HEADERS,
    body: JSON.stringify(res.body),
  };
}

export function installDemo() {
  // The screenshot script picks theme and other settings per shot: ?demo={"theme":"light"}.
  const preset = new URLSearchParams(location.search).get("demo");
  for (const [key, value] of Object.entries(preset ? JSON.parse(preset) : {}))
    demoSettings.set(key, value);
  mockWindows("main");
  mockIPC(
    (cmd, args) => {
      if (cmd === "avanza_fetch") return avanzaFetch(args as FetchArgs);
      // Push streams open and stay quiet: prices stay as the fixtures left them.
      if (cmd === "avanza_stream") return { status: 200, statusText: "OK", headers: [], body: "" };
      return commandResponse(cmd, (args ?? {}) as Record<string, unknown>);
    },
    { shouldMockEvents: true },
  );
}
