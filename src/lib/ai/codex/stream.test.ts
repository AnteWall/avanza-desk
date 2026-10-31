import { describe, expect, it } from "vitest";

import { type CodexEvent, rateLimit, statusUpdate, toChunks } from "./stream";

const run = { threadId: "t", runId: "r" };

// Shapes as `codex app-server` 0.165 sends them for a turn with one MCP tool call.
const call = {
  type: "mcpToolCall",
  id: "c1",
  server: "avanza",
  tool: "get_holdings",
  status: "inProgress",
  arguments: { accountId: "1" },
  result: null,
  error: null,
};
const turn: CodexEvent[] = [
  { method: "turn/started", params: {} },
  { method: "item/started", params: { item: { type: "reasoning", id: "rs1" } } },
  { method: "item/started", params: { item: { type: "agentMessage", id: "m1" } } },
  { method: "item/agentMessage/delta", params: { itemId: "m1", delta: "Checking" } },
  { method: "item/completed", params: { item: { type: "agentMessage", id: "m1" } } },
  { method: "item/started", params: { item: call } },
  {
    method: "item/completed",
    params: {
      item: { ...call, status: "completed", result: { content: [{ type: "text", text: "[]" }] } },
    },
  },
  {
    method: "turn/completed",
    params: { turn: { status: "completed", error: null } },
  },
];

describe("toChunks", () => {
  it("streams messages and tool calls, and ends on turn/completed", () => {
    const all = turn.map((e) => toChunks(e, run));
    expect(all.flatMap((r) => r.chunks.map((c) => c.type))).toEqual([
      "TEXT_MESSAGE_START",
      "TEXT_MESSAGE_CONTENT",
      "TEXT_MESSAGE_END",
      "TOOL_CALL_START",
      "TOOL_CALL_ARGS",
      "TOOL_CALL_END",
      "TOOL_CALL_RESULT",
      "RUN_FINISHED",
    ]);
    expect(all.map((r) => r.done)).toEqual([...Array(7).fill(false), true]);
    expect(all[6]!.chunks[0]).toMatchObject({ toolCallId: "c1", content: "[]" });
  });

  it("marks a failed tool call and reports a failed turn", () => {
    const failed = toChunks(
      {
        method: "item/completed",
        params: { item: { ...call, status: "failed", error: { message: "timeout" } } },
      },
      run,
    );
    expect(failed.chunks[0]).toMatchObject({ content: "timeout", state: "output-error" });
    const turnFailed = toChunks(
      {
        method: "turn/completed",
        params: { turn: { status: "failed", error: { message: "No" } } },
      },
      run,
    );
    expect(turnFailed).toEqual({
      chunks: [{ type: "RUN_ERROR", threadId: "t", runId: "r", message: "No" }],
      done: true,
    });
  });

  it("treats an interrupt as a normal stop", () => {
    const stopped = toChunks(
      { method: "turn/completed", params: { turn: { status: "interrupted", error: null } } },
      run,
    );
    expect(stopped.chunks[0]?.type).toBe("RUN_FINISHED");
  });

  it("ends the run when Codex gives up or exits", () => {
    const stuck = toChunks(
      { method: "thread/status/changed", params: { status: { type: "systemError" } } },
      run,
    );
    expect(stuck).toMatchObject({ done: true, chunks: [{ type: "RUN_ERROR" }] });
    const exited = toChunks({ method: "exit", params: { stderr: "boom\n" } }, run);
    expect(exited).toMatchObject({ done: true, chunks: [{ message: "boom" }] });
  });
});

describe("statusUpdate", () => {
  it("follows the turn's phases", () => {
    expect(turn.map((e) => statusUpdate(e)?.phase)).toEqual([
      "thinking",
      "thinking",
      "writing",
      undefined,
      undefined,
      "tool",
      "thinking",
      null,
    ]);
  });

  it("reports the fullest usage window", () => {
    const limits = {
      primary: { usedPercent: 12, windowDurationMins: 300, resetsAt: 1 },
      secondary: { usedPercent: 85, windowDurationMins: 10_080, resetsAt: 2 },
      rateLimitReachedType: null,
    };
    expect(rateLimit(limits)).toEqual({
      status: "allowed",
      window: "seven_day",
      resetsAt: 2,
      utilization: 0.85,
    });
    expect(rateLimit({ ...limits, rateLimitReachedType: "rate_limit_reached" })?.status).toBe(
      "rejected",
    );
    expect(rateLimit({ primary: null, secondary: null, rateLimitReachedType: null })).toBe(
      undefined,
    );
  });
});
