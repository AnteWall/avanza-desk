import { useNavigate } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";

/** Opens Avanza's own articles in the News page reader and external ones in the browser. */
export function useOpenArticle() {
  const navigate = useNavigate();
  return (url: string, external: boolean) =>
    external
      ? void openUrl(url.startsWith("/") ? `https://www.avanza.se${url}` : url)
      : void navigate({ to: "/news", search: { article: url } });
}
