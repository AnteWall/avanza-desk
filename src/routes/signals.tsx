import { createFileRoute } from "@tanstack/react-router";

import { SignalsPage } from "@/components/signals/signals-page";

export const Route = createFileRoute("/signals")({
  component: SignalsPage,
});
