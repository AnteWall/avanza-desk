import { useSuspenseQuery } from "@tanstack/react-query";

import { Change } from "@/components/common/change";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { articleParagraphs } from "@/lib/article-text";
import { newsArticleQuery } from "@/lib/avanza/queries";
import { formatDateTime } from "@/lib/format";

/** One Avanza article as plain text; its instruments focus in the workspace. Suspends. */
export function ArticleView({ url }: { url: string }) {
  const { data } = useSuspenseQuery(newsArticleQuery(url));
  const focus = useFocusInstrument();

  return (
    <article className="flex max-w-3xl flex-col gap-3 p-3">
      <header className="flex flex-col gap-1">
        <h1 className="text-base font-semibold">{data.title}</h1>
        <p className="text-muted-foreground text-xs">
          {data.source} · <span className="num">{formatDateTime(data.publishDate)}</span>
        </p>
      </header>
      {data.orderbooks.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {data.orderbooks.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => focus(o.id, o.instrumentType)}
                className="bg-muted hover:bg-accent flex items-center gap-2 rounded-sm px-2 py-0.5 text-xs transition-colors"
              >
                <span className="font-medium">{o.name}</span>
                {/* Avanza sends percent units; Change takes a ratio. */}
                <Change ratio={o.changePercent / 100} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {data.vignette && <p className="font-medium">{data.vignette}</p>}
      {articleParagraphs(data.body).map((p, i) => (
        <p key={i} className="leading-relaxed">
          {p}
        </p>
      ))}
    </article>
  );
}
