import { YearsReview } from "@/components/analysis/years/years-review";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";

/** Year by year: value against deposits, dividends, and each year's numbers. */
export function YearsView() {
  return (
    <AsyncBoundary what="your years" fallback={<TableSkeleton rows={8} columns={5} />}>
      <YearsReview />
    </AsyncBoundary>
  );
}
