import { useSuspenseQueries } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Scale } from "lucide-react";

import { InstrumentLogo } from "@/components/common/instrument-logo";
import { Button } from "@/components/ui/button";
import type { AnswerBlock } from "@/lib/ai/blocks";
import { InstrumentType } from "@/lib/avanza/codes";
import { instrumentQuery } from "@/lib/avanza/queries";
import { formatShare } from "@/lib/format";
import { suggestTargets } from "@/lib/rebalance";

/**
 * Target weights the assistant suggested, with names from Avanza (never the model's), and a
 * button that sets them as the Rebalance page's targets.
 */
export function TargetsCard({ block }: { block: Extract<AnswerBlock, { kind: "targets" }> }) {
  const navigate = useNavigate();
  const instruments = useSuspenseQueries({
    queries: block.targets.map((t) => instrumentQuery(t.orderbookId, t.type)),
  }).map((q) => q.data);
  const sum = block.targets.reduce((s, t) => s + t.target, 0);

  const apply = () => {
    suggestTargets({
      preset: block.targets.map((t, i) => {
        const info = instruments[i]!;
        return {
          orderbookId: t.orderbookId,
          name: info.name,
          type: info.kind === "fund" ? InstrumentType.Fund : (t.type ?? InstrumentType.Stock),
          isin: info.isin,
          currency: info.currency,
        };
      }),
      weights: block.targets.map((t) => t.target),
    });
    void navigate({ to: "/rebalance" });
  };

  return (
    <div className="flex flex-col">
      <ul className="divide-y">
        {block.targets.map((t, i) => (
          <li key={t.orderbookId} className="flex items-center gap-2 px-3 py-1.5">
            <InstrumentLogo isin={instruments[i]!.isin} name={instruments[i]!.name} />
            <span className="min-w-0 flex-1 truncate">{instruments[i]!.name}</span>
            <span className="num font-medium">{formatShare(t.target)}</span>
          </li>
        ))}
      </ul>
      <div className="bg-muted/40 flex items-center gap-2 border-t px-3 py-1.5">
        <span className="text-muted-foreground num text-xs">Total {formatShare(sum)}</span>
        <Button size="xs" className="ml-auto" onClick={apply}>
          <Scale />
          Use as rebalance targets
        </Button>
      </div>
    </div>
  );
}
