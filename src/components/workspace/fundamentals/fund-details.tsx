import { useSuspenseQuery } from "@tanstack/react-query";
import type { FundPortfolioPoint } from "avanza-ts";

import { CountryFlag } from "@/components/common/country-flag";
import { DataTable, dataTableColumns } from "@/components/common/data-table";
import { Empty } from "@/components/common/empty";
import { StatList } from "@/components/workspace/chart/stat-list";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import { InstrumentType } from "@/lib/avanza/codes";
import { instrumentQuery } from "@/lib/avanza/queries";
import { formatCompact, formatDate, formatPrice, formatShare } from "@/lib/format";

const col = dataTableColumns<FundPortfolioPoint>();
const columns = col.columns([
  col.accessor("name", {
    header: "Top holdings",
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <span className="font-medium">{c.getValue()}</span>
        <CountryFlag code={c.row.original.countryCode ?? undefined} />
      </span>
    ),
  }),
  col.accessor("y", {
    header: "Weight",
    // Percent units.
    cell: (c) => formatShare(c.getValue() / 100),
    meta: { align: "end", className: "num font-medium" },
  }),
]);

/** A fund's fees, risk, sustainability, description and top holdings. Suspends. */
export function FundDetails({ orderbookId }: { orderbookId: string }) {
  // The fund guide is already cached by the chart header.
  const { data: instrument } = useSuspenseQuery(instrumentQuery(orderbookId, InstrumentType.Fund));
  const focus = useFocusInstrument();
  const fund = instrument.fund;
  if (!fund) return <Empty>Avanza has no details for this fund.</Empty>;

  // Fees and ratios are percent units.
  const pct = (v: number | null) => (v == null ? "–" : formatShare(v / 100));
  const holdings = [...fund.holdingChartData].sort((a, b) => b.y - a.y);

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 border-b p-3">
        <StatList
          stats={[
            { label: "Fee", value: pct(fund.productFee) },
            { label: "Management fee", value: pct(fund.managementFee) },
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
        <p className="text-muted-foreground max-w-3xl">
          {[fund.fundTypeName, fund.adminCompany.name, fund.indexFund && "Index fund"]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {fund.description && <p className="max-w-3xl leading-relaxed">{fund.description}</p>}
      </div>
      {holdings.length > 0 && (
        <DataTable
          columns={columns}
          data={holdings}
          getRowId={(h) => h.isin ?? h.name}
          onRowClick={(h) => h.orderbookId && focus(h.orderbookId, h.type ?? undefined)}
        />
      )}
    </div>
  );
}
