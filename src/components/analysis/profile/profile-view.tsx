import { TradingProfile } from "@/components/analysis/profile/trading-profile";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { Skeleton } from "@/components/common/skeleton";

/** Habits in your own buy and sell history. */
export function ProfileView() {
  return (
    <div className="@container h-full">
      <AsyncBoundary what="your trades" fallback={<Skeleton className="h-24 w-full opacity-60" />}>
        <TradingProfile />
      </AsyncBoundary>
    </div>
  );
}
