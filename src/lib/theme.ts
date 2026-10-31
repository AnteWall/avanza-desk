import { getSetting, saveSetting } from "./settings";

export type Theme = "light" | "dark" | "system";

const KEY = "theme";
const systemDark = () => matchMedia("(prefers-color-scheme: dark)").matches;

export function getTheme(): Theme {
  return getSetting<Theme>(KEY, "dark");
}

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function setTheme(theme: Theme) {
  apply(theme);
  return saveSetting(KEY, theme);
}

/** Call after `loadSettings`. Applies the saved theme and follows OS appearance changes while it is "system". */
export function initTheme() {
  apply(getTheme());
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => apply(getTheme()));
}
