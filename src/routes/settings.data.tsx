import { createFileRoute } from "@tanstack/react-router";

import { DataSettings } from "@/components/settings/data-settings";

export const Route = createFileRoute("/settings/data")({
  component: DataSettings,
});
