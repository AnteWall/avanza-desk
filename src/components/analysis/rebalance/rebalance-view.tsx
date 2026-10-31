import { RebalancePlanner } from "@/components/analysis/rebalance/rebalance-planner";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";

/** Target weights and the trades that reach them. */
export function RebalanceView() {
  return (
    <AsyncBoundary what="your holdings" fallback={<TableSkeleton rows={8} columns={7} />}>
      <RebalancePlanner />
    </AsyncBoundary>
  );
}
