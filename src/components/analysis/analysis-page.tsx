import { Coins, Fingerprint, Layers, Receipt, Trophy } from "lucide-react";

import { BenchmarkView } from "@/components/analysis/benchmark/benchmark-view";
import { IncomeView } from "@/components/analysis/income/income-view";
import { OverlapView } from "@/components/analysis/overlap/overlap-view";
import { ProfileView } from "@/components/analysis/profile/profile-view";
import { TaxView } from "@/components/analysis/tax/tax-view";
import { TabbedPanel } from "@/components/workspace/tabbed-panel";

/** Numbers Avanza doesn't compute: benchmarks, income, tax and fees, overlap, habits. */
export function AnalysisPage() {
  return (
    <TabbedPanel
      id="analysis"
      tabs={[
        { value: "benchmark", label: "Benchmark", icon: Trophy, content: <BenchmarkView /> },
        { value: "income", label: "Income", icon: Coins, content: <IncomeView /> },
        { value: "tax", label: "Tax & fees", icon: Receipt, content: <TaxView /> },
        { value: "overlap", label: "Fund overlap", icon: Layers, content: <OverlapView /> },
        { value: "profile", label: "Trading profile", icon: Fingerprint, content: <ProfileView /> },
      ]}
    />
  );
}
