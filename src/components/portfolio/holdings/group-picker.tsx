import { cn } from "cn";
import { ChevronDown, Folder, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import { GroupNameDialog } from "@/components/portfolio/holdings/group-name-dialog";
import { useGroup, useGroups } from "@/components/portfolio/holdings/use-groups";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createGroup, deleteGroup, setGroupId, updateGroup, type Group } from "@/lib/groups";
import { m } from "@/lib/i18n";

const all = "all";

/**
 * Narrows the portfolio page to one of your groups (made from a holding's right-click menu).
 * Each group's … button renames or deletes it.
 */
export function GroupPicker() {
  const groups = useGroups();
  const selected = useGroup();
  const [renaming, setRenaming] = useState<Group>();
  const [deleting, setDeleting] = useState<Group>();
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              // Active like the nav rail: a narrowed page should never pass for the whole one.
              className={cn(selected && "bg-accent text-brand border-brand/40")}
            />
          }
        >
          <Folder />
          <span className="max-w-48 truncate font-medium">
            {selected?.name ?? m.portfolio.groups.all}
          </span>
          <ChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuRadioGroup
            value={selected?.id ?? all}
            onValueChange={(id: string) => setGroupId(id === all ? null : id)}
          >
            <DropdownMenuRadioItem value={all}>{m.portfolio.groups.all}</DropdownMenuRadioItem>
            {groups.length > 0 && <DropdownMenuSeparator />}
            {groups.map((g) => (
              <div key={g.id} className="flex items-center">
                <DropdownMenuRadioItem value={g.id} className="min-w-0 flex-1">
                  <span className="flex-1 truncate">{g.name}</span>
                  <span className="num text-muted-foreground text-xs">{g.keys.length}</span>
                </DropdownMenuRadioItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger
                    openOnHover={false}
                    aria-label={m.portfolio.groups.options(g.name)}
                    // Just the … icon: hide the submenu chevron.
                    className="text-muted-foreground [&>svg:last-child]:hidden"
                  >
                    <MoreHorizontal />
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setRenaming(g)}>
                      <Pencil />
                      {m.portfolio.groups.rename}
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleting(g)}>
                      <Trash2 />
                      {m.portfolio.groups.delete}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </div>
            ))}
          </DropdownMenuRadioGroup>
          {groups.length === 0 && (
            <p className="text-muted-foreground px-1.5 py-1 text-xs">{m.portfolio.groups.hint}</p>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreating(true)}>
            <Plus />
            {m.portfolio.groups.newGroup}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {selected && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={m.portfolio.groups.showAll}
          title={m.portfolio.groups.showAll}
          onClick={() => setGroupId(null)}
        >
          <X />
        </Button>
      )}
      <GroupNameDialog
        open={creating}
        title={m.portfolio.groups.newTitle}
        onSubmit={(name) => setGroupId(createGroup(name, []))}
        onClose={() => setCreating(false)}
      />
      <GroupNameDialog
        // Remount per group so the input starts from that group's name.
        key={renaming?.id}
        open={Boolean(renaming)}
        title={m.portfolio.groups.renameTitle}
        initial={renaming?.name}
        onSubmit={(name) => renaming && updateGroup(renaming.id, (g) => ({ ...g, name }))}
        onClose={() => setRenaming(undefined)}
      />
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(undefined)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{m.portfolio.groups.deleteTitle(deleting?.name ?? "")}</DialogTitle>
            <DialogDescription>{m.portfolio.groups.deleteDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(undefined)}>
              {m.common.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleting) return;
                deleteGroup(deleting.id);
                setDeleting(undefined);
              }}
            >
              {m.portfolio.groups.deleteConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
