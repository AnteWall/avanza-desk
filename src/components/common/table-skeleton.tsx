import { Skeleton } from "@/components/common/skeleton";
import { m } from "@/lib/i18n";

// Varying widths so the placeholder reads as data, not a grid of bars.
const widths = ["w-24", "w-16", "w-20", "w-12", "w-28", "w-14", "w-20", "w-16"];

/** Loading state for a DataTable: a header strip and `rows` dense rows, matching row height. */
export function TableSkeleton({ rows = 8, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div role="status" aria-label={m.common.loading} className="flex flex-col">
      <div className="flex h-8 items-center justify-between gap-4 border-b px-3">
        {Array.from({ length: columns }, (_, c) => (
          <Skeleton key={c} className="h-2.5 w-10 opacity-60" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div
          key={r}
          className="border-border/60 flex h-8 items-center justify-between gap-4 border-b px-3"
        >
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton
              key={c}
              className={c === 0 ? `h-3 ${widths[r % widths.length]}` : "h-3 w-12"}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
