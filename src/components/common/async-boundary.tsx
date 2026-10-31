import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, type ReactNode } from "react";

import { ErrorBoundary } from "@/components/common/error-boundary";
import { LoadError } from "@/components/common/load-error";

/**
 * Wrap every component that reads data with `useSuspenseQuery`: shows `fallback` while it loads
 * and a LoadError (with retry that refetches the failed queries) if it can't. `resetKey`
 * clears a shown error when it changes, e.g. when another instrument is focused.
 */
export function AsyncBoundary({
  what,
  fallback,
  compact,
  resetKey,
  children,
}: {
  /** Names the data in the error: "Couldn't load {what}". */
  what: string;
  fallback: ReactNode;
  compact?: boolean;
  resetKey?: string;
  children: ReactNode;
}) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          key={resetKey}
          onReset={reset}
          fallback={(error, retry) => (
            <LoadError what={what} error={error} onRetry={retry} compact={compact} />
          )}
        >
          <Suspense fallback={fallback}>{children}</Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
