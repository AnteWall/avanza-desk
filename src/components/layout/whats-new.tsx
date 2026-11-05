import { useQuery } from "@tanstack/react-query";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";

import { ReleaseNotesDialog } from "@/components/common/release-notes-dialog";
import { releases, unseenReleases } from "@/lib/changelog";
import { m } from "@/lib/i18n";
import { getSetting, saveSetting, settingKeys } from "@/lib/settings";

const KEY = "whatsNew:lastSeen";

/** After an update, what changed since the version you last opened, once. Renders a dialog. */
export function WhatsNew() {
  const { data: version } = useQuery({
    queryKey: ["app", "version"],
    queryFn: getVersion,
    staleTime: Infinity,
  });
  // Saved settings at first render mean an existing install; a fresh one has none yet.
  const [upgraded] = useState(() => settingKeys().length > 0);
  const [closed, setClosed] = useState(false);
  const lastSeen = getSetting<string | null>(KEY, null);

  // Installs from before this dialog have no record: show them this version's notes only.
  const unseen = !version
    ? []
    : lastSeen
      ? unseenReleases(releases, version, lastSeen)
      : upgraded
        ? releases.filter((r) => r.version === version)
        : [];

  // Nothing to show (fresh install, or a version without notes): just remember it.
  useEffect(() => {
    if (version && version !== lastSeen && unseen.length === 0) void saveSetting(KEY, version);
  }, [version, lastSeen, unseen.length]);

  const close = () => {
    setClosed(true);
    if (version) void saveSetting(KEY, version);
  };

  return (
    <ReleaseNotesDialog
      open={unseen.length > 0 && !closed}
      onClose={close}
      releases={unseen}
      description={
        unseen.length > 1
          ? m.layout.whatsNew.since(unseen.length, lastSeen ?? "")
          : m.common.version(version ?? "")
      }
    />
  );
}
