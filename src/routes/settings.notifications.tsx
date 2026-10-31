import { createFileRoute } from "@tanstack/react-router";

import { NotificationSettings } from "@/components/settings/notification-settings";

export const Route = createFileRoute("/settings/notifications")({
  component: NotificationSettings,
});
