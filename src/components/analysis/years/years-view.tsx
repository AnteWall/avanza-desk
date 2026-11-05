import { YearsReview } from "@/components/analysis/years/years-review";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { m } from "@/lib/i18n";

/** Year by year: value against deposits, dividends, and each year's numbers. */
export function YearsView() {
  return (
    <AsyncBoundary
      what={m.analysis.years.loading}
      fallback={<TableSkeleton rows={8} columns={5} />}
    >
      <YearsReview />
    </AsyncBoundary>
  );
}
