import { useQuery } from "@tanstack/react-query";
import type { PerformancePeriod } from "avanza-ts";
import { Activity, ChartLine, Gauge } from "lucide-react";
import { useState } from "react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { Change } from "@/components/common/change";
import { Segmented } from "@/components/common/segmented";
import { SignedAmount } from "@/components/common/signed-amount";
import { Skeleton } from "@/components/common/skeleton";
import { useTab } from "@/components/common/use-tab";
import { IntradayChart } from "@/components/portfolio/intraday/intraday-chart";
import { KeyRatioChart, keyRatios, type KeyRatio } from "@/components/portfolio/key-ratio-chart";
import { PortfolioChart, type ChartMode } from "@/components/portfolio/portfolio-chart";
import { TabbedPanel } from "@/components/workspace/tabbed-panel";
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

const tabsId = "portfolio-performance";
const skeleton = <Skeleton className="h-full min-h-32 w-full rounded-md opacity-60" />;

export function PerformancePanel() {
  const [period, setPeriod] = useState<PerformancePeriod>("THIS_YEAR");
  const [mode, setMode] = useState<ChartMode>("return");
  const [ratio, setRatio] = useState<KeyRatio>("sharpeRatios");
  // The selected period's result, in SEK and percent units; missing for periods older than
  // the portfolio.
  const { data: totals } = useQuery(totalValuesQuery);
  const dev = totals?.totalDevelopment[period];

  const today = totals?.totalDevelopment.TODAY;
  const tab = useTab(tabsId);
  const result = (d: typeof dev) =>
    d && (
      <span className="flex items-center gap-2">
        <SignedAmount value={d.absolute.value} className="sensitive text-foreground font-medium" />
        <Change ratio={d.relative.value / 100} />
      </span>
    );

  return (
    <TabbedPanel
      id={tabsId}
      aside={
        tab === "today" ? (
          result(today)
        ) : tab === "ratios" ? (
          <Segmented label="Key ratio" options={keyRatios} value={ratio} onChange={setRatio} />
        ) : (
          <>
            {result(dev)}
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
        )
      }
      tabs={[
        {
          value: "performance",
          label: "Performance",
          icon: ChartLine,
          content: (
            <div className="h-full p-3">
              <AsyncBoundary what="your performance" fallback={skeleton} resetKey={period}>
                <PortfolioChart period={period} mode={mode} />
              </AsyncBoundary>
            </div>
          ),
        },
        {
          value: "today",
          label: "Today",
          icon: Activity,
          content: (
            <AsyncBoundary what="today's development" fallback={skeleton}>
              <IntradayChart />
            </AsyncBoundary>
          ),
        },
        {
          value: "ratios",
          label: "Key ratios",
          icon: Gauge,
          content: (
            <div className="h-full p-3">
              <AsyncBoundary what="your key ratios" fallback={skeleton}>
                <KeyRatioChart ratio={ratio} />
              </AsyncBoundary>
            </div>
          ),
        },
      ]}
    />
  );
}
