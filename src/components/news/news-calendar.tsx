import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Empty } from "@/components/common/empty";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { useHoldings } from "@/components/portfolio/use-holdings";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { newsCalendarQuery } from "@/lib/avanza/queries";
import { m } from "@/lib/i18n";
import { calendarEvents, eventDay, eventGroup, stockholmToday, weeksAhead } from "@/lib/news";

/**
 * Upcoming reports and ex-dividend dates for your holdings, by week, then by month. This week and next show
 * up front, later ones behind "Show later". A row opens the instrument. Suspends.
 */
export function NewsCalendar() {
  const { data } = useSuspenseQuery(newsCalendarQuery);
  const { holdings } = useHoldings();
  const focus = useFocusInstrument();
  const [all, setAll] = useState(false);

  const events = calendarEvents(data);
  const today = stockholmToday();
  const upcoming = events.filter((e) => e.date >= today);
  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  if (upcoming.length === 0) return <Empty>{m.news.calendar.empty}</Empty>;
  const soon = upcoming.filter((e) => weeksAhead(e.date, today) <= 1).length;
  // Never open on an empty panel: with nothing in the next two weeks, show the next few.
  const shown = all ? upcoming : upcoming.slice(0, soon || 5);
  const isins = new Map(holdings.map((h) => [h.orderbookId, h.isin]));

  return (
    <div className="flex flex-col pb-1">
      {shown.map((e, i) => {
        const label = eventGroup(e.date, today);
        const prev = shown[i - 1];
        return (
          <div key={e.key}>
            {label !== (prev && eventGroup(prev.date, today)) && (
              <h3 className="text-muted-foreground flex h-8 items-end px-3 pb-1 text-xs font-medium">
                {label}
              </h3>
            )}
            <button
              type="button"
              onClick={() => focus(e.orderbookId, e.type)}
              title={m.news.openInWorkspace}
              className="hover:bg-muted/60 focus-visible:bg-muted flex h-8 w-full items-center gap-2 px-3 text-left transition-colors outline-none"
            >
              <span className="num text-muted-foreground w-14 shrink-0 text-xs">
                {eventDay(e.date)}
              </span>
              <InstrumentLogo isin={isins.get(e.orderbookId)} name={e.name} />
              <span className="min-w-0 flex-1 truncate font-medium">{e.name}</span>
              <span className="text-muted-foreground shrink-0 text-xs">{e.what}</span>
            </button>
          </div>
        );
      })}
      {upcoming.length > shown.length && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className="text-muted-foreground hover:text-foreground focus-visible:text-foreground h-8 px-3 text-left text-xs transition-colors outline-none"
        >
          {m.news.calendar.showLater(upcoming.length - shown.length)}
        </button>
      )}
    </div>
  );
}
