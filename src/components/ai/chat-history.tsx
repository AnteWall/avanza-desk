import { useQuery, useQueryClient } from "@tanstack/react-query";
import { save } from "@tauri-apps/plugin-dialog";
import { cn } from "cn";
import { Download, MoreHorizontal, Pencil, Pin, PinOff, Search, Trash2 } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { Empty } from "@/components/common/empty";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  chatMarkdown,
  chatsKey,
  chatsQuery,
  type ChatSummary,
  deleteChat,
  exportChat,
  groupChats,
  loadChat,
  pinChat,
  renameChat,
} from "@/lib/ai/history";
import { formatDate, formatTime } from "@/lib/format";
import { m } from "@/lib/i18n";

/** Today's chats show the time, older ones the date. */
const when = (t: number) => (t >= new Date().setHours(0, 0, 0, 0) ? formatTime(t) : formatDate(t));

/** A file name from a chat title: "How is my portfolio?" → "How is my portfolio.md". */
const fileName = (title: string) =>
  `${
    title
      .replace(/[\\/:*?"<>|]+/g, "")
      .trim()
      .slice(0, 80) || m.ai.history.fileName
  }.md`;

/**
 * Earlier conversations: pinned first, then newest, grouped by day. The search covers titles
 * and everything said. Each chat can be renamed, pinned, exported as Markdown or deleted.
 */
export function ChatHistory({
  currentId,
  onOpen,
  onRenamed,
  onDeleted,
}: {
  currentId: string;
  onOpen: (id: string) => void;
  onRenamed: (id: string, title: string) => void;
  onDeleted: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const query = useDeferredValue(filter.trim());
  const { data: chats, isPending } = useQuery({
    ...chatsQuery(query),
    placeholderData: (previous) => previous,
  });
  const [renaming, setRenaming] = useState<string>();
  const groups = useMemo(() => groupChats(chats ?? []), [chats]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: chatsKey });
  const remove = async (id: string) => {
    await deleteChat(id);
    await refresh();
    onDeleted(id);
  };
  const rename = async (chat: ChatSummary, title: string) => {
    setRenaming(undefined);
    if (!title.trim() || title.trim() === chat.title) return;
    await renameChat(chat.id, title);
    await refresh();
    onRenamed(chat.id, title.trim());
  };
  const exportAs = async (chat: ChatSummary) => {
    const path = await save({
      title: m.ai.history.exportTitle,
      defaultPath: fileName(chat.title),
      filters: [{ name: "Markdown", extensions: ["md"] }],
    });
    const saved = path && (await loadChat(chat.id));
    if (!path || !saved) return;
    await exportChat(
      path.endsWith(".md") ? path : `${path}.md`,
      chatMarkdown(chat.title, saved.messages),
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="relative border-b p-2">
        <Search
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-4.5 size-3.5 -translate-y-1/2"
          aria-hidden
        />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setFilter("")}
          placeholder={m.ai.history.search}
          aria-label={m.ai.history.searchLabel}
          autoFocus
          className="h-7 pl-7"
        />
      </div>
      <div className="mx-auto min-h-0 w-full max-w-3xl flex-1 overflow-y-auto py-1">
        {!isPending && chats?.length === 0 && (
          <Empty>{query ? m.ai.history.noMatches : m.ai.history.empty}</Empty>
        )}
        {groups.map((group) => (
          <section key={group.label} className="pb-1">
            <h3 className="text-muted-foreground flex items-center gap-1 px-3 pt-2 pb-1 text-xs font-medium">
              {group.chats[0]?.pinned && <Pin className="size-3" aria-hidden />}
              {group.label}
            </h3>
            <ul>
              {group.chats.map((chat) => (
                <li key={chat.id} className="group/row relative">
                  {renaming === chat.id ? (
                    <div className="px-2 py-0.5">
                      <Input
                        autoFocus
                        defaultValue={chat.title}
                        aria-label={m.ai.history.titleLabel}
                        maxLength={200}
                        className="h-7"
                        onFocus={(e) => e.currentTarget.select()}
                        onBlur={(e) => void rename(chat, e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void rename(chat, e.currentTarget.value);
                          if (e.key === "Escape") setRenaming(undefined);
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onOpen(chat.id)}
                      onDoubleClick={() => setRenaming(chat.id)}
                      aria-current={chat.id === currentId || undefined}
                      className={cn(
                        "hover:bg-muted/60 focus-visible:ring-ring/50 flex w-full items-center gap-3 py-1.5 pr-9 pl-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-inset",
                        chat.id === currentId && "bg-accent shadow-[inset_2px_0_0_var(--brand)]",
                      )}
                    >
                      <span className="flex-1 truncate">{chat.title}</span>
                      <span className="text-muted-foreground num shrink-0 text-xs group-focus-within/row:invisible group-hover/row:invisible">
                        {when(chat.updatedAt)}
                      </span>
                    </button>
                  )}
                  {renaming !== chat.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            aria-label={m.ai.history.actions(chat.title)}
                            className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setRenaming(chat.id)}>
                          <Pencil />
                          {m.ai.history.rename}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => void pinChat(chat.id, !chat.pinned).then(refresh)}
                        >
                          {chat.pinned ? <PinOff /> : <Pin />}
                          {chat.pinned ? m.ai.history.unpin : m.ai.history.pin}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void exportAs(chat)}>
                          <Download />
                          {m.ai.history.export}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => void remove(chat.id)}
                        >
                          <Trash2 />
                          {m.common.delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
