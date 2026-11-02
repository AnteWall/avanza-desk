import { useState } from "react";

import { GroupMenuItems } from "@/components/portfolio/holdings/group-menu-items";
import { GroupNameDialog } from "@/components/portfolio/holdings/group-name-dialog";
import { createGroup, setGroupId } from "@/lib/groups";

/**
 * Group items for a table's right-click menu (add to / remove from a group, New group…) and the
 * dialog New group opens. Render `dialog` next to the table; pass `menu` the selected keys.
 * A new group gets the selection and becomes the picked group.
 */
export function useGroupMenu() {
  const [newGroupKeys, setNewGroupKeys] = useState<string[]>();
  return {
    menu: (keys: string[]) => (
      <GroupMenuItems keys={keys} onNewGroup={() => setNewGroupKeys(keys)} />
    ),
    dialog: (
      <GroupNameDialog
        open={Boolean(newGroupKeys)}
        title="New group"
        onSubmit={(name) => setGroupId(createGroup(name, newGroupKeys ?? []))}
        onClose={() => setNewGroupKeys(undefined)}
      />
    ),
  };
}
