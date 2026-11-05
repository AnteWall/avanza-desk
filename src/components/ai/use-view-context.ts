import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "@tanstack/react-router";

import { pages } from "@/components/layout/pages";
import { useAccount } from "@/components/layout/use-account";
import { useFocusedInstrument } from "@/components/workspace/use-focused-instrument";
import type { ContextItem } from "@/lib/ai/context";
import { instrumentQuery, newsFeedQuery } from "@/lib/avanza/queries";
import { m } from "@/lib/i18n";

/**
 * What the user is looking at right now, as context for the assistant: the page, the account
 * the views are scoped to, the instrument in focus (workspace) and the article being read
 * (News). Reads data the page already loaded; it never fetches anything new.
 */
export function useViewContext(): ContextItem[] {
  const pathname = useLocation({ select: (l) => l.pathname });
  const { article } = useSearch({ strict: false }) as { article?: string };
  const account = useAccount();
  const focus = useFocusedInstrument();
  const queryClient = useQueryClient();
  const inWorkspace = pathname === "/";
  // Same key as the workspace header, so this reads the instrument it already shows.
  const { data: instrument } = useQuery({
    ...instrumentQuery(focus?.id ?? "", focus?.type),
    enabled: inWorkspace && !!focus,
  });

  const items: ContextItem[] = [];
  const page = pathname.startsWith("/settings")
    ? m.common.settings
    : pages.find((p) => p.to === pathname)?.label;
  if (page) items.push({ kind: "page", label: page });
  if (account.id) items.push({ kind: "account", label: account.label });
  if (inWorkspace && focus && instrument) {
    items.push({
      kind: "instrument",
      id: focus.id,
      type: focus.type,
      name: instrument.shortName || instrument.name,
      isin: instrument.isin,
    });
  }
  if (pathname === "/news" && article) {
    const item = queryClient
      .getQueryData(newsFeedQuery.queryKey)
      ?.news.find((n) => n.url === article);
    items.push({
      kind: "article",
      url: article,
      title: item?.title ?? m.ai.openArticle,
      external: item?.externalLink ?? false,
    });
  }
  return items;
}
