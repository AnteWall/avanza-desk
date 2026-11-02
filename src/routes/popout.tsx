import { createFileRoute } from "@tanstack/react-router";

import { PopoutPage } from "@/components/workspace/popout/popout-page";

// A pinned instrument in its own window (chart and order book), opened with `openPopout`.
export const Route = createFileRoute("/popout")({
  validateSearch: (search): { ob?: string; type?: string } => ({
    ...(search.ob ? { ob: String(search.ob) } : {}),
    ...(typeof search.type === "string" ? { type: search.type } : {}),
  }),
  component: PopoutPage,
});
