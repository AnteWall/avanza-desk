import { cn } from "cn";
import { CloudAlert, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { errorMessage } from "@/lib/avanza/error-message";
import { m } from "@/lib/i18n";

/** What a component shows instead of its data when loading failed: what, why, and a retry. */
export function LoadError({
  what,
  error,
  onRetry,
  compact,
}: {
  what: string;
  error: unknown;
  onRetry: () => void;
  compact?: boolean;
}) {
  const message = errorMessage(error);
  if (compact)
    return (
      <button
        type="button"
        onClick={onRetry}
        title={m.common.loadError.clickToRetry(message)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs"
      >
        <CloudAlert className="text-down size-3.5" />
        {m.common.loadError.title(what)}
        <RotateCw className="size-3" />
      </button>
    );
  return (
    <div
      role="alert"
      className={cn(
        "flex h-full min-h-28 flex-col items-center justify-center gap-2 p-4 text-center",
      )}
    >
      <span className="bg-down/10 text-down grid size-9 place-items-center rounded-full">
        <CloudAlert className="size-4.5" />
      </span>
      <p className="font-medium">{m.common.loadError.title(what)}</p>
      <p className="text-muted-foreground max-w-64 text-xs">{message}</p>
      <Button variant="outline" size="xs" onClick={onRetry} className="mt-1">
        <RotateCw />
        {m.common.retry}
      </Button>
    </div>
  );
}
