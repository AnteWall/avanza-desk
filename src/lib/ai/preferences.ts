import { getSetting, saveSetting } from "@/lib/settings";

// The user's standing instructions for the assistant (Settings › Assistant), sent with every
// conversation as an addition to the system prompt, and which of its internet tools are on.

export type Preferences = {
  language: "auto" | "en" | "sv";
  detail: "brief" | "balanced" | "detailed";
  /** Free text: goals, horizon, risk appetite, what to always mention or avoid. */
  about: string;
  /** Claude Code's web search, for what Avanza doesn't have. */
  webSearch: boolean;
  /** `read_article` may fetch external articles (Placera, Direkt, …) from their sites. */
  externalArticles: boolean;
};

export const defaultPreferences: Preferences = {
  language: "auto",
  detail: "balanced",
  about: "",
  webSearch: true,
  externalArticles: true,
};
export const MAX_ABOUT = 2_000;

const KEY = "ai:preferences";

export const getPreferences = (): Preferences => ({
  ...defaultPreferences,
  ...getSetting<Partial<Preferences>>(KEY, {}),
});

export const savePreferences = (preferences: Preferences) => saveSetting(KEY, preferences);

const languages = {
  auto: "",
  en: "Always answer in English.",
  sv: "Always answer in Swedish.",
};
const details = {
  brief: "Keep answers brief: the key facts and numbers, no preamble.",
  balanced: "",
  detailed: "Give thorough answers: explain your reasoning and add relevant context.",
};

/** The instructions text, or undefined when everything is at its default. */
export function instructionsFrom(p: Preferences) {
  const lines = [languages[p.language], details[p.detail]];
  const about = p.about.trim().slice(0, MAX_ABOUT);
  if (about) lines.push(`About me, as an investor:\n${about}`);
  const text = lines.filter(Boolean).join("\n");
  return text || undefined;
}
