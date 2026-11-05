import { ChevronRight, CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";

import { toolActivity } from "@/lib/ai/tools";
import { m } from "@/lib/i18n";

const pretty = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
};

/**
 * One step of Claude's work, as a quiet line above the answer: "Reading your holdings…" while
 * it runs, "Read your holdings" after. Expands to the exact input and result, so you can check
 * where the numbers came from.
 */
export function ToolCall({
  name,
  input,
  output,
  failed,
}: {
  name: string;
  input: unknown;
  output: unknown;
  failed: boolean;
}) {
  const running = output === undefined && !failed;
  const hasInput = !!input && typeof input === "object" && Object.keys(input).length > 0;

  if (running) {
    return (
      <p className="flex items-center gap-2 text-xs" role="status">
        <LoaderCircle
          className="text-muted-foreground size-3.5 motion-safe:animate-spin"
          aria-hidden
        />
        <span className="motion-safe:text-shimmer motion-safe:animate-shimmer text-muted-foreground">
          {toolActivity(name, input)}…
        </span>
      </p>
    );
  }

  return (
    <details className="group text-xs">
      <summary className="text-muted-foreground hover:text-foreground flex w-fit cursor-default list-none items-center gap-2 transition-colors [&::-webkit-details-marker]:hidden">
        {failed ? (
          <TriangleAlert className="text-warning size-3.5" aria-label={m.ai.tool.failed} />
        ) : (
          <CircleCheck className="size-3.5" aria-hidden />
        )}
        {failed ? m.ai.tool.failedStep(toolActivity(name, input)) : toolActivity(name, input, true)}
        <ChevronRight className="size-3 transition-transform group-open:rotate-90" aria-hidden />
      </summary>
      <div className="mt-1.5 mb-1 ml-1.5 flex flex-col gap-1.5 border-l pl-3.5">
        <span className="text-muted-foreground num">{name}</span>
        {hasInput && (
          <pre className="num bg-muted/40 overflow-x-auto rounded-md p-1.5">{pretty(input)}</pre>
        )}
        {/* `sensitive`: results hold your amounts. */}
        <pre className="num bg-muted/40 sensitive max-h-60 overflow-auto rounded-md p-1.5">
          {pretty(output ?? m.ai.tool.noResult)}
        </pre>
      </div>
    </details>
  );
}
