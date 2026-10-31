import { createFileRoute } from "@tanstack/react-router";

import { NewsPage } from "@/components/news/news-page";

export const Route = createFileRoute("/news")({
  // `article`: the open article's URL or path, as Avanza's news endpoints give it.
  validateSearch: (search): { article?: string } =>
    typeof search.article === "string" ? { article: search.article } : {},
  component: NewsPage,
});
