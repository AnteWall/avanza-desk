import { FolderMinus, FolderPlus, Plus } from "lucide-react";

import { useGroups } from "@/components/portfolio/holdings/use-groups";
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import { updateGroup } from "@/lib/groups";

/** Right-click items for selected holdings: add them to a group, or take them out of one. */
export function GroupMenuItems({ keys, onNewGroup }: { keys: string[]; onNewGroup: () => void }) {
  const groups = useGroups();
  // Every group holding any of the selection.
  const holding = groups.filter((g) => keys.some((k) => g.keys.includes(k)));
  const what = keys.length === 1 ? "" : ` ${keys.length} holdings`;
  return (
    <>
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <FolderPlus />
          Add{what} to group
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          {groups.map((g) => (
            <ContextMenuItem
              key={g.id}
              onClick={() =>
                updateGroup(g.id, (x) => ({ ...x, keys: [...new Set([...x.keys, ...keys])] }))
              }
            >
              <span className="truncate">{g.name}</span>
            </ContextMenuItem>
          ))}
          {groups.length > 0 && <ContextMenuSeparator />}
          <ContextMenuItem onClick={onNewGroup}>
            <Plus />
            New group…
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      {holding.length > 0 && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FolderMinus />
            Remove{what} from group
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {holding.map((g) => (
              <ContextMenuItem
                key={g.id}
                onClick={() =>
                  updateGroup(g.id, (x) => ({
                    ...x,
                    keys: x.keys.filter((k) => !keys.includes(k)),
                  }))
                }
              >
                <span className="truncate">{g.name}</span>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}
    </>
  );
}
