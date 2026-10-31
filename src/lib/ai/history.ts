import type { UIMessage } from "@tanstack/ai-react";
import { queryOptions } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

import { splitContext } from "./context";

// Saved assistant conversations (src-tauri/src/ai/history.rs).

export type ChatSummary = {
  id: string;
  provider: string;
  model: string | null;
  title: string;
  /** Milliseconds since the epoch. */
  updatedAt: number;
  pinned: boolean;
};

export type SavedChat = {
  id: string;
  provider: string;
  sessionId: string | null;
  model: string | null;
  title: string;
  messages: UIMessage[];
};

/** Every chat's list key starts with this, for invalidating after a change. */
export const chatsKey = ["ai", "chats"];

/** Saved chats, pinned first; `query` searches titles and message text. */
export const chatsQuery = (query = "") =>
  queryOptions({
    queryKey: [...chatsKey, query],
    queryFn: () => invoke<ChatSummary[]>("chats_list", { query: query || null }),
  });

export async function loadChat(id: string): Promise<SavedChat | null> {
  const row = await invoke<(Omit<SavedChat, "messages"> & { messages: string }) | null>(
    "chat_load",
    { id },
  );
  return row && { ...row, messages: JSON.parse(row.messages) as UIMessage[] };
}

export const saveChat = (chat: SavedChat) =>
  invoke("chat_save", { chat: { ...chat, messages: JSON.stringify(chat.messages) } });

export const deleteChat = (id: string) => invoke("chat_delete", { id });
export const renameChat = (id: string, title: string) => invoke("chat_rename", { id, title });
export const pinChat = (id: string, pinned: boolean) => invoke("chat_pin", { id, pinned });
export const exportChat = (path: string, markdown: string) =>
  invoke("chat_export", { path, markdown });

/**
 * A chat as a Markdown document: the questions (without their app context) and answers. In-app
 * links become plain names, since they mean nothing outside the app.
 */
export function chatMarkdown(title: string, messages: readonly UIMessage[]) {
  const text = (m: UIMessage) =>
    m.parts.map((p) => (p.type === "text" ? p.content : "")).join("\n\n");
  const turns = messages.map((m) =>
    m.role === "user"
      ? `**You:** ${splitContext(text(m)).question.trim()}`
      : text(m)
          .trim()
          .replace(/\[([^\]]+)\]\(avanza:[^)]*\)/g, "$1"),
  );
  return `# ${title}\n\n${turns.filter(Boolean).join("\n\n---\n\n")}\n`;
}

const TITLE_LENGTH = 60;

/** A chat's title: the first line of its first question, shortened. */
export function chatTitle(messages: readonly UIMessage[]) {
  const first = messages.find((m) => m.role === "user");
  const text = first?.parts.map((p) => (p.type === "text" ? p.content : "")).join(" ") ?? "";
  const line = splitContext(text).question.trim().split("\n")[0].replace(/\s+/g, " ");
  if (!line) return "New chat";
  return line.length > TITLE_LENGTH ? `${line.slice(0, TITLE_LENGTH - 1).trimEnd()}…` : line;
}

const DAY = 86_400_000;

/**
 * Chats grouped for the history list: Pinned, then Today, Yesterday, Previous 7 days,
 * Previous 30 days, Older.
 */
export function groupChats(chats: readonly ChatSummary[], now = Date.now()) {
  const midnight = new Date(now).setHours(0, 0, 0, 0);
  const bucket = (t: number) =>
    t >= midnight
      ? "Today"
      : t >= midnight - DAY
        ? "Yesterday"
        : t >= midnight - 7 * DAY
          ? "Previous 7 days"
          : t >= midnight - 30 * DAY
            ? "Previous 30 days"
            : "Older";
  const groups: { label: string; chats: ChatSummary[] }[] = [];
  for (const chat of chats) {
    const label = chat.pinned ? "Pinned" : bucket(chat.updatedAt);
    const group = groups.at(-1);
    if (group?.label === label) group.chats.push(chat);
    else groups.push({ label, chats: [chat] });
  }
  return groups;
}
