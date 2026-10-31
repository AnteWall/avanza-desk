import { createFileRoute } from "@tanstack/react-router";

import { MarketsPage } from "@/components/markets/markets-page";

export const Route = createFileRoute("/markets")({
  component: MarketsPage,
});
