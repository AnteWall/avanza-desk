import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { TrendingDown, TrendingUp } from "lucide-react";

import { Change } from "@/components/common/change";
import { dailyPerformance } from "@/lib/avanza/portfolio";
import { positionsQuery } from "@/lib/avanza/queries";
import { sessionLabel } from "@/lib/exchanges";
import { formatPrice } from "@/lib/format";

/**
 * Your portfolio: total value including cash, as on the portfolio page, then the last trading day's change in SEK and %, labelled with
 * that day ("Friday" over a weekend). Suspends while loading.
 */
export function DailyPerformance() {
  const { data, dataUpdatedAt } = useSuspenseQuery(positionsQuery);
  const { value, change, ratio, cash } = dailyPerformance(data);
  const Icon = change < 0 ? TrendingDown : TrendingUp;
  const session = sessionLabel(new Date(dataUpdatedAt));

  return (
    <div
      className="flex items-center gap-2.5 whitespace-nowrap"
      title={`Your portfolio's change ${session === "Today" ? "today" : `on the last trading day (${session})`}`}
    >
      <span className="flex flex-col leading-tight">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          Portfolio
        </span>
        <span className="num sensitive font-semibold">{formatPrice(value + cash)} SEK</span>
      </span>
      <span className="bg-border h-6 w-px" />
      <span
        className={cn(
          "grid size-6 place-items-center rounded-md",
          change > 0 && "bg-up/15 text-up",
          change < 0 && "bg-down/15 text-down",
          change === 0 && "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
          {session}
        </span>
        <span className="num flex items-baseline gap-1.5 font-semibold">
          <span className={cn("sensitive", change > 0 && "text-up", change < 0 && "text-down")}>
            {change > 0 && "+"}
            {formatPrice(change)} SEK
          </span>
          <Change ratio={ratio} className="text-xs" />
        </span>
      </span>
    </div>
  );
}
