import type { NewsFeedItem } from "avanza-ts";
import { cn } from "cn";
import { ArrowUpRight, ChevronDown } from "lucide-react";

import { AskMenu } from "@/components/ai/ask-menu";
import { useOpenArticle } from "@/components/news/use-open-article";
import { Button } from "@/components/ui/button";
import { articleItem } from "@/lib/ai/context";
import { m } from "@/lib/i18n";
import { headline, newsTime } from "@/lib/news";

/**
 * One headline: time and title on a single line, the source on hover. Clicking it unfolds the
 * teaser, the source and a Read button (Avanza's articles open in the reader, others in the
 * browser).
 */
export function NewsItem({
  item,
  now,
  expanded,
  selected,
  onToggle,
}: {
  item: NewsFeedItem;
  now: string;
  expanded: boolean;
  selected: boolean;
  onToggle: () => void;
}) {
  const open = useOpenArticle();
  const teaser = item.vignette || item.text;
  const title = headline(item.title);

  return (
    <li data-selected={selected} className="data-[selected=true]:bg-accent">
      <AskMenu
        item={articleItem(item.url, item.title, item.externalLink)}
        trigger={
          <button
            type="button"
            aria-expanded={expanded}
            onClick={onToggle}
            title={title}
            className="group hover:bg-muted/60 focus-visible:bg-muted h-row flex w-full items-center gap-3 px-3 text-left transition-colors outline-none"
          >
            <span className="num text-muted-foreground w-20 shrink-0 text-xs">
              {newsTime(item.publishDateTime, now)}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
            {/* The headline is the content; where it's from is a detail for hover. */}
            <span className="text-muted-foreground shrink-0 text-xs opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {item.source}
            </span>
            <ChevronDown
              className={cn(
                "text-muted-foreground size-3.5 shrink-0 transition-transform",
                expanded && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        }
      />
      {expanded && (
        <div className="flex flex-col items-start gap-2 pr-3 pb-3 pl-26">
          <p className="font-medium whitespace-normal">
            {title}{" "}
            <span className="text-muted-foreground text-xs font-normal">· {item.source}</span>
          </p>
          {teaser && <p className="text-muted-foreground max-w-3xl leading-relaxed">{teaser}</p>}
          <Button variant="outline" size="xs" onClick={() => open(item.url, item.externalLink)}>
            {item.externalLink ? m.news.item.readOn(item.source) : m.news.item.read}
            {item.externalLink && <ArrowUpRight />}
          </Button>
        </div>
      )}
    </li>
  );
}
