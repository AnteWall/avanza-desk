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
  if (!fund) return <Empty>Avanza has no details for this fund.</Empty>;

  // Fees and ratios are percent units.
  const pct = (v: number | null) => (v == null ? "–" : formatShare(v / 100));
  const managers = fund.fundManagers.map((m) => m.name).join(", ");

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b p-3">
        <StatList
          stats={[
            // productFee is Avanza's "total avgift": the yearly ongoing cost, management fee included.
            { label: "Total fee / yr", value: pct(fund.productFee) },
            { label: "Management fee", value: pct(fund.managementFee) },
            // Percent of 10 000 is the fee times 100.
            {
              label: "Per 10 000 kr / yr",
              value: `${formatPrice(fund.productFee * 100)} kr`,
            },
            { label: "Risk", value: `${fund.risk} of 7` },
            { label: "Rating", value: fund.rating == null ? "–" : `${fund.rating} of 5` },
            {
              label: "Sharpe",
              value: fund.sharpeRatio == null ? "–" : formatPrice(fund.sharpeRatio),
            },
            { label: "Std dev", value: pct(fund.standardDeviation) },
            { label: "Fund size", value: `${formatCompact(fund.capital)} ${fund.currency}` },
            { label: "Sustainability", value: fund.sustainabilityRatingCategoryName || "–" },
            { label: "Holdings as of", value: formatDate(fund.portfolioDate) },
          ]}
        />
        <StatList
          stats={[
            { label: "Managers", value: managers || "–", text: true },
            { label: "Benchmark", value: fund.primaryBenchmark || "–", text: true },
            { label: "Horizon", value: fund.recommendedHoldingPeriod || "–", text: true },
            { label: "Started", value: formatDate(fund.startDate) },
            { label: "Pricing", value: fund.pricingFrequency || "–", text: true },
          ]}
        />
        <p className="text-muted-foreground max-w-3xl">
          {[fund.fundTypeName, fund.adminCompany.name, fund.indexFund && "Index fund"]
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
