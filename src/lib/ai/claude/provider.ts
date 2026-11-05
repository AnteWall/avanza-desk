import { invoke } from "@tauri-apps/api/core";

import logo from "@/assets/providers/claude.svg";
import { m } from "@/lib/i18n";
import { saveSetting } from "@/lib/settings";

import type { ModelOption, Provider, ProviderSetup } from "../types";
import { createClaudeSession } from "./connection";

/** `claude_probe`'s answer (src-tauri/src/ai/claude.rs). */
export type ClaudeProbe = {
  bin: string | null;
  custom: boolean;
  version: string | null;
  loggedIn: boolean;
  account: { email?: string; organization?: string; subscriptionType?: string } | null;
  models: {
    value: string;
    resolvedModel?: string;
    displayName: string;
    description?: string;
    supportsEffort?: boolean;
    supportedEffortLevels?: string[];
  }[];
  error: string | null;
};

/**
 * The CLI lists a "default" entry plus aliases ("opus", "sonnet") and pinned ids
 * ("claude-opus-5"). The default is marked on its alias rather than listed twice.
 */
export function toSetup(probe: ClaudeProbe): ProviderSetup {
  const { bin, custom, version, error } = probe;
  if (!bin) return { state: "missing", custom, error: error ?? undefined };
  if (error || !version)
    return {
      state: "broken",
      bin,
      custom,
      version: version ?? undefined,
      error: error ?? m.ai.provider.errors.claudeDidntStart,
    };
  if (!probe.loggedIn) return { state: "signed-out", bin, custom, version };
  const recommended = probe.models.find((m) => m.value === "default")?.resolvedModel;
  const models: ModelOption[] = probe.models
    .filter((m) => m.value !== "default")
    .map((m) => ({
      value: m.value,
      label: m.displayName,
      description: m.description,
      legacy: m.value.startsWith("claude-"),
      efforts: m.supportsEffort ? m.supportedEffortLevels : undefined,
    }));
  const defaultModel = models.find(
    (m) =>
      !m.legacy && probe.models.find((p) => p.value === m.value)?.resolvedModel === recommended,
  )?.value;
  const account = probe.account ?? {};
  return {
    state: "ready",
    bin,
    custom,
    version,
    account: {
      email: account.email,
      organization: account.organization,
      plan: account.subscriptionType,
    },
    models,
    defaultModel,
  };
}

export const claude: Provider = {
  id: "claude",
  name: "Claude",
  vendor: "Anthropic",
  logo,
  billing: m.ai.provider.billing.claude,
  installUrl: "https://code.claude.com/docs/en/setup",
  guideUrl: "https://code.claude.com/docs/en/quickstart",
  plansUrl: "https://claude.com/pricing",
  loginCommand: "claude auth login",
  program: "Claude Code",
  probe: async () => toSetup(await invoke<ClaudeProbe>("claude_probe")),
  // The backend reads this setting itself when it starts claude (never a path from the webview).
  setBinary: async (path) => void (await saveSetting("ai:claude:bin", path)),
  createSession: createClaudeSession,
};
