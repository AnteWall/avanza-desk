import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { m } from "@/lib/i18n";
import { installUpdate, updateQuery } from "@/lib/updater";

/**
 * Offers a newer release in a toast until installed. Failed checks, e.g. offline, stay silent;
 * Settings shows them. Off in dev, where no release matches. Renders nothing.
 */
export function Updater() {
  const { data: update } = useQuery({ ...updateQuery, enabled: !import.meta.env.DEV });
  useEffect(() => {
    if (!update) return;
    toast(m.layout.updates.available(update.version), {
      id: "update",
      duration: Infinity,
      action: { label: m.layout.updates.restart, onClick: () => void installUpdate(update) },
    });
  }, [update]);
  return null;
}
