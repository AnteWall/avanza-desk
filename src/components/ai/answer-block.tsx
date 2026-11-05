import { BarChart3 } from "lucide-react";

import { AnswerChart } from "@/components/ai/answer-chart";
import { InstrumentCard } from "@/components/ai/instrument-card";
import { TargetsCard } from "@/components/ai/targets-card";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { Skeleton } from "@/components/common/skeleton";
import { parseBlock } from "@/lib/ai/blocks";
import { m } from "@/lib/i18n";

const placeholders: Record<string, string> = {
  chart: m.ai.block.chart,
  targets: m.ai.block.targets,
};
const names: Record<string, string> = {
  instrument: m.ai.block.whatInstrument,
  targets: m.ai.block.whatTargets,
};

/**
 * A ```chart or ```instrument block in an answer, drawn live. Until its JSON is complete
 * (while the answer streams) it shows a placeholder instead of raw code.
 */
export function AnswerBlockView({ language, code }: { language: string; code: string }) {
  const block = parseBlock(language, code);
  if (!block) {
    return (
      <p className="text-muted-foreground flex items-center gap-2 rounded-md border border-dashed px-3 py-2 text-xs">
        <BarChart3 className="size-3.5" aria-hidden />
        {placeholders[language] ?? m.ai.block.instrument}
      </p>
    );
  }
  return (
    <div className="not-prose overflow-hidden rounded-md border">
      <AsyncBoundary
        what={names[block.kind] ?? m.ai.block.whatChart}
        fallback={
          <Skeleton
            className={block.kind === "price" || block.kind === "portfolio" ? "h-52" : "h-12"}
          />
        }
        compact
      >
        {block.kind === "instrument" ? (
          <InstrumentCard block={block} />
        ) : block.kind === "targets" ? (
          <TargetsCard block={block} />
        ) : (
          <AnswerChart block={block} />
        )}
      </AsyncBoundary>
    </div>
  );
}
