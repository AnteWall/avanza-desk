import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { useGroup } from "@/components/portfolio/holdings/use-groups";
import { RebalancePlanner } from "@/components/rebalance/rebalance-planner";

/** The Rebalance page: one centered column that scrolls on its own. */
export function RebalancePage() {
  // Each group keeps its own targets and added instruments: remount to load them.
  const group = useGroup();
  return (
    <div className="bg-background h-full min-h-0 overflow-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-8">
        <AsyncBoundary what="your holdings" fallback={<TableSkeleton rows={8} columns={6} />}>
          <RebalancePlanner key={group?.id ?? "all"} />
        </AsyncBoundary>
      </div>
    </div>
  );
}
