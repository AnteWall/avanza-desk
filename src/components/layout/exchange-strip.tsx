import { cn } from "cn";

import { exchanges, exchangeStatus, getShownExchanges } from "@/lib/exchanges";
import { formatAs, formatClock, formatDate, formatDuration } from "@/lib/format";
import { m } from "@/lib/i18n";

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
            formatDate(next) === formatDate(now) ? formatClock(next) : formatAs(next, "EEE HH:mm");
          return (
            <span
              key={ex.short}
              className="flex items-center gap-1"
              title={m.layout.exchange(
                ex.name,
                open,
                when,
                formatDuration(next.getTime() - now.getTime()),
              )}
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
