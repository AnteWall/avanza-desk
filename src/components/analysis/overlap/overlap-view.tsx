import { OverlapTables } from "@/components/analysis/overlap/overlap-tables";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";

/** Overlap between held funds and ETFs, and companies reached through several holdings. */
export function OverlapView() {
  return (
    <AsyncBoundary what="your holdings" fallback={<TableSkeleton rows={8} columns={4} />}>
      <OverlapTables />
    </AsyncBoundary>
  );
}
