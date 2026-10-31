import { describe, expect, it } from "vitest";

import { type CodexProbe, toSetup } from "./provider";

const found = { bin: "/home/u/.local/bin/codex", custom: false, version: "0.165.0", error: null };
const model = (id: string, extra: Partial<CodexProbe["models"][number]> = {}) => ({
  id,
  displayName: id.toUpperCase(),
  hidden: false,
  isDefault: false,
  supportedReasoningEfforts: [{ reasoningEffort: "low" }, { reasoningEffort: "high" }],
  ...extra,
});

describe("toSetup", () => {
  it("reports a missing CLI, and an outdated one as broken", () => {
    const missing = { ...found, bin: null, version: null, loggedIn: false, account: null };
    expect(toSetup({ ...missing, models: [] })).toEqual({ state: "missing", custom: false });
    const old: CodexProbe = {
      ...found,
      version: "0.128.0",
      error: "AvanzaDesk needs Codex 0.165.0 or later.",
      loggedIn: false,
      account: null,
      models: [],
    };
    expect(toSetup(old)).toMatchObject({ state: "broken", error: old.error, version: "0.128.0" });
  });

  it("needs sign-in before anything else", () => {
    const probe: CodexProbe = { ...found, loggedIn: false, account: null, models: [] };
    expect(toSetup(probe)).toEqual({ state: "signed-out", ...found, error: undefined });
  });

  it("lists visible models with their efforts and the default", () => {
    const probe: CodexProbe = {
      ...found,
      loggedIn: true,
      account: { type: "chatgpt", email: "a@b.se", planType: "pro" },
      models: [model("gpt-a", { isDefault: true }), model("gpt-b"), model("old", { hidden: true })],
    };
    expect(toSetup(probe)).toMatchObject({
      state: "ready",
      account: { email: "a@b.se", plan: "pro" },
      defaultModel: "gpt-a",
      models: [
        { value: "gpt-a", label: "GPT-A", efforts: ["low", "high"] },
        { value: "gpt-b", label: "GPT-B" },
      ],
    });
  });

  it("names an API-key sign-in", () => {
    const probe: CodexProbe = {
      ...found,
      loggedIn: true,
      account: { type: "apiKey" },
      models: [model("gpt-a")],
    };
    expect(toSetup(probe)).toMatchObject({ account: { plan: "API key" } });
  });
});
