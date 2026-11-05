import { useSuspenseQuery } from "@tanstack/react-query";
import type { FundPortfolioPoint } from "avanza-ts";

import { Empty } from "@/components/common/empty";
import { StatList } from "@/components/workspace/chart/stat-list";
import {
  type ExposureRow,
  ExposureTables,
} from "@/components/workspace/fundamentals/exposure-tables";
import { InstrumentType } from "@/lib/avanza/codes";
import { instrumentQuery } from "@/lib/avanza/queries";
import { formatCompact, formatDate, formatPrice, formatShare } from "@/lib/format";
import { m } from "@/lib/i18n";

// Fund guide breakdowns are percent units.
const rows = (points: readonly FundPortfolioPoint[]): ExposureRow[] =>
  points.map((p) => ({
    name: p.name,
    weight: p.y / 100,
    countryCode: p.countryCode ?? undefined,
    orderbookId: p.orderbookId ?? undefined,
    type: p.type ?? undefined,
  }));

/**
 * A fund's costs, risk, management, sustainability, description, and what it holds: top
 * holdings, countries and sectors. Suspends.
 */
export function FundDetails({ orderbookId }: { orderbookId: string }) {
  // The fund guide is already cached by the chart header.
  const { data: instrument } = useSuspenseQuery(instrumentQuery(orderbookId, InstrumentType.Fund));
  const fund = instrument.fund;
  if (!fund) return <Empty>{m.workspace.fund.empty}</Empty>;

  // Fees and ratios are percent units.
  const pct = (v: number | null) => (v == null ? "–" : formatShare(v / 100));
  const managers = fund.fundManagers.map((manager) => manager.name).join(", ");

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b p-3">
        <StatList
          stats={[
            // productFee is Avanza's "total avgift": the yearly ongoing cost, management fee included.
            { label: m.workspace.fund.totalFee, value: pct(fund.productFee) },
            { label: m.workspace.fund.managementFee, value: pct(fund.managementFee) },
            // Percent of 10 000 is the fee times 100.
            {
              label: m.workspace.fund.per10k,
              value: `${formatPrice(fund.productFee * 100)} kr`,
            },
            { label: m.workspace.fund.risk, value: m.workspace.fund.outOf(fund.risk, 7) },
            {
              label: m.workspace.fund.rating,
              value: fund.rating == null ? "–" : m.workspace.fund.outOf(fund.rating, 5),
            },
            {
              label: "Sharpe",
              value: fund.sharpeRatio == null ? "–" : formatPrice(fund.sharpeRatio),
            },
            { label: m.workspace.fund.stdDev, value: pct(fund.standardDeviation) },
            {
              label: m.workspace.fund.size,
              value: `${formatCompact(fund.capital)} ${fund.currency}`,
            },
            {
              label: m.workspace.fund.sustainability,
              value: fund.sustainabilityRatingCategoryName || "–",
            },
            { label: m.workspace.fund.holdingsAsOf, value: formatDate(fund.portfolioDate) },
          ]}
        />
        <StatList
          stats={[
            { label: m.workspace.fund.managers, value: managers || "–", text: true },
            { label: m.workspace.fund.benchmark, value: fund.primaryBenchmark || "–", text: true },
            {
              label: m.workspace.fund.horizon,
              value: fund.recommendedHoldingPeriod || "–",
              text: true,
            },
            { label: m.workspace.fund.started, value: formatDate(fund.startDate) },
            { label: m.workspace.fund.pricing, value: fund.pricingFrequency || "–", text: true },
          ]}
        />
        <p className="text-muted-foreground max-w-3xl">
          {[fund.fundTypeName, fund.adminCompany.name, fund.indexFund && m.workspace.fund.indexFund]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {fund.description && <p className="max-w-3xl leading-relaxed">{fund.description}</p>}
      </div>
      <ExposureTables
        holdings={rows(fund.holdingChartData)}
        countries={rows(fund.countryChartData)}
        sectors={rows(fund.sectorChartData)}
      />
    </div>
  );
}
