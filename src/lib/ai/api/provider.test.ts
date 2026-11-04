import { describe, expect, it } from "vitest";

import { type ApiProbe, toOpenaiSetup, toSetup } from "./provider";

const probe: ApiProbe = { hasKey: true, keyHint: "a1b2", models: [], error: null };
const effort = { supported: true, low: { supported: true }, max: { supported: false } };

describe("toSetup", () => {
  it("asks for a key, then reports a rejected one", () => {
    expect(toSetup({ ...probe, hasKey: false })).toEqual({ state: "missing", custom: false });
    expect(toSetup({ ...probe, error: "The API key was rejected." })).toMatchObject({
      state: "broken",
      error: "The API key was rejected.",
    });
  });

  it("marks older models of a family legacy and picks the default", () => {
    const setup = toSetup({
      ...probe,
      models: [
        { id: "claude-opus-5-5", display_name: "Claude Opus 5.5", capabilities: { effort } },
        { id: "claude-sonnet-5-5", display_name: "Claude Sonnet 5.5" },
        { id: "claude-opus-5", display_name: "Claude Opus 5" },
      ],
    });
    expect(setup).toMatchObject({
      state: "ready",
      account: { plan: "API key …a1b2" },
      defaultModel: "claude-opus-5-5",
      models: [
        { value: "claude-opus-5-5", legacy: false, efforts: ["low"] },
        { value: "claude-sonnet-5-5", legacy: false, efforts: undefined },
        { value: "claude-opus-5", legacy: true },
      ],
    });
  });
});

describe("toOpenaiSetup", () => {
  it("keeps chat models, newest first, only the newest generation current", () => {
    const setup = toOpenaiSetup({
      hasKey: true,
      keyHint: "wxyz",
      error: null,
      models: [
        { id: "gpt-5-2025-08-07", created: 1 },
        { id: "text-embedding-3-large", created: 9 },
        { id: "gpt-realtime", created: 8 },
        { id: "gpt-5-mini", created: 3 },
        { id: "gpt-5", created: 2 },
        { id: "gpt-4.1", created: 0 },
      ],
    });
    expect(setup).toMatchObject({
      state: "ready",
      defaultModel: "gpt-5",
      models: [
        { value: "gpt-5-mini", legacy: false, efforts: ["low", "medium", "high"] },
        { value: "gpt-5", legacy: false },
        { value: "gpt-5-2025-08-07", legacy: true },
        { value: "gpt-4.1", legacy: true, efforts: undefined },
      ],
    });
  });
});
