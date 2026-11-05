import { enUS, sv as svLocale } from "date-fns/locale";

import { en } from "@/lib/i18n/en";
import { getSetting, onRemoteSetting, saveSetting } from "@/lib/settings";

// UI strings. English (`en/`) is the source: its shape is the type every other language must
// match, so tsc fails on a missing or extra key. Read strings as `m.<module>.<key>`; strings
// with values are functions. The language is set once, before the app's modules load (see
// main.tsx), so module-level constants can read `m` too. Changing it reloads every window.

export type Messages = typeof en;

export const languages = { sv: "Svenska", en: "English" } as const;
export type Language = keyof typeof languages;

const loaders: Record<Exclude<Language, "en">, () => Promise<{ default: Messages }>> = {
  sv: () => import("@/lib/i18n/sv"),
};
const dateLocales = { en: enUS, sv: svLocale };

const KEY = "language";

export let lang: Language = "en";
export let m: Messages = en;
/** date-fns locale for weekday and month names. */
export let dateLocale = dateLocales.en;

const systemLanguage = (): Language => (navigator.language.startsWith("sv") ? "sv" : "en");

/** Run after settings load and before any module that reads `m` is imported. */
export async function initLanguage() {
  const saved = getSetting<Language | undefined>(KEY, undefined);
  lang = saved && saved in languages ? saved : systemLanguage();
  if (lang !== "en") m = (await loaders[lang]()).default;
  dateLocale = dateLocales[lang];
  document.documentElement.lang = lang;
  onRemoteSetting(KEY, () => location.reload());
}

export async function setLanguage(language: Language) {
  await saveSetting(KEY, language);
  location.reload();
}
