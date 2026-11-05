import { Link, useSearch } from "@tanstack/react-router";
import { CalendarDays, FileText, Newspaper, X } from "lucide-react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { Skeleton } from "@/components/common/skeleton";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { SavedPanelGroup } from "@/components/layout/saved-panel-group";
import { ArticleView } from "@/components/news/article-view";
import { NewsCalendar } from "@/components/news/news-calendar";
import { NewsFeed } from "@/components/news/news-feed";
import { Button } from "@/components/ui/button";
import { ResizableHandle, ResizablePanel } from "@/components/ui/resizable";
import { Panel } from "@/components/workspace/panel";
import { gutter } from "@/components/workspace/workspace";
import { m } from "@/lib/i18n";

const articleSkeleton = (
  <div className="flex flex-col gap-3 p-3">
    <Skeleton className="h-5 w-3/4" />
    <Skeleton className="h-3 w-40 opacity-60" />
    {[0, 1, 2, 3].map((i) => (
      <Skeleton key={i} className="h-3 w-full opacity-60" />
    ))}
  </div>
);

/**
 * News about what you hold and watch, and the reports/dividends calendar. The reader panel only
 * opens for Avanza's own articles; external ones open in the browser.
 */
export function NewsPage() {
  const { article } = useSearch({ from: "/news" });

  return (
    <SavedPanelGroup
      id="news-group-1"
      orientation="horizontal"
      panelIds={
        article
          ? ["news-panel-1", "news-panel-2", "news-panel-3"]
          : ["news-panel-1", "news-panel-3"]
      }
    >
      <ResizablePanel id="news-panel-1" defaultSize={article ? "45" : "65"} minSize="25">
        <Panel title={m.news.page.title} icon={Newspaper} subtitle={m.news.page.subtitle}>
          <AsyncBoundary what={m.news.page.what} fallback={<TableSkeleton rows={12} columns={3} />}>
            <NewsFeed />
          </AsyncBoundary>
        </Panel>
      </ResizablePanel>
      <ResizableHandle className={gutter} />
      {article && (
        <>
          <ResizablePanel id="news-panel-2" defaultSize="35" minSize="20">
            <Panel
              title={m.news.page.article}
              icon={FileText}
              actions={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  aria-label={m.news.page.closeArticle}
                  render={<Link to="/news" />}
                >
                  <X />
                </Button>
              }
            >
              <AsyncBoundary
                what={m.news.page.theArticle}
                fallback={articleSkeleton}
                resetKey={article}
              >
                <ArticleView url={article} />
              </AsyncBoundary>
            </Panel>
          </ResizablePanel>
          <ResizableHandle className={gutter} />
        </>
      )}
      <ResizablePanel id="news-panel-3" defaultSize={article ? "20" : "35"} minSize="15">
        <Panel
          title={m.news.page.comingUp}
          icon={CalendarDays}
          subtitle={m.news.page.comingUpSubtitle}
        >
          <AsyncBoundary
            what={m.news.page.theCalendar}
            fallback={<TableSkeleton rows={8} columns={3} />}
          >
            <NewsCalendar />
          </AsyncBoundary>
        </Panel>
      </ResizablePanel>
    </SavedPanelGroup>
  );
}
