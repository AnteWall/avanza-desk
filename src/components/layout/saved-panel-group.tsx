import type { ComponentProps } from "react";
import { useDefaultLayout, type LayoutStorage } from "react-resizable-panels";

import { ResizablePanelGroup } from "@/components/ui/resizable";
import { getSetting, saveSetting } from "@/lib/settings";

// Layouts live in the settings database next to the other preferences.
const storage: LayoutStorage = {
  getItem: (key) => getSetting<string | null>(`layout:${key}`, null),
  setItem: (key, value) => void saveSetting(`layout:${key}`, value),
};

/**
 * A resizable group that remembers its sizes across restarts. `id` must be unique app-wide and
 * every child panel needs a stable `id`, so a saved layout maps back onto the right panels.
 * Pass `panelIds` when panels render conditionally, so each set keeps its own layout.
 */
export function SavedPanelGroup({
  id,
  panelIds,
  ...props
}: ComponentProps<typeof ResizablePanelGroup> & { id: string; panelIds?: string[] }) {
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id,
    storage,
    panelIds,
    onlySaveAfterUserInteractions: true,
  });
  return (
    <ResizablePanelGroup
      id={id}
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      {...props}
    />
  );
}
