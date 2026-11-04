import { accountRoutes } from "./account";
import { marketRoutes } from "./market";
import { newsRoutes } from "./news";
import type { DemoRequest, Route } from "./route";

// A fake www.avanza.se: answers the SDK's requests (through the mocked `avanza_fetch`) from the
// demo universe. Each domain file exports its routes; the first match wins.

const routes: Route[] = [...accountRoutes, ...marketRoutes, ...newsRoutes];

export type DemoResponse = { status: number; body: unknown };

export function respond(req: DemoRequest): DemoResponse {
  for (const r of routes) {
    if (r.method !== req.method) continue;
    const match = req.path.match(r.path);
    if (match) return { status: 200, body: r.handle(req, match) };
  }
  // Logged so missing fixtures are easy to find; the panel asking for it shows its own error.
  console.warn(`[demo] no fixture for ${req.method} ${req.path}?${req.query}`);
  return { status: 404, body: { message: "No demo data" } };
}
