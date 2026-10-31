import { useState } from "react";

import { AskMenu } from "@/components/ai/ask-menu";
import { Change } from "@/components/common/change";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { NewsItem } from "@/components/news/news-item";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import type { NewsGroup as Group } from "@/lib/news";

const SHOWN = 3;

/**
 * One instrument's recent news: a header (logo, name, today's change; opens the instrument in
 * the workspace) over its newest few headlines, the rest behind "+N more".
 */
export function NewsGroup({
  group: { orderbook: ob, items },
  isin,
  held,
  now,
  expandedUrl,
  selectedUrl,
  onToggle,
}: {
  group: Group;
  isin?: string;
  held: boolean;
  now: string;
  expandedUrl?: string;
  selectedUrl?: string;
  onToggle: (url: string) => void;
}) {
  const focus = useFocusInstrument();
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, SHOWN);

  return (
    <section className="border-border/60 border-b py-1 last:border-b-0">
      <AskMenu
        item={instrumentItem(ob.id, ob.name, ob.instrumentType, isin)}
        trigger={
          <button
            type="button"
            onClick={() => focus(ob.id, ob.instrumentType)}
            title="Open in the workspace"
            className="hover:bg-muted/60 focus-visible:bg-muted flex h-8 w-full items-center gap-2 px-3 text-left transition-colors outline-none"
          >
            <InstrumentLogo isin={isin} name={ob.name} />
            <span className="truncate font-medium">{ob.name}</span>
            {held && <span className="bg-brand size-1.5 rounded-full" title="In your portfolio" />}
            {/* Avanza sends percent units; Change takes a ratio. */}
            <Change ratio={ob.dailyPerformance / 100} className="ml-auto" />
            <span className="text-muted-foreground num w-16 text-right text-xs">
              {items.length} {items.length === 1 ? "story" : "stories"}
            </span>
          </button>
        }
      />
      <ul>
        {shown.map((item) => (
          <NewsItem
            key={item.url}
            item={item}
            now={now}
            expanded={item.url === expandedUrl}
            selected={item.url === selectedUrl}
            onToggle={() => onToggle(item.url)}
          />
        ))}
      </ul>
      {items.length > SHOWN && (
        <button
          type="button"
          onClick={() => setAll(!all)}
          className="text-muted-foreground hover:text-foreground focus-visible:text-foreground h-7 pl-26 text-xs transition-colors outline-none"
        >
          {all ? "Show fewer" : `+ ${items.length - SHOWN} more`}
        </button>
      )}
    </section>
  );
}
