import { describe, expect, it } from "vitest";

import { type ClaudeEvent, type Run, statusUpdate, toChunks } from "./stream";

// Shapes as the claude CLI prints them with --output-format stream-json --include-partial-messages.
const events: ClaudeEvent[] = [
  { type: "system", subtype: "init", session_id: "s1" },
  { type: "stream_event", event: { type: "message_start", message: { id: "m1" } } },
  {
    type: "stream_event",
    event: { type: "content_block_delta", delta: { type: "text_delta", text: "Checking" } },
  },
  {
    type: "stream_event",
    event: { type: "content_block_delta", delta: { type: "thinking_delta" } },
  },
  {
    type: "assistant",
    message: {
      id: "m1",
      content: [
        { type: "text", text: "Checking" },
        { type: "tool_use", id: "t1", name: "mcp__avanza__get_holdings", input: {} },
      ],
    },
  },
  { type: "stream_event", event: { type: "message_stop" } },
  {
    type: "user",
    message: {
      content: [
        { type: "tool_result", tool_use_id: "t1", content: [{ type: "text", text: "[]" }] },
      ],
    },
  },
  { type: "result", subtype: "success", is_error: false, result: "Checking" },
];

const types = (run: Run, list: ClaudeEvent[]) =>
  list.flatMap((e) => toChunks(e, run).chunks.map((c) => c.type));

describe("toChunks", () => {
  it("maps a turn with a tool call", () => {
    expect(types({ threadId: "th", runId: "r" }, events)).toEqual([
      "TEXT_MESSAGE_START",
      "TEXT_MESSAGE_CONTENT",
      "TOOL_CALL_START",
      "TOOL_CALL_ARGS",
      "TOOL_CALL_END",
      "TEXT_MESSAGE_END",
      "TOOL_CALL_RESULT",
      "RUN_FINISHED",
    ]);
  });

  it("strips the MCP prefix and joins result text", () => {
    const run = { threadId: "th", runId: "r" };
    const [start] = toChunks(events[4], run).chunks;
    expect(start).toMatchObject({ toolCallName: "get_holdings", parentMessageId: "m1" });
    const [result] = toChunks(events[6], run).chunks;
    expect(result).toMatchObject({ toolCallId: "t1", content: "[]" });
  });

  it("ends the run on result and exit", () => {
    const run = { threadId: "th", runId: "r" };
    expect(toChunks(events[7], run).done).toBe(true);
    expect(toChunks({ type: "exit", stderr: "boom\n" }, run)).toEqual({
      done: true,
      chunks: [{ type: "RUN_ERROR", threadId: "th", runId: "r", message: "boom" }],
    });
  });

  it("treats an interrupted turn as finished, other errors as errors", () => {
    const run = { threadId: "th", runId: "r" };
    const stopped = { type: "result", subtype: "error_during_execution", is_error: true };
    expect(toChunks(stopped, run).chunks[0].type).toBe("RUN_FINISHED");
    const failed = { type: "result", subtype: "error_max_turns", is_error: true };
    expect(toChunks(failed, run).chunks[0]).toMatchObject({
      type: "RUN_ERROR",
      message: "error_max_turns",
    });
  });
});

describe("statusUpdate", () => {
  it("follows what Claude is doing", () => {
    const block = (type: string): ClaudeEvent => ({
      type: "stream_event",
      event: { type: "content_block_start", content_block: { type } },
    });
    expect(statusUpdate(block("thinking"))).toEqual({ phase: "thinking" });
    expect(statusUpdate(block("text"))).toEqual({ phase: "writing" });
    expect(statusUpdate(block("tool_use"))).toEqual({ phase: "tool" });
    expect(statusUpdate(events[6])).toEqual({ phase: "thinking" });
    expect(statusUpdate(events[7])).toEqual({ phase: null });
  });

  it("reads the model and the closest rate limit", () => {
    expect(statusUpdate({ type: "system", subtype: "init", model: "claude-opus-5-5" })).toEqual({
      model: "claude-opus-5-5",
    });
    expect(
      statusUpdate({
        type: "rate_limit_event",
        rate_limit_info: {
          status: "allowed",
          rateLimitType: "five_hour",
          resetsAt: 1793398200,
          unifiedWindows: { five_hour: { utilization: 0.85 }, seven_day: { utilization: 0.2 } },
        },
      }),
    ).toEqual({
      rateLimit: {
        status: "allowed",
        window: "five_hour",
        resetsAt: 1793398200,
        utilization: 0.85,
      },
    });
  });
});

describe("toChunks errors", () => {
  it("marks a failed tool result", () => {
    const failed: ClaudeEvent = {
      type: "user",
      message: {
        content: [{ type: "tool_result", tool_use_id: "t1", content: "boom", is_error: true }],
      },
    };
    expect(toChunks(failed, { threadId: "th", runId: "r" }).chunks[0]).toMatchObject({
      state: "output-error",
    });
  });
});
