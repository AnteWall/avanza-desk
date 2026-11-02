import { cn } from "cn";
import { ArrowDownLeft, ArrowUpRight, Bell, Coins } from "lucide-react";

import { SignedAmount } from "@/components/common/signed-amount";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { dayParts, type Activity } from "@/lib/briefing";
import { formatPrice } from "@/lib/format";

const kinds = {
  buy: { icon: ArrowUpRight, verb: "Bought", tone: "text-up" },
  sell: { icon: ArrowDownLeft, verb: "Sold", tone: "text-down" },
  dividend: { icon: Coins, verb: "Dividend from", tone: "text-muted-foreground" },
  alert: { icon: Bell, verb: "Alert on", tone: "text-muted-foreground" },
} as const;

/** What happened while you were away, by day, newest first, on a vertical line. */
export function BriefingTimeline({ activity }: { activity: readonly Activity[] }) {
  const focus = useFocusInstrument();
  const days = [...new Set(activity.map((a) => a.date))];

  return (
    <ol className="flex flex-col gap-5">
      {days.map((date) => {
        const { day, weekday, month } = dayParts(date);
        return (
          <li key={date} className="grid grid-cols-[4rem_1fr] gap-4">
            <div className="flex flex-col pt-2 leading-tight">
              <span className="num text-xl font-semibold">{day}</span>
              <span className="text-muted-foreground text-xs">
                {weekday} {month}
              </span>
            </div>
            <ul className="flex flex-col border-l pl-4">
              {activity
                .filter((a) => a.date === date)
                .map((a) => {
                  const k = kinds[a.kind];
                  return (
                    <li key={a.key}>
                      <button
                        type="button"
                        disabled={!a.orderbookId}
                        onClick={() => a.orderbookId && focus(a.orderbookId, a.type)}
                        className="enabled:hover:bg-muted/60 focus-visible:bg-muted -ml-2 flex h-10 w-full items-center gap-3 rounded-md px-2 text-left transition-colors outline-none enabled:cursor-pointer"
                      >
                        <span
                          className={cn(
                            "bg-muted grid size-7 shrink-0 place-items-center rounded-full",
                            k.tone,
                          )}
                        >
                          <k.icon className="size-3.5" />
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          <span className="text-muted-foreground">{k.verb}</span>{" "}
                          <span className="font-medium">{a.name}</span>
                        </span>
                        {a.kind === "alert"
                          ? a.level != null && (
                              <span className="num text-muted-foreground text-xs">
                                at {formatPrice(a.level)}
                              </span>
                            )
                          : a.amount != null && (
                              <SignedAmount value={a.amount} className="sensitive text-xs" />
                            )}
                      </button>
                    </li>
                  );
                })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
