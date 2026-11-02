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
          <span className="max-w-48 truncate font-medium">{selected?.name ?? "All holdings"}</span>
          <ChevronDown />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuRadioGroup
            value={selected?.id ?? all}
            onValueChange={(id: string) => setGroupId(id === all ? null : id)}
          >
            <DropdownMenuRadioItem value={all}>All holdings</DropdownMenuRadioItem>
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
                    aria-label={`${g.name} options`}
                    // Just the … icon: hide the submenu chevron.
                    className="text-muted-foreground [&>svg:last-child]:hidden"
                  >
                    <MoreHorizontal />
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setRenaming(g)}>
                      <Pencil />
                      Rename…
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleting(g)}>
                      <Trash2 />
                      Delete…
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </div>
            ))}
          </DropdownMenuRadioGroup>
          {groups.length === 0 && (
            <p className="text-muted-foreground px-1.5 py-1 text-xs">
              Right-click holdings to group them.
            </p>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreating(true)}>
            <Plus />
            New group…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {selected && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Show all holdings"
          title="Show all holdings"
          onClick={() => setGroupId(null)}
        >
          <X />
        </Button>
      )}
      <GroupNameDialog
        open={creating}
        title="New group"
        onSubmit={(name) => setGroupId(createGroup(name, []))}
        onClose={() => setCreating(false)}
      />
      <GroupNameDialog
        // Remount per group so the input starts from that group's name.
        key={renaming?.id}
        open={Boolean(renaming)}
        title="Rename group"
        initial={renaming?.name}
        onSubmit={(name) => renaming && updateGroup(renaming.id, (g) => ({ ...g, name }))}
        onClose={() => setRenaming(undefined)}
      />
      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(undefined)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
            <DialogDescription>
              The group goes away; its holdings and your accounts are untouched.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleting) return;
                deleteGroup(deleting.id);
                setDeleting(undefined);
              }}
            >
              Delete group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
