import type { UIMessage } from "@tanstack/ai-react";
import { describe, expect, it } from "vitest";

import { chatMarkdown, chatTitle, groupChats, type ChatSummary } from "./history";

const user = (text: string) =>
  ({ id: text, role: "user", parts: [{ type: "text", content: text }] }) as UIMessage;

describe("chatTitle", () => {
  it("uses the first line of the first question", () => {
    expect(chatTitle([user("How is   my portfolio?\nmore detail")])).toBe("How is my portfolio?");
  });

  it("ignores the attached app context", () => {
    expect(
      chatTitle([
        user('<app_context>\n[{"kind":"page","label":"News"}]\n</app_context>\n\nWhat moved?'),
      ]),
    ).toBe("What moved?");
  });

  it("shortens long questions and falls back for empty chats", () => {
    expect(chatTitle([user("x".repeat(100))])).toHaveLength(60);
    expect(chatTitle([user("x".repeat(100))]).endsWith("…")).toBe(true);
    expect(chatTitle([])).toBe("New chat");
  });
});

describe("groupChats", () => {
  it("buckets newest-first chats by day", () => {
    const now = new Date(2026, 9, 30, 15).getTime();
    const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime();
    const chat = (id: string, updatedAt: number): ChatSummary => ({
      id,
      provider: "claude",
      model: null,
      title: id,
      updatedAt,
      pinned: id === "p",
    });
    const groups = groupChats(
      [
        chat("p", at(2024, 0, 1)),
        chat("a", at(2026, 9, 30, 9)),
        chat("b", at(2026, 9, 30, 1)),
        chat("c", at(2026, 9, 29)),
        chat("d", at(2026, 9, 25)),
        chat("e", at(2026, 9, 10)),
        chat("f", at(2025, 0, 1)),
      ],
      now,
    );
    expect(groups.map((g) => [g.label, g.chats.map((c) => c.id).join("")])).toEqual([
      ["Pinned", "p"],
      ["Today", "ab"],
      ["Yesterday", "c"],
      ["Previous 7 days", "d"],
      ["Previous 30 days", "e"],
      ["Older", "f"],
    ]);
  });
});

describe("chatMarkdown", () => {
  it("writes questions without context and answers without in-app links", () => {
    const answer = {
      id: "2",
      role: "assistant",
      parts: [{ type: "text", content: "[Volvo B](avanza:instrument/5269) rose." }],
    } as UIMessage;
    expect(
      chatMarkdown("Volvo", [
        user('<app_context>\n[{"kind":"page","label":"News"}]\n</app_context>\n\nWhy?'),
        answer,
      ]),
    ).toBe("# Volvo\n\n**You:** Why?\n\n---\n\nVolvo B rose.\n");
  });
});
