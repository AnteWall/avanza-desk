import { CalendarRange, Coins, Fingerprint, Layers, Receipt, Trophy } from "lucide-react";

import { BenchmarkView } from "@/components/analysis/benchmark/benchmark-view";
import { IncomeView } from "@/components/analysis/income/income-view";
import { OverlapView } from "@/components/analysis/overlap/overlap-view";
import { ProfileView } from "@/components/analysis/profile/profile-view";
import { TaxView } from "@/components/analysis/tax/tax-view";
import { YearsView } from "@/components/analysis/years/years-view";
import { TabbedPanel } from "@/components/workspace/tabbed-panel";
import { m } from "@/lib/i18n";

/** Numbers Avanza doesn't compute: benchmarks, years, income, tax and fees, overlap, habits. */
export function AnalysisPage() {
  return (
    <TabbedPanel
      id="analysis"
      tabs={[
        {
          value: "benchmark",
          label: m.analysis.tabs.benchmark,
          icon: Trophy,
          content: <BenchmarkView />,
        },
        {
          value: "years",
          label: m.analysis.tabs.years,
          icon: CalendarRange,
          content: <YearsView />,
        },
        { value: "income", label: m.analysis.tabs.income, icon: Coins, content: <IncomeView /> },
        { value: "tax", label: m.analysis.tabs.tax, icon: Receipt, content: <TaxView /> },
        {
          value: "overlap",
          label: m.analysis.tabs.overlap,
          icon: Layers,
          content: <OverlapView />,
        },
        {
          value: "profile",
          label: m.analysis.tabs.profile,
          icon: Fingerprint,
          content: <ProfileView />,
        },
      ]}
    />
  );
}
