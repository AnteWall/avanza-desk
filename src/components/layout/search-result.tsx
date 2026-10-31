import { useQuery } from "@tanstack/react-query";
import type { SearchHit } from "avanza-ts";
import { cn } from "cn";

import { CountryFlag } from "@/components/common/country-flag";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { instrumentQuery } from "@/lib/avanza/queries";

// Search hits carry no ISIN; the cached instrument lookup supplies it (and pre-warms the chart).
export function SearchResult({ hit, active }: { hit: SearchHit; active: boolean }) {
  const { data: instrument, isPending } = useQuery({
    ...instrumentQuery(hit.orderBookId ?? "", hit.type),
    enabled: !!hit.orderBookId,
  });
  const change = hit.price?.todayChangePercent;
  const direction = hit.price?.todayChangeDirection ?? 0;
  const sector = hit.stockSectors[0]?.name;

  return (
    <span className={cn("flex items-center gap-2.5 rounded-md px-2 py-1.5", active && "bg-accent")}>
      <InstrumentLogo
        isin={instrument?.isin}
        pending={isPending && !!hit.orderBookId}
        name={hit.title}
        className="size-7 rounded-md"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-medium">{hit.title}</span>
          <CountryFlag code={hit.flagCode} />
        </span>
        <span className="text-muted-foreground truncate text-xs">
          {[hit.marketPlaceName, sector].filter(Boolean).join(" · ")}
        </span>
      </span>
      {hit.price?.last && (
        <span className="flex flex-col items-end">
          <span className="num">
            {hit.price.last}
            <span className="text-muted-foreground"> {hit.price.currency}</span>
          </span>
          {change && (
            <span
              className={cn(
                "num text-xs",
                direction > 0 && "text-up",
                direction < 0 && "text-down",
                direction === 0 && "text-muted-foreground",
              )}
            >
              {change.includes("%") ? change : `${change} %`}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
