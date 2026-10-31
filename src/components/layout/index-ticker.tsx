import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";

import { CountryFlag } from "@/components/common/country-flag";
import { headerIndicesQuery } from "@/lib/avanza/queries";

/** Major indices with today's change. Suspends while loading. */
export function IndexTicker() {
  const { data } = useSuspenseQuery(headerIndicesQuery);
  return (
    <>
      {data.indexes.map((index) => (
        <div key={index.link.orderbookId} className="flex items-baseline gap-2 whitespace-nowrap">
          <CountryFlag code={index.link.flagCode} className="self-center" />
          <span className="text-muted-foreground">{index.link.shortLinkDisplay}</span>
          {/* Avanza sends today's change preformatted. */}
          <span
            className={cn(
              "num",
              index.todayChangeDirection > 0 && "text-up",
              index.todayChangeDirection < 0 && "text-down",
            )}
          >
            {index.quoteChangeToday}
          </span>
        </div>
      ))}
    </>
  );
}
