import { RebalancePlanner } from "@/components/analysis/rebalance/rebalance-planner";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { useGroup } from "@/components/portfolio/holdings/use-groups";

/** Target weights and the trades that reach them. */
export function RebalanceView() {
  // Each group keeps its own targets: remount to load them.
  const group = useGroup();
  return (
    <AsyncBoundary what="your holdings" fallback={<TableSkeleton rows={8} columns={7} />}>
      <RebalancePlanner key={group?.id ?? "all"} />
    </AsyncBoundary>
  );
}
