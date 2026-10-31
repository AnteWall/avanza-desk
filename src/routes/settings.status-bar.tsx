import { createFileRoute } from "@tanstack/react-router";

import { StatusBarSettings } from "@/components/settings/status-bar-settings";

export const Route = createFileRoute("/settings/status-bar")({
  component: StatusBarSettings,
});
