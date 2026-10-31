import { BarChart3 } from "lucide-react";

import { AnswerChart } from "@/components/ai/answer-chart";
import { InstrumentCard } from "@/components/ai/instrument-card";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { Skeleton } from "@/components/common/skeleton";
import { parseBlock } from "@/lib/ai/blocks";

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
        {language === "chart" ? "Drawing a chart…" : "Adding an instrument…"}
      </p>
    );
  }
  return (
    <div className="not-prose overflow-hidden rounded-md border">
      <AsyncBoundary
        what={block.kind === "instrument" ? "the instrument" : "the chart"}
        fallback={<Skeleton className={block.kind === "instrument" ? "h-12" : "h-52"} />}
        compact
      >
        {block.kind === "instrument" ? (
          <InstrumentCard block={block} />
        ) : (
          <AnswerChart block={block} />
        )}
      </AsyncBoundary>
    </div>
  );
}
