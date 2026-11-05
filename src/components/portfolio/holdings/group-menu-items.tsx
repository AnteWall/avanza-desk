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
import { m } from "@/lib/i18n";

/** Right-click items for selected holdings: add them to a group, or take them out of one. */
export function GroupMenuItems({ keys, onNewGroup }: { keys: string[]; onNewGroup: () => void }) {
  const groups = useGroups();
  // Every group holding any of the selection.
  const holding = groups.filter((g) => keys.some((k) => g.keys.includes(k)));
  return (
    <>
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <FolderPlus />
          {m.portfolio.groups.addTo(keys.length)}
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
            {m.portfolio.groups.newGroup}
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      {holding.length > 0 && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <FolderMinus />
            {m.portfolio.groups.removeFrom(keys.length)}
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
