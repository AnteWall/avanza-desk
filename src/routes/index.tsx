import { createFileRoute } from "@tanstack/react-router";

import { Workspace } from "@/components/workspace/workspace";

export const Route = createFileRoute("/")({
  // `ob`: focused orderbook id (router parses "5247" as a number, so coerce). `type`: Avanza's
  // instrument type code, so panels pick the right endpoints without probing.
  validateSearch: (search): { ob?: string; type?: string } => ({
    ...(search.ob ? { ob: String(search.ob) } : {}),
    ...(typeof search.type === "string" ? { type: search.type } : {}),
  }),
  component: Workspace,
});
