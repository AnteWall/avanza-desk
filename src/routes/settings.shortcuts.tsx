import { createFileRoute } from "@tanstack/react-router";

import { ShortcutSettings } from "@/components/settings/shortcut-settings";

export const Route = createFileRoute("/settings/shortcuts")({
  component: ShortcutSettings,
});
