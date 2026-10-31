import { useQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import type { Update } from "@tauri-apps/plugin-updater";
import { useState } from "react";

import { SettingsRow } from "@/components/settings/settings-row";
import { Button } from "@/components/ui/button";
import { installUpdate, updateQuery } from "@/lib/updater";

function updateHint(checking: boolean, error: Error | null, update: Update | null | undefined) {
  if (checking) return "Checking for updates…";
  if (error) return `Couldn't check for updates: ${String(error)}`;
  if (update) return `v${update.version} is available`;
  return "You're on the latest version";
}

/** Current version, the latest check's result, and a button to check again or install. */
export function UpdateRow() {
  const { data: version } = useQuery({
    queryKey: ["app", "version"],
    queryFn: getVersion,
    staleTime: Infinity,
  });
  const { data: update, error, isFetching, refetch } = useQuery(updateQuery);
  const [installing, setInstalling] = useState(false);

  return (
    <SettingsRow
      label={`AvanzaDesk v${version ?? ""}`}
      hint={updateHint(isFetching, error, update)}
    >
      {update ? (
        <Button
          size="sm"
          disabled={installing}
          onClick={() => {
            setInstalling(true);
            void installUpdate(update).finally(() => setInstalling(false));
          }}
        >
          {installing ? "Updating…" : "Update and restart"}
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
          Check for updates
        </Button>
      )}
    </SettingsRow>
  );
}
