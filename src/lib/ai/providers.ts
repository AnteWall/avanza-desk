import { getSetting, saveSetting } from "@/lib/settings";

import { claude } from "./claude/provider";
import { codex } from "./codex/provider";
import type { Provider } from "./types";

/** Every AI provider, in menu order. Add new ones here. */
export const providers: Provider[] = [claude, codex];

export const getProvider = () =>
  providers.find((p) => p.id === getSetting("ai:provider", claude.id)) ?? claude;

export const setProvider = (id: string) => saveSetting("ai:provider", id);

/** The user's model for a provider; undefined means the provider's recommended one. */
export const getModel = (provider: Provider) =>
  getSetting<string | undefined>(`ai:${provider.id}:model`, undefined);

export const setModel = (provider: Provider, model: string) =>
  saveSetting(`ai:${provider.id}:model`, model);

/** The user's effort level for a provider; undefined means the model's default. */
export const getEffort = (provider: Provider) =>
  getSetting<string | null>(`ai:${provider.id}:effort`, null) ?? undefined;

export const setEffort = (provider: Provider, effort: string | undefined) =>
  saveSetting(`ai:${provider.id}:effort`, effort ?? null);
