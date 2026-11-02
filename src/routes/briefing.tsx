import { createFileRoute } from "@tanstack/react-router";

import { BriefingPage } from "@/components/briefing/briefing-page";

export const Route = createFileRoute("/briefing")({
  component: BriefingPage,
});
