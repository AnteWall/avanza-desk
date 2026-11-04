import { useSuspenseQuery } from "@tanstack/react-query";
import type { ChartPeriod } from "avanza-ts";

import { AskMenu } from "@/components/ai/ask-menu";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { Skeleton } from "@/components/common/skeleton";
import { FundChart } from "@/components/workspace/chart/fund-chart";
import { FundHeader } from "@/components/workspace/chart/fund-header";
import { ListedChart } from "@/components/workspace/chart/listed-chart";
import { ListedHeader } from "@/components/workspace/chart/listed-header";
import type { Focus } from "@/components/workspace/use-focused-instrument";
import { instrumentItem } from "@/lib/ai/context";
import { InstrumentType } from "@/lib/avanza/codes";
import { instrumentQuery } from "@/lib/avanza/queries";

export const headerSkeleton = (
  <div className="flex items-center gap-3">
    <Skeleton className="size-11 rounded-lg" />
    <div className="flex flex-col gap-2">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="h-7 w-32" />
    </div>
  </div>
);

const plotSkeleton = <Skeleton className="h-full min-h-32 w-full rounded-md opacity-60" />;

/** Header and plot for the focused instrument, picking fund or listed views by its type. */
export function ChartBody({ focus, period }: { focus: Focus; period: ChartPeriod }) {
  const { data: instrument } = useSuspenseQuery(instrumentQuery(focus.id, focus.type));
  const fund = instrument.kind === "fund";
  // Funds are priced once a day, so an intraday view is meaningless.
  const fundPeriod = period === "today" ? "one_month" : period;

  return (
    <div className="flex h-full flex-col gap-4 p-3">
      {/* Right-click the header for the instrument's menu: basket, alerts, the assistant. */}
      <AskMenu
        item={instrumentItem(
          instrument.orderbookId,
          instrument.name,
          fund ? InstrumentType.Fund : focus.type,
          instrument.isin ?? undefined,
        )}
        trigger={
          <div>
            <AsyncBoundary what="the quote" fallback={headerSkeleton} compact resetKey={focus.id}>
              {fund ? (
                <FundHeader instrument={instrument} />
              ) : (
                <ListedHeader instrument={instrument} />
              )}
            </AsyncBoundary>
          </div>
        }
      />
      <div className="min-h-0 flex-1">
        <AsyncBoundary what="the chart" fallback={plotSkeleton} resetKey={`${focus.id}:${period}`}>
          {fund ? (
            <FundChart instrument={instrument} period={fundPeriod} />
          ) : (
            <ListedChart instrument={instrument} period={period} />
          )}
        </AsyncBoundary>
      </div>
    </div>
  );
}
