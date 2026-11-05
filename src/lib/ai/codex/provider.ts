import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";

import logoDark from "@/assets/providers/openai-dark.svg";
import logo from "@/assets/providers/openai.svg";
import { m } from "@/lib/i18n";
import { saveSetting } from "@/lib/settings";

import type { ModelOption, Provider, ProviderSetup } from "../types";
import { createCodexSession } from "./connection";

/** `codex_probe`'s answer (src-tauri/src/ai/codex.rs). */
export type CodexProbe = {
  bin: string | null;
  custom: boolean;
  version: string | null;
  loggedIn: boolean;
  account: { type: string; email?: string; planType?: string } | null;
  models: {
    id: string;
    displayName: string;
    description?: string;
    hidden: boolean;
    isDefault: boolean;
    supportedReasoningEfforts: { reasoningEffort: string }[];
  }[];
  error: string | null;
};

export function toSetup(probe: CodexProbe): ProviderSetup {
  const { bin, custom, version, error } = probe;
  if (!bin) return { state: "missing", custom, error: error ?? undefined };
  if (error || !version)
    return {
      state: "broken",
      bin,
      custom,
      version: version ?? undefined,
      error: error ?? m.ai.provider.errors.codexDidntStart,
    };
  if (!probe.loggedIn) return { state: "signed-out", bin, custom, version };
  const listed = probe.models.filter((m) => !m.hidden);
  const models: ModelOption[] = listed.map((m) => ({
    value: m.id,
    label: m.displayName,
    description: m.description,
    efforts: m.supportedReasoningEfforts.map((e) => e.reasoningEffort),
  }));
  const account = probe.account ?? { type: "chatgpt" };
  return {
    state: "ready",
    bin,
    custom,
    version,
    account: {
      email: account.email,
      plan: account.type === "apiKey" ? m.ai.provider.apiKey : account.planType,
    },
    models,
    defaultModel: listed.find((m) => m.isDefault)?.id,
  };
}

export const codex: Provider = {
  id: "codex",
  name: "Codex",
  vendor: "OpenAI",
  logo,
  logoDark,
  billing: m.ai.provider.billing.codex,
  installUrl: "https://learn.chatgpt.com/docs/codex/cli",
  guideUrl: "https://learn.chatgpt.com/docs/quickstart",
  plansUrl: "https://chatgpt.com/pricing",
  loginCommand: "codex login",
  program: "Codex CLI",
  probe: async () => toSetup(await invoke<CodexProbe>("codex_probe")),
  // The backend reads this setting itself when it starts codex (never a path from the webview).
  setBinary: async (path) => void (await saveSetting("ai:codex:bin", path)),
  signIn: async () => openUrl(await invoke<string>("codex_login")),
  createSession: createCodexSession,
};
