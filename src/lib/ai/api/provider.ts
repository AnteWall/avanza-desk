import { invoke } from "@tauri-apps/api/core";

import logo from "@/assets/providers/claude.svg";
import openaiLogoDark from "@/assets/providers/openai-dark.svg";
import openaiLogo from "@/assets/providers/openai.svg";
import { m } from "@/lib/i18n";

import type { ModelOption, Provider, ProviderSetup } from "../types";
import { createApiSession, type Vendor } from "./connection";

const EFFORTS = ["low", "medium", "high", "xhigh", "max"];
const DEFAULT_MODEL = "claude-opus-5-5";
const OPENAI_EFFORTS = ["low", "medium", "high"];

type Supported = { supported?: boolean };

/** `api_probe`'s answer (src-tauri/src/ai/api/mod.rs); models as the vendor lists them. */
export type ApiProbe<M = AnthropicModel> = {
  hasKey: boolean;
  keyHint: string | null;
  models: M[];
  error: string | null;
};

type AnthropicModel = {
  id: string;
  display_name: string;
  capabilities?: { effort?: Supported & Record<string, Supported | boolean | undefined> };
};

type OpenaiModel = { id: string; created: number };

/** The setup before the models: no key, a rejected key, or a working one. */
function keySetup(probe: ApiProbe<unknown>, models: ModelOption[], defaultModel?: string) {
  const { hasKey, keyHint, error } = probe;
  if (!hasKey) return { state: "missing", custom: false } satisfies ProviderSetup;
  if (error) return { state: "broken", bin: "", custom: false, error } satisfies ProviderSetup;
  return {
    state: "ready",
    bin: "",
    custom: false,
    version: "",
    account: { plan: keyHint ? m.ai.provider.apiKeyHint(keyHint) : m.ai.provider.apiKey },
    models,
    defaultModel,
  } satisfies ProviderSetup;
}

/** The API lists models newest first; older ones of a family ("opus", "sonnet") are legacy. */
export function toSetup(probe: ApiProbe): ProviderSetup {
  const families = new Set<string>();
  const models: ModelOption[] = probe.models.map((m) => {
    const family = m.id.split("-")[1] ?? m.id;
    const legacy = families.has(family);
    families.add(family);
    const effort = m.capabilities?.effort;
    return {
      value: m.id,
      label: m.display_name,
      legacy,
      efforts: effort?.supported
        ? EFFORTS.filter((level) => (effort[level] as Supported | undefined)?.supported)
        : undefined,
    };
  });
  const defaultModel = models.some((m) => m.value === DEFAULT_MODEL)
    ? DEFAULT_MODEL
    : models[0]?.value;
  return keySetup(probe, models, defaultModel);
}

// What the Responses API can't chat with: audio, images, embeddings, moderation, search-only.
const NOT_CHAT = /audio|realtime|tts|transcribe|image|embedding|moderation|search|instruct/;

/** "gpt-5.1-mini" → 5.1; NaN for the o-series. */
const generation = (id: string) => Number(/^gpt-(\d+(?:\.\d+)?)/.exec(id)?.[1]);

/**
 * OpenAI lists every model it has, unsorted and without names or capabilities: keep the chat
 * models, newest first. Only the newest GPT generation (with its mini and nano) is current;
 * older generations, the o-series and dated snapshots ("gpt-5-2025-08-07") are legacy.
 */
export function toOpenaiSetup(probe: ApiProbe<OpenaiModel>): ProviderSetup {
  const chat = probe.models.filter((m) => /^(gpt-\d|o\d)/.test(m.id) && !NOT_CHAT.test(m.id));
  const newest = Math.max(...chat.map((m) => generation(m.id)).filter((g) => !Number.isNaN(g)));
  const models: ModelOption[] = chat
    .toSorted((a, b) => b.created - a.created)
    .map((m) => ({
      value: m.id,
      label: m.id,
      legacy: generation(m.id) !== newest || /-\d{4}-\d{2}-\d{2}$/.test(m.id),
      // shortcut: the levels every reasoning model takes; newer ones add more.
      efforts: /^(gpt-5|o\d)/.test(m.id) ? OPENAI_EFFORTS : undefined,
    }));
  const defaultModel = models.find(
    (m) => !m.legacy && m.value.startsWith("gpt-") && !/mini|nano/.test(m.value),
  )?.value;
  return keySetup(probe, models, defaultModel);
}

const apiProbe = <M>(vendor: Vendor) => invoke<ApiProbe<M>>("api_probe", { vendor });
const setApiKey = (vendor: Vendor) => async (key: string | null) =>
  void (await invoke("api_key_set", { vendor, key }));

export const claudeApi: Provider = {
  id: "claude-api",
  name: "Claude API",
  vendor: "Anthropic",
  logo,
  billing: m.ai.provider.billing.claudeApi,
  installUrl: "https://platform.claude.com/settings/keys",
  guideUrl: "https://platform.claude.com/docs/en/get-started",
  plansUrl: "https://claude.com/pricing#api",
  loginCommand: "",
  program: m.ai.provider.apiKey,
  probe: async () => toSetup(await apiProbe<AnthropicModel>("anthropic")),
  // Nothing to install: the backend calls the API itself.
  setBinary: async () => {},
  setApiKey: setApiKey("anthropic"),
  createSession: createApiSession("anthropic"),
};

export const openaiApi: Provider = {
  id: "openai-api",
  name: "OpenAI API",
  vendor: "OpenAI",
  logo: openaiLogo,
  logoDark: openaiLogoDark,
  billing: m.ai.provider.billing.openaiApi,
  installUrl: "https://platform.openai.com/api-keys",
  guideUrl: "https://platform.openai.com/docs/quickstart",
  plansUrl: "https://openai.com/api/pricing",
  loginCommand: "",
  program: m.ai.provider.apiKey,
  probe: async () => toOpenaiSetup(await apiProbe<OpenaiModel>("openai")),
  setBinary: async () => {},
  setApiKey: setApiKey("openai"),
  createSession: createApiSession("openai"),
};
