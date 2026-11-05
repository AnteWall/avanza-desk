import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

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
import { buildBriefing, startOfDayOf, type LastVisit } from "@/lib/briefing";
import { formatDate } from "@/lib/format";
import { m } from "@/lib/i18n";
import { calendarEvents, stockholmToday } from "@/lib/news";

/**
 * The briefing as one column you read top to bottom, like a catch-up letter: the front page,
 * then what moved, what happened, what's next, and an end. Chapters with nothing in them are
 * left out; a failed source only drops its chapter. Without `since` it tells today's story,
 * measured from this morning.
 */
export function BriefingView({ since, switcher }: { since?: LastVisit; switcher?: ReactNode }) {
  const today = stockholmToday();
  const positions = useQuery(allPositionsQuery);
  const transactions = useQuery(transactionsQuery(since ? formatDate(since.at) : today));
  const triggered = useQuery(alertsQuery("triggered"));
  const calendar = useQuery(newsCalendarQuery);

  const ready = !transactions.isPending && !triggered.isPending && !calendar.isPending;
  const b =
    positions.data && ready
      ? buildBriefing({
          last: since ?? startOfDayOf(positions.data, today),
          positions: positions.data,
          transactions: transactions.data?.transactions ?? [],
          triggered: (triggered.data ?? []).map(toAlertRow),
          calendar: calendar.data ? calendarEvents(calendar.data) : [],
          today,
        })
      : undefined;

  return (
    <div className="bg-card h-full overflow-y-auto rounded-md border">
      <article className="mx-auto flex max-w-3xl flex-col gap-14 px-8 py-12">
        {switcher && <div className="-mb-10 flex justify-end">{switcher}</div>}
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
            <BriefingMasthead b={b} today={!since} />
            {b.movers.length > 0 && (
              <BriefingSection
                title={m.briefing.sections.moved}
                dek={since ? m.briefing.sections.movedSince : m.briefing.sections.movedToday}
                to="/portfolio"
              >
                <BriefingMovers movers={b.movers} />
              </BriefingSection>
            )}
            {b.activity.length > 0 && (
              <BriefingSection
                title={since ? m.briefing.sections.away : m.common.today}
                dek={m.briefing.sections.activity}
                to="/portfolio"
              >
                <BriefingTimeline activity={b.activity} />
              </BriefingSection>
            )}
            {b.upcoming.length > 0 && (
              <BriefingSection
                title={m.briefing.sections.ahead}
                dek={m.briefing.sections.aheadDek}
                to="/news"
              >
                <BriefingAhead events={b.upcoming} isins={b.isins} />
              </BriefingSection>
            )}
            <BriefingDone today={!since} />
          </>
        )}
      </article>
    </div>
  );
}
