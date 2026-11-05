import type { InsightsPeriod, PerformancePeriod } from "avanza-ts";
import { useState } from "react";

import { AttributionTable } from "@/components/analysis/benchmark/attribution-table";
import { BenchmarkComparison } from "@/components/analysis/benchmark/benchmark-comparison";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { Segmented } from "@/components/common/segmented";
import { Skeleton } from "@/components/common/skeleton";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { Section } from "@/components/workspace/dossier/section";
import { m } from "@/lib/i18n";

const periods: { label: string; value: PerformancePeriod }[] = [
  { label: m.portfolio.periods.oneYear, value: "ONE_YEAR" },
  { label: m.portfolio.periods.threeYears, value: "THREE_YEARS" },
  { label: m.portfolio.periods.fiveYears, value: "FIVE_YEARS" },
  { label: m.portfolio.periods.all, value: "ALL_TIME" },
];

const insightPeriods: { label: string; value: InsightsPeriod }[] = [
  { label: m.portfolio.periods.today, value: "TODAY" },
  { label: m.portfolio.periods.oneWeek, value: "ONE_WEEK" },
  { label: m.portfolio.periods.thisYear, value: "THIS_YEAR" },
  { label: m.portfolio.periods.threeYears, value: "THREE_YEARS_ROLLING" },
];

/** You against an index and the average Avanza customer, then which holdings made the result. */
export function BenchmarkView() {
  const [period, setPeriod] = useState<PerformancePeriod>("ONE_YEAR");
  const [insights, setInsights] = useState<InsightsPeriod>("THIS_YEAR");
  return (
    <div className="@container flex flex-col divide-y">
      <Section
        title={m.analysis.benchmark.versus}
        aside={
          <Segmented
            label={m.analysis.benchmark.range}
            numeric
            options={periods}
            value={period}
            onChange={setPeriod}
          />
        }
      >
        <AsyncBoundary
          what={m.analysis.benchmark.loading.comparison}
          fallback={<Skeleton className="h-72 w-full opacity-60" />}
          resetKey={period}
        >
          <BenchmarkComparison period={period} />
        </AsyncBoundary>
      </Section>
      <Section
        title={m.analysis.benchmark.drivers}
        aside={
          <Segmented
            label={m.analysis.benchmark.attributionPeriod}
            options={insightPeriods}
            value={insights}
            onChange={setInsights}
          />
        }
        flush
      >
        <AsyncBoundary
          what={m.analysis.benchmark.loading.attribution}
          fallback={<TableSkeleton rows={6} columns={5} />}
          resetKey={insights}
        >
          <AttributionTable period={insights} />
        </AsyncBoundary>
      </Section>
    </div>
  );
}
