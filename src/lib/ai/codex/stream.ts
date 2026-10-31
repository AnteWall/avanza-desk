import { EventType, type StreamChunk } from "@tanstack/ai";

import type { ChatStatus, RateLimit } from "../types";

// Maps `codex app-server` notifications (one JSON-RPC message per line, forwarded by
// src-tauri/src/ai/codex.rs) to the AG-UI chunks TanStack AI's chat client consumes. Each
// agent message is its own assistant message; MCP tool calls arrive started and completed, and
// run in Codex (via our MCP server), so the client never runs one.

type McpToolCall = {
  type: "mcpToolCall";
  id: string;
  server: string;
  tool: string;
  status: "inProgress" | "completed" | "failed";
  arguments: unknown;
  result: { content: { type: string; text?: string }[] } | null;
  error: { message: string } | null;
};

type Item = { type: "agentMessage"; id: string } | { type: "reasoning"; id: string } | McpToolCall;

type Window = { usedPercent: number; windowDurationMins: number | null; resetsAt: number | null };

export type CodexEvent =
  | { method: "turn/started" }
  | { method: "item/started"; params: { item: Item | { type: string } } }
  | { method: "item/completed"; params: { item: Item | { type: string } } }
  | { method: "item/agentMessage/delta"; params: { itemId: string; delta: string } }
  | {
      method: "turn/completed";
      params: { turn: { status: string; error: { message: string } | null } };
    }
  | { method: "error"; params: { error: { message: string }; willRetry: boolean } }
  | { method: "thread/status/changed"; params: { status: { type: string } } }
  | {
      method: "account/rateLimits/updated";
      params: {
        rateLimits: {
          primary: Window | null;
          secondary: Window | null;
          rateLimitReachedType: string | null;
        };
      };
    }
  | { method: "exit"; params: { stderr: string } }
  | { method: string; params?: unknown };

export type Run = { threadId: string; runId: string };

const is = <M extends CodexEvent["method"]>(
  event: CodexEvent,
  method: M,
): event is Extract<CodexEvent, { method: M }> => event.method === method;

const resultText = (call: McpToolCall) =>
  call.error?.message ?? call.result?.content.map((c) => c.text ?? "").join("") ?? "";

/** Chunks for one notification. `done` is true on the one that ends the run. */
export function toChunks(event: CodexEvent, run: Run): { chunks: StreamChunk[]; done: boolean } {
  const { threadId, runId } = run;
  const chunks: StreamChunk[] = [];
  let done = false;
  if (is(event, "item/started") || is(event, "item/completed")) {
    const item = event.params.item;
    const started = event.method === "item/started";
    if (item.type === "agentMessage" && "id" in item) {
      chunks.push(
        started
          ? { type: EventType.TEXT_MESSAGE_START, messageId: item.id, role: "assistant" }
          : { type: EventType.TEXT_MESSAGE_END, messageId: item.id },
      );
    } else if (item.type === "mcpToolCall") {
      const call = item as McpToolCall;
      if (started) {
        chunks.push(
          { type: "TOOL_CALL_START", toolCallId: call.id, toolCallName: call.tool },
          {
            type: EventType.TOOL_CALL_ARGS,
            toolCallId: call.id,
            delta: JSON.stringify(call.arguments),
          },
          { type: "TOOL_CALL_END", toolCallId: call.id, input: call.arguments },
        );
      } else {
        chunks.push({
          type: EventType.TOOL_CALL_RESULT,
          messageId: `${call.id}-result`,
          toolCallId: call.id,
          content: resultText(call),
          role: "tool",
          // The processor reads this to mark the call failed.
          ...(call.status === "failed" && { state: "output-error" }),
        } as StreamChunk);
      }
    }
  } else if (is(event, "item/agentMessage/delta")) {
    chunks.push({
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId: event.params.itemId,
      delta: event.params.delta,
    });
  } else if (is(event, "turn/completed")) {
    done = true;
    const { status, error } = event.params.turn;
    // An interrupt is a normal stop, not a failure.
    chunks.push(
      status === "failed"
        ? { type: EventType.RUN_ERROR, threadId, runId, message: error?.message ?? "Codex failed." }
        : { type: EventType.RUN_FINISHED, threadId, runId },
    );
  } else if (is(event, "thread/status/changed") && event.params.status.type === "systemError") {
    // Codex gave up on the turn without a turn/completed (seen with an outdated CLI).
    done = true;
    chunks.push({ type: EventType.RUN_ERROR, threadId, runId, message: "Codex hit an error." });
  } else if (is(event, "exit")) {
    done = true;
    chunks.push({
      type: EventType.RUN_ERROR,
      threadId,
      runId,
      message: event.params.stderr.trim() || "Codex stopped unexpectedly.",
    });
  }
  return { chunks, done };
}

// Codex names windows by length; the usage notice knows Claude's names for the same ones.
const windowNames: Record<number, string> = { 300: "five_hour", 10_080: "seven_day" };

/** The fullest of the current windows, in the shape the usage notice reads. */
export function rateLimit(limits: {
  primary: Window | null;
  secondary: Window | null;
  rateLimitReachedType: string | null;
}): RateLimit | undefined {
  const fullest = [limits.primary, limits.secondary]
    .filter((w): w is Window => !!w)
    .sort((a, b) => b.usedPercent - a.usedPercent)[0];
  if (!fullest) return undefined;
  return {
    status: limits.rateLimitReachedType ? "rejected" : "allowed",
    window: fullest.windowDurationMins ? windowNames[fullest.windowDurationMins] : undefined,
    resetsAt: fullest.resetsAt ?? undefined,
    utilization: fullest.usedPercent / 100,
  };
}

/** The status change one notification causes, if any. */
export function statusUpdate(event: CodexEvent): Partial<ChatStatus> | undefined {
  if (is(event, "turn/started")) return { phase: "thinking" };
  if (is(event, "item/started")) {
    const type = event.params.item.type;
    if (type === "agentMessage") return { phase: "writing" };
    if (type === "mcpToolCall") return { phase: "tool" };
    if (type === "reasoning") return { phase: "thinking" };
  }
  // A tool result is in: Codex reads it before writing on.
  if (is(event, "item/completed") && event.params.item.type === "mcpToolCall") {
    return { phase: "thinking" };
  }
  if (is(event, "turn/completed") || is(event, "exit")) return { phase: null };
  if (is(event, "thread/status/changed") && event.params.status.type === "systemError") {
    return { phase: null };
  }
  if (is(event, "account/rateLimits/updated")) {
    const limit = rateLimit(event.params.rateLimits);
    return limit && { rateLimit: limit };
  }
  return undefined;
}
