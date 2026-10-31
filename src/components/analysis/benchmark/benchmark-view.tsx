import type { InsightsPeriod, PerformancePeriod } from "avanza-ts";
import { useState } from "react";

import { AttributionTable } from "@/components/analysis/benchmark/attribution-table";
import { BenchmarkComparison } from "@/components/analysis/benchmark/benchmark-comparison";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { Segmented } from "@/components/common/segmented";
import { Skeleton } from "@/components/common/skeleton";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { Section } from "@/components/workspace/dossier/section";

const periods: { label: string; value: PerformancePeriod }[] = [
  { label: "1Y", value: "ONE_YEAR" },
  { label: "3Y", value: "THREE_YEARS" },
  { label: "5Y", value: "FIVE_YEARS" },
  { label: "All", value: "ALL_TIME" },
];

const insightPeriods: { label: string; value: InsightsPeriod }[] = [
  { label: "Today", value: "TODAY" },
  { label: "1W", value: "ONE_WEEK" },
  { label: "YTD", value: "THIS_YEAR" },
  { label: "3Y", value: "THREE_YEARS_ROLLING" },
];

/** You against an index and the average Avanza customer, then which holdings made the result. */
export function BenchmarkView() {
  const [period, setPeriod] = useState<PerformancePeriod>("ONE_YEAR");
  const [insights, setInsights] = useState<InsightsPeriod>("THIS_YEAR");
  return (
    <div className="@container flex flex-col divide-y">
      <Section
        title="Versus the market"
        aside={
          <Segmented label="Range" numeric options={periods} value={period} onChange={setPeriod} />
        }
      >
        <AsyncBoundary
          what="the comparison"
          fallback={<Skeleton className="h-72 w-full opacity-60" />}
          resetKey={period}
        >
          <BenchmarkComparison period={period} />
        </AsyncBoundary>
      </Section>
      <Section
        title="What drove it"
        aside={
          <Segmented
            label="Attribution period"
            options={insightPeriods}
            value={insights}
            onChange={setInsights}
          />
        }
        flush
      >
        <AsyncBoundary
          what="your result per holding"
          fallback={<TableSkeleton rows={6} columns={5} />}
          resetKey={insights}
        >
          <AttributionTable period={insights} />
        </AsyncBoundary>
      </Section>
    </div>
  );
}
