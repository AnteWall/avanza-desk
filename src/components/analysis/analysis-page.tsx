import { Coins, Layers, Receipt, Scale, Trophy } from "lucide-react";

import { BenchmarkView } from "@/components/analysis/benchmark/benchmark-view";
import { IncomeView } from "@/components/analysis/income/income-view";
import { OverlapView } from "@/components/analysis/overlap/overlap-view";
import { RebalanceView } from "@/components/analysis/rebalance/rebalance-view";
import { TaxView } from "@/components/analysis/tax/tax-view";
import { TabbedPanel } from "@/components/workspace/tabbed-panel";

/** Numbers Avanza doesn't compute: benchmarks, income forecast, tax and fees, overlap, rebalancing. */
export function AnalysisPage() {
  return (
    <TabbedPanel
      id="analysis"
      tabs={[
        { value: "benchmark", label: "Benchmark", icon: Trophy, content: <BenchmarkView /> },
        { value: "income", label: "Income", icon: Coins, content: <IncomeView /> },
        { value: "tax", label: "Tax & fees", icon: Receipt, content: <TaxView /> },
        { value: "overlap", label: "Fund overlap", icon: Layers, content: <OverlapView /> },
        { value: "rebalance", label: "Rebalance", icon: Scale, content: <RebalanceView /> },
      ]}
    />
  );
}
