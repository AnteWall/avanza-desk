import { createFileRoute } from "@tanstack/react-router";

import { RebalancePage } from "@/components/rebalance/rebalance-page";

export const Route = createFileRoute("/rebalance")({
  component: RebalancePage,
});
