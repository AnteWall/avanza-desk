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
import { m } from "@/lib/i18n";

const ranges: { label: string; period: PerformancePeriod }[] = [
  { label: m.portfolio.periods.oneMonth, period: "ONE_MONTH" },
  { label: m.portfolio.periods.threeMonths, period: "THREE_MONTHS" },
  { label: m.portfolio.periods.thisYear, period: "THIS_YEAR" },
  { label: m.portfolio.periods.oneYear, period: "ONE_YEAR" },
  { label: m.portfolio.periods.threeYears, period: "THREE_YEARS" },
  { label: m.portfolio.periods.fiveYears, period: "FIVE_YEARS" },
  { label: m.portfolio.periods.all, period: "ALL_TIME" },
];

const modes: { label: string; mode: ChartMode }[] = [
  { label: m.common.return, mode: "return" },
  { label: m.common.value, mode: "value" },
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
          <Segmented
            label={m.portfolio.performance.keyRatio}
            options={keyRatios}
            value={ratio}
            onChange={setRatio}
          />
        ) : (
          <>
            {result(dev)}
            <Segmented
              label={m.portfolio.performance.chart}
              options={modes.map((x) => ({ label: x.label, value: x.mode }))}
              value={mode}
              onChange={setMode}
            />
            <Segmented
              label={m.portfolio.performance.range}
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
          label: m.portfolio.performance.tabs.performance,
          icon: ChartLine,
          content: (
            <div className="h-full p-3">
              <AsyncBoundary
                what={m.portfolio.performance.loading.performance}
                fallback={skeleton}
                resetKey={period}
              >
                <PortfolioChart period={period} mode={mode} />
              </AsyncBoundary>
            </div>
          ),
        },
        {
          value: "today",
          label: m.portfolio.performance.tabs.today,
          icon: Activity,
          content: (
            <AsyncBoundary what={m.portfolio.performance.loading.today} fallback={skeleton}>
              <IntradayChart />
            </AsyncBoundary>
          ),
        },
        {
          value: "ratios",
          label: m.portfolio.performance.tabs.ratios,
          icon: Gauge,
          content: (
            <div className="h-full p-3">
              <AsyncBoundary what={m.portfolio.performance.loading.ratios} fallback={skeleton}>
                <KeyRatioChart ratio={ratio} />
              </AsyncBoundary>
            </div>
          ),
        },
      ]}
    />
  );
}
