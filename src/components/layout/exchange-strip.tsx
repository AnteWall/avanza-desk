import { cn } from "cn";

import { exchanges, exchangeStatus, getShownExchanges } from "@/lib/exchanges";
import { formatDuration } from "@/lib/format";

const time = new Intl.DateTimeFormat("sv-SE", { timeStyle: "short", timeZone: "Europe/Stockholm" });
const dayTime = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Stockholm",
});
const day = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeZone: "Europe/Stockholm" });

/** The exchanges picked in Settings: open dot, and when it next opens or closes, in Stockholm time. */
export function ExchangeStrip({ now }: { now: Date }) {
  // Read on every render; the status bar re-renders each second, so Settings changes show up.
  const shown = getShownExchanges();
  return (
    <span className="flex items-center gap-3 whitespace-nowrap">
      {exchanges
        .filter((ex) => shown.includes(ex.short))
        .map((ex) => {
          const { open, next } = exchangeStatus(ex, now);
          const when =
            day.format(next) === day.format(now) ? time.format(next) : dayTime.format(next);
          return (
            <span
              key={ex.short}
              className="flex items-center gap-1"
              title={`${ex.name} ${open ? "open · closes" : "closed · opens"} ${when} (in ${formatDuration(next.getTime() - now.getTime())}). Regular hours; holidays not included.`}
            >
              <span
                className={cn("size-1.5 rounded-full", open ? "bg-brand" : "bg-muted-foreground")}
              />
              <span className={cn(open && "text-foreground")}>{ex.short}</span>
              <span className="num">{when}</span>
            </span>
          );
        })}
    </span>
  );
}
