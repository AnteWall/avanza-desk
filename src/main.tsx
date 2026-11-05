import { initLanguage } from "./lib/i18n";
import { loadSettings } from "./lib/settings";

// `pnpm demo`: the app on made-up data in a browser, for screenshots. Stripped from real builds.
if (import.meta.env.VITE_DEMO) (await import("./lib/demo/install")).installDemo();

// Settings come from SQLite; read them before rendering so the theme never flashes. The
// language is picked before the app's modules load, so their top-level strings are in it.
await loadSettings();
await initLanguage();
await import("./app");
