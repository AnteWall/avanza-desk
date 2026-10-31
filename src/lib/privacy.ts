import { getSetting, saveSetting } from "./settings";

// Privacy mode blurs every element marked `sensitive` (amounts and quantities you own), for
// screen sharing or a crowded room. A class on <html>, like the theme.
const KEY = "privacy";

export const getPrivacy = () => getSetting(KEY, false);

/** Always start blurred, whatever the toggle was at quit. */
export const getStartPrivate = () => getSetting(`${KEY}:start`, false);
export const setStartPrivate = (on: boolean) => saveSetting(`${KEY}:start`, on);

function apply(on: boolean) {
  document.documentElement.classList.toggle("privacy", on);
}

export function setPrivacy(on: boolean) {
  apply(on);
  return saveSetting(KEY, on);
}

/** Call after `loadSettings`. */
export function initPrivacy() {
  if (getStartPrivate()) void setPrivacy(true);
  else apply(getPrivacy());
}
