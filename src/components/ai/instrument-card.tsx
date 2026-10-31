import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";

import { Change } from "@/components/common/change";
import { InstrumentLogo } from "@/components/common/instrument-logo";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import type { AnswerBlock } from "@/lib/ai/blocks";
import { instrumentQuery, quoteQuery } from "@/lib/avanza/queries";
import { formatPrice } from "@/lib/format";

/**
 * An instrument the assistant pointed at, as a compact card with its live price; clicking
 * opens it in the workspace. Funds have no live quote, so they show without a price.
 */
export function InstrumentCard({ block }: { block: Extract<AnswerBlock, { kind: "instrument" }> }) {
  const focus = useFocusInstrument();
  const { data: instrument } = useSuspenseQuery(instrumentQuery(block.orderbookId, block.type));
  const listed = instrument.kind === "listed";
  const { data: quote } = useQuery({
    ...quoteQuery(block.orderbookId),
    enabled: listed,
  });

  return (
    <button
      type="button"
      onClick={() => focus(block.orderbookId, block.type)}
      className="hover:bg-muted/40 focus-visible:ring-ring/50 group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors outline-none focus-visible:ring-3"
    >
      <InstrumentLogo isin={instrument.isin} name={instrument.name} className="size-8" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{instrument.name}</span>
        <span className="text-muted-foreground truncate text-xs">
          {[instrument.marketPlaceName, instrument.sector, instrument.currency]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      {quote?.last != null && (
        <span className="flex flex-col items-end">
          <span className="num font-medium">
            {formatPrice(quote.last)}{" "}
            <span className="text-muted-foreground text-xs">{instrument.currency}</span>
          </span>
          {quote.changePercent != null && (
            <Change ratio={quote.changePercent / 100} className="text-xs" />
          )}
        </span>
      )}
      <ArrowUpRight
        className="text-muted-foreground size-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </button>
  );
}
