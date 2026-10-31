import { createFileRoute } from "@tanstack/react-router";

import { AssistantSettings } from "@/components/settings/assistant-settings";

export const Route = createFileRoute("/settings/assistant")({
  component: AssistantSettings,
});
