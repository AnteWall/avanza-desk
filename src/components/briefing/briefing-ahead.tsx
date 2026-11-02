import { InstrumentLogo } from "@/components/common/instrument-logo";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { dayParts } from "@/lib/briefing";
import type { CalendarEvent } from "@/lib/news";

/** Reports and ex-dividend dates of your holdings as date tiles, soonest first. */
export function BriefingAhead({
  events,
  isins,
}: {
  events: readonly CalendarEvent[];
  isins: Record<string, string>;
}) {
  const focus = useFocusInstrument();
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {events.map((e) => {
        const { day, weekday, month } = dayParts(e.date);
        return (
          <button
            key={e.key}
            type="button"
            onClick={() => focus(e.orderbookId, e.type)}
            title="Open in the workspace"
            className="hover:bg-muted/60 focus-visible:ring-ring flex cursor-pointer flex-col gap-3 rounded-md border p-3 text-left transition-colors outline-none focus-visible:ring-2"
          >
            <span className="flex items-baseline gap-1.5">
              <span className="num text-2xl leading-none font-semibold">{day}</span>
              <span className="text-muted-foreground text-xs">
                {weekday} {month}
              </span>
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <InstrumentLogo isin={isins[e.orderbookId]} name={e.name} />
              <span className="truncate font-medium">{e.name}</span>
            </span>
            <span className="text-muted-foreground text-xs">{e.what}</span>
          </button>
        );
      })}
    </div>
  );
}
