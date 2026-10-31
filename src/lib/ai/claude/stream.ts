import { EventType, type StreamChunk } from "@tanstack/ai";

import type { ChatStatus } from "../types";

// Maps the claude CLI's stream-json events (one JSON object per stdout line) to the AG-UI chunks
// TanStack AI's chat client consumes. Text comes from the partial `stream_event`s; tool calls
// and their results from the complete `assistant`/`user` messages. The tools run in the CLI (via
// our MCP server), so every call arrives with its result and the client never runs one.

type Block =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: unknown; is_error?: boolean }
  | { type: string };

export type ClaudeEvent =
  | { type: "system"; subtype: string; session_id?: string; model?: string }
  | {
      type: "stream_event";
      event: {
        type: string;
        message?: { id: string };
        content_block?: { type: string };
        delta?: { type: string; text?: string };
      };
    }
  | {
      type: "rate_limit_event";
      rate_limit_info: {
        status: string;
        rateLimitType?: string;
        resetsAt?: number;
        unifiedWindows?: Record<string, { utilization?: number }>;
      };
    }
  | { type: "assistant"; message: { id: string; content: Block[] } }
  | { type: "user"; message: { content: Block[] | string } }
  | { type: "result"; subtype: string; is_error?: boolean; result?: string; errors?: string[] }
  | { type: "exit"; stderr: string }
  | { type: string };

export type Run = { threadId: string; runId: string; messageId?: string };

// MCP tool names arrive as `mcp__avanza__get_holdings`; the UI shows the plain name.
const toolName = (name: string) => name.replace(/^mcp__avanza__/, "");

const resultText = (content: unknown) =>
  typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((c: { text?: string }) => c.text ?? "").join("")
      : JSON.stringify(content);

/** Chunks for one CLI event. `done` is true on the event that ends the run. */
export function toChunks(event: ClaudeEvent, run: Run): { chunks: StreamChunk[]; done: boolean } {
  const { threadId, runId } = run;
  const chunks: StreamChunk[] = [];
  let done = false;
  if (event.type === "stream_event" && "event" in event) {
    const e = event.event;
    if (e.type === "message_start" && e.message) {
      run.messageId = e.message.id;
      chunks.push({
        type: EventType.TEXT_MESSAGE_START,
        messageId: e.message.id,
        role: "assistant",
      });
    } else if (
      e.type === "content_block_delta" &&
      e.delta?.type === "text_delta" &&
      run.messageId
    ) {
      chunks.push({
        type: EventType.TEXT_MESSAGE_CONTENT,
        messageId: run.messageId,
        delta: e.delta.text ?? "",
      });
    } else if (e.type === "message_stop" && run.messageId) {
      chunks.push({ type: EventType.TEXT_MESSAGE_END, messageId: run.messageId });
    }
  } else if (event.type === "assistant" && "message" in event) {
    for (const block of event.message.content) {
      if (block.type !== "tool_use" || !("id" in block)) continue;
      chunks.push(
        {
          type: "TOOL_CALL_START",
          toolCallId: block.id,
          toolCallName: toolName(block.name),
          parentMessageId: event.message.id,
        },
        {
          type: EventType.TOOL_CALL_ARGS,
          toolCallId: block.id,
          delta: JSON.stringify(block.input),
        },
        { type: "TOOL_CALL_END", toolCallId: block.id, input: block.input },
      );
    }
  } else if (event.type === "user" && "message" in event && Array.isArray(event.message.content)) {
    for (const block of event.message.content) {
      if (block.type !== "tool_result" || !("tool_use_id" in block)) continue;
      chunks.push({
        type: EventType.TOOL_CALL_RESULT,
        messageId: `${block.tool_use_id}-result`,
        toolCallId: block.tool_use_id,
        content: resultText(block.content),
        role: "tool",
        // The processor reads this to mark the call failed.
        ...(block.is_error && { state: "output-error" }),
      } as StreamChunk);
    }
  } else if (event.type === "result" && "subtype" in event) {
    done = true;
    // An interrupt ends the turn with an error subtype; that's a normal stop, not a failure.
    chunks.push(
      event.is_error && event.subtype !== "error_during_execution"
        ? {
            type: EventType.RUN_ERROR,
            threadId,
            runId,
            message: event.errors?.join("\n") || event.result || event.subtype,
          }
        : { type: EventType.RUN_FINISHED, threadId, runId },
    );
  } else if (event.type === "exit" && "stderr" in event) {
    done = true;
    chunks.push({
      type: EventType.RUN_ERROR,
      threadId,
      runId,
      message: event.stderr.trim() || "Claude stopped unexpectedly.",
    });
  }
  return { chunks, done };
}

/** The status change one CLI event causes, if any. */
export function statusUpdate(event: ClaudeEvent): Partial<ChatStatus> | undefined {
  if (event.type === "system" && "model" in event && event.subtype === "init") {
    return { model: event.model };
  }
  if (event.type === "stream_event" && "event" in event) {
    const e = event.event;
    if (e.type === "message_start") return { phase: "thinking" };
    if (e.type === "content_block_start") {
      const block = e.content_block?.type;
      return { phase: block === "text" ? "writing" : block === "tool_use" ? "tool" : "thinking" };
    }
  }
  // A tool result is in: Claude reads it before the next message starts.
  if (event.type === "user") return { phase: "thinking" };
  if (event.type === "result" || event.type === "exit") return { phase: null };
  if (event.type === "rate_limit_event" && "rate_limit_info" in event) {
    const info = event.rate_limit_info;
    return {
      rateLimit: {
        status: info.status,
        window: info.rateLimitType,
        resetsAt: info.resetsAt,
        utilization: info.rateLimitType
          ? info.unifiedWindows?.[info.rateLimitType]?.utilization
          : undefined,
      },
    };
  }
  return undefined;
}
