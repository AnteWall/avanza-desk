import { describe, expect, it } from "vitest";

import { type ClaudeProbe, toSetup } from "./provider";

const found = { bin: "/home/u/.local/bin/claude", custom: false, version: "2.1.314", error: null };

describe("toSetup", () => {
  it("reports a missing CLI and a bad custom path", () => {
    const missing = {
      ...found,
      bin: null,
      version: null,
      loggedIn: false,
      account: null,
      models: [],
    };
    expect(toSetup(missing)).toEqual({ state: "missing", custom: false, error: undefined });
    expect(toSetup({ ...missing, custom: true, error: "No Claude Code at /x" })).toMatchObject({
      state: "missing",
      error: "No Claude Code at /x",
    });
  });

  it("needs sign-in before anything else", () => {
    const probe: ClaudeProbe = { ...found, loggedIn: false, account: null, models: [] };
    expect(toSetup(probe)).toEqual({ state: "signed-out", ...found, error: undefined });
  });

  it("lists models with the recommended alias and pinned ids apart", () => {
    const probe: ClaudeProbe = {
      ...found,
      loggedIn: true,
      account: { email: "a@b.se", subscriptionType: "Claude Max" },
      models: [
        {
          value: "default",
          resolvedModel: "claude-opus-5-5",
          displayName: "Default (recommended)",
        },
        { value: "opus", resolvedModel: "claude-opus-5-5", displayName: "Opus 5.5" },
        { value: "haiku", resolvedModel: "claude-haiku-5-5", displayName: "Haiku 5.5" },
        { value: "claude-opus-5", resolvedModel: "claude-opus-5", displayName: "Opus 5" },
      ],
    };
    const setup = toSetup(probe);
    expect(setup).toMatchObject({
      state: "ready",
      defaultModel: "opus",
      account: { email: "a@b.se", plan: "Claude Max" },
    });
    expect(setup.state === "ready" && setup.models.map((m) => [m.value, m.legacy])).toEqual([
      ["opus", false],
      ["haiku", false],
      ["claude-opus-5", true],
    ]);
  });

  it("reports a CLI that fails to run", () => {
    const probe: ClaudeProbe = {
      ...found,
      version: null,
      error: "boom",
      loggedIn: false,
      account: null,
      models: [],
    };
    expect(toSetup(probe)).toMatchObject({ state: "broken", error: "boom" });
  });
});
