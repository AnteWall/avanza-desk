import { useSuspenseQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Empty } from "@/components/common/empty";
import { NewsGroup } from "@/components/news/news-group";
import { useHoldings } from "@/components/portfolio/use-holdings";
import { newsFeedQuery } from "@/lib/avanza/queries";
import { m } from "@/lib/i18n";
import { groupNews } from "@/lib/news";

/** The last week's news on your holdings and watchlists, grouped per instrument. Suspends. */
export function NewsFeed() {
  const { data } = useSuspenseQuery(newsFeedQuery);
  const { holdings } = useHoldings();
  const { article } = useSearch({ from: "/news" });
  const [expanded, setExpanded] = useState<string>();

  const groups = useMemo(() => groupNews(data.news, data.currentDateTime), [data]);
  // Logos are keyed by ISIN, which the feed lacks; holdings have it (watch-only ones show an initial).
  const isins = useMemo(() => new Map(holdings.map((h) => [h.orderbookId, h.isin])), [holdings]);

  if (groups.length === 0) return <Empty>{m.news.feed.empty}</Empty>;
  return (
    <div>
      {groups.map((g) => (
        <NewsGroup
          key={g.orderbook.id}
          group={g}
          isin={isins.get(g.orderbook.id)}
          held={isins.has(g.orderbook.id)}
          now={data.currentDateTime}
          expandedUrl={expanded}
          selectedUrl={article}
          onToggle={(url) => setExpanded(url === expanded ? undefined : url)}
        />
      ))}
    </div>
  );
}
