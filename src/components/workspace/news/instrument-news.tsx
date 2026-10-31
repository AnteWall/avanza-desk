import { useSuspenseQuery } from "@tanstack/react-query";
import type { InstrumentNewsArticle } from "avanza-ts";

import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { useOpenArticle } from "@/components/news/use-open-article";
import { articleItem } from "@/lib/ai/context";
import { instrumentNewsQuery } from "@/lib/avanza/queries";
import { formatDateTime } from "@/lib/format";

const col = dataTableColumns<InstrumentNewsArticle>();
const columns = col.columns([
  col.accessor("timePublishedMillis", {
    header: "Published",
    cell: (c) => formatDateTime(c.getValue()),
    meta: { className: "num w-32 text-muted-foreground" },
  }),
  col.accessor("headline", { header: "Headline", meta: { className: "font-medium" } }),
  col.accessor("newsSource", { header: "Source", meta: { className: "text-muted-foreground" } }),
]);

/** News about one instrument, newest first; a row opens the article. Suspends. */
export function InstrumentNews({ orderbookId }: { orderbookId: string }) {
  const { data } = useSuspenseQuery(instrumentNewsQuery(orderbookId));
  const open = useOpenArticle();

  if (data.articles.length === 0) return <Empty>No news for this instrument.</Empty>;
  return (
    <DataTable
      columns={columns}
      data={[...data.articles]}
      getRowId={(a) => a.fullArticleLink}
      onRowClick={(a) => open(a.fullArticleLink, a.externalLink)}
      askAbout={(a) => articleItem(a.fullArticleLink, a.headline, a.externalLink)}
    />
  );
}
