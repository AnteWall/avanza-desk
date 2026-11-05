import { useQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import type { Update } from "@tauri-apps/plugin-updater";
import { useState } from "react";

import { SettingsRow } from "@/components/settings/settings-row";
import { Button } from "@/components/ui/button";
import { m } from "@/lib/i18n";
import { installUpdate, updateQuery } from "@/lib/updater";

function updateHint(checking: boolean, error: Error | null, update: Update | null | undefined) {
  if (checking) return m.settings.update.checking;
  if (error) return m.settings.update.failed(String(error));
  if (update) return m.settings.update.available(update.version);
  return m.settings.update.latest;
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
          {installing ? m.settings.update.installing : m.settings.update.install}
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled={isFetching} onClick={() => void refetch()}>
          {m.settings.update.check}
        </Button>
      )}
    </SettingsRow>
  );
}
