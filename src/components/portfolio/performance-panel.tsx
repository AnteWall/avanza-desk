import { useQuery } from "@tanstack/react-query";
import type { PerformancePeriod } from "avanza-ts";
import { ChartLine } from "lucide-react";
import { useState } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { Change } from "@/components/common/change";
import { Segmented } from "@/components/common/segmented";
import { SignedAmount } from "@/components/common/signed-amount";
import { Skeleton } from "@/components/common/skeleton";
import { PortfolioChart, type ChartMode } from "@/components/portfolio/portfolio-chart";
import { Panel } from "@/components/workspace/panel";
import { totalValuesQuery } from "@/lib/avanza/queries";

const ranges: { label: string; period: PerformancePeriod }[] = [
  { label: "1M", period: "ONE_MONTH" },
  { label: "3M", period: "THREE_MONTHS" },
  { label: "YTD", period: "THIS_YEAR" },
  { label: "1Y", period: "ONE_YEAR" },
  { label: "3Y", period: "THREE_YEARS" },
  { label: "5Y", period: "FIVE_YEARS" },
  { label: "All", period: "ALL_TIME" },
];

const modes: { label: string; mode: ChartMode }[] = [
  { label: "Return", mode: "return" },
  { label: "Value", mode: "value" },
];

export function PerformancePanel() {
  const [period, setPeriod] = useState<PerformancePeriod>("THIS_YEAR");
  const [mode, setMode] = useState<ChartMode>("return");
  // The selected period's result, in SEK and percent units; missing for periods older than
  // the portfolio.
  const { data: totals } = useQuery(totalValuesQuery);
  const dev = totals?.totalDevelopment[period];

  return (
    <Panel
      title="Performance"
      icon={ChartLine}
      subtitle={
        dev && (
          <span className="flex items-center gap-2">
            <SignedAmount value={dev.absolute.value} className="sensitive font-medium" />
            <Change ratio={dev.relative.value / 100} />
          </span>
        )
      }
      actions={
        <>
          <Segmented
            label="Chart"
            options={modes.map((m) => ({ label: m.label, value: m.mode }))}
            value={mode}
            onChange={setMode}
          />
          <Segmented
            label="Range"
            numeric
            options={ranges.map((r) => ({ label: r.label, value: r.period }))}
            value={period}
            onChange={setPeriod}
          />
        </>
      }
    >
      <div className="h-full p-3">
        <AsyncBoundary
          what="your performance"
          fallback={<Skeleton className="h-full min-h-32 w-full rounded-md opacity-60" />}
          resetKey={period}
        >
          <PortfolioChart period={period} mode={mode} />
        </AsyncBoundary>
      </div>
    </Panel>
  );
}
