import type { ModelMessage } from "@tanstack/ai";
import type { UIMessage } from "@tanstack/ai-react";

import { splitContext } from "./context";

// The chat's messages as what a provider is sent: the last question as content blocks, and the
// earlier conversation as text for when a provider lost its own copy.

/** A message as content blocks (Anthropic's shape); each provider's backend converts them. */
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

export type AnyMessage = UIMessage | ModelMessage;

const textOf = (m: AnyMessage) =>
  "parts" in m
    ? m.parts.map((p) => (p.type === "text" ? p.content : "")).join("")
    : typeof m.content === "string"
      ? m.content
      : "";

/** The last user message as content blocks: its text, then any pasted images. */
export function lastUserContent(messages: readonly AnyMessage[]) {
  const last = [...messages].reverse().find((m) => m.role === "user");
  if (!last) return { id: undefined, blocks: [] as ContentBlock[] };
  const blocks: ContentBlock[] = [{ type: "text", text: textOf(last) }];
  if ("parts" in last) {
    for (const part of last.parts) {
      if (part.type === "image" && part.source.type === "data") {
        blocks.push({
          type: "image",
          source: { type: "base64", media_type: part.source.mimeType, data: part.source.value },
        });
      }
    }
  }
  return { id: "id" in last ? last.id : undefined, blocks };
}

const TRANSCRIPT_CHARS = 30_000;

/**
 * The conversation before the last message, as plain text, for when the provider lost its
 * own copy. Keeps the most recent turns that fit; context blocks and images are left out.
 */
export function transcript(messages: readonly AnyMessage[]) {
  const earlier = messages.slice(0, messages.map((m) => m.role).lastIndexOf("user"));
  const lines = earlier.map(
    (m) =>
      `${m.role === "user" ? "User" : "Assistant"}: ${splitContext(textOf(m)).question.trim()}`,
  );
  let text = "";
  for (const line of lines.reverse()) {
    if (text.length + line.length > TRANSCRIPT_CHARS) break;
    text = `${line}\n\n${text}`;
  }
  return text.trim();
}

/** Puts `note` before the message's text. */
export const prefix = (blocks: ContentBlock[], note: string): ContentBlock[] =>
  blocks.map((b, i) => (i === 0 && b.type === "text" ? { ...b, text: `${note}\n\n${b.text}` } : b));

/**
 * `blocks` with the conversation before them as text in front, for a provider that doesn't hold
 * it: another provider answered so far, or its saved session is gone. Unchanged without one.
 */
export function withHistory(blocks: ContentBlock[], messages: readonly AnyMessage[]) {
  const earlier = transcript(messages);
  return earlier
    ? prefix(
        blocks,
        `(Our earlier conversation, restored from saved history:)\n\n${earlier}\n\n(My new message:)`,
      )
    : blocks;
}
