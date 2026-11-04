import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// GitHub Pages serves the repo at /avanza-desk/.
export default defineConfig({
  site: "https://antewall.github.io",
  base: "/avanza-desk",
  vite: {
    plugins: [tailwindcss()],
    // Screenshots and CHANGELOG.md live in the app repo, one level up.
    server: { fs: { allow: [".."] } },
  },
});
