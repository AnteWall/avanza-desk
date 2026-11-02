import { useQuery } from "@tanstack/react-query";

import { BriefingAhead } from "@/components/briefing/briefing-ahead";
import { BriefingDone } from "@/components/briefing/briefing-done";
import { BriefingMasthead } from "@/components/briefing/briefing-masthead";
import { BriefingMovers } from "@/components/briefing/briefing-movers";
import { BriefingSection } from "@/components/briefing/briefing-section";
import { BriefingTimeline } from "@/components/briefing/briefing-timeline";
import { Skeleton } from "@/components/common/skeleton";
import { toAlertRow } from "@/lib/avanza/loose-records";
import {
  alertsQuery,
  allPositionsQuery,
  newsCalendarQuery,
  transactionsQuery,
} from "@/lib/avanza/queries";
import { buildBriefing, type LastVisit } from "@/lib/briefing";
import { formatDate } from "@/lib/format";
import { calendarEvents, stockholmToday } from "@/lib/news";

/**
 * The briefing as one column you read top to bottom, like a catch-up letter: the front page,
 * then what moved, what happened, what's next, and an end. Chapters with nothing in them are
 * left out; a failed source only drops its chapter.
 */
export function BriefingView({ since }: { since: LastVisit }) {
  const positions = useQuery(allPositionsQuery);
  const transactions = useQuery(transactionsQuery(formatDate(since.at)));
  const triggered = useQuery(alertsQuery("triggered"));
  const calendar = useQuery(newsCalendarQuery);

  const ready = !transactions.isPending && !triggered.isPending && !calendar.isPending;
  const b =
    positions.data && ready
      ? buildBriefing({
          last: since,
          positions: positions.data,
          transactions: transactions.data?.transactions ?? [],
          triggered: (triggered.data ?? []).map(toAlertRow),
          calendar: calendar.data ? calendarEvents(calendar.data) : [],
          today: stockholmToday(),
        })
      : undefined;

  return (
    <div className="bg-card h-full overflow-y-auto rounded-md border">
      <article className="mx-auto flex max-w-3xl flex-col gap-14 px-8 py-12">
        {!b ? (
          <div className="flex flex-col gap-5">
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-full opacity-60" />
            <Skeleton className="h-4 w-2/3 opacity-60" />
            <Skeleton className="h-40 w-full opacity-40" />
          </div>
        ) : (
          <>
            <BriefingMasthead b={b} />
            {b.movers.length > 0 && (
              <BriefingSection title="What moved" dek="your holdings, since then" to="/portfolio">
                <BriefingMovers movers={b.movers} />
              </BriefingSection>
            )}
            {b.activity.length > 0 && (
              <BriefingSection
                title="While you were away"
                dek="trades, dividends and alerts"
                to="/portfolio"
              >
                <BriefingTimeline activity={b.activity} />
              </BriefingSection>
            )}
            {b.upcoming.length > 0 && (
              <BriefingSection
                title="The next two weeks"
                dek="reports and ex-dividend dates"
                to="/news"
              >
                <BriefingAhead events={b.upcoming} isins={b.isins} />
              </BriefingSection>
            )}
            <BriefingDone />
          </>
        )}
      </article>
    </div>
  );
}
