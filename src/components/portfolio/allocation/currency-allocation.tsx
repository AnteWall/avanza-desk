import { useQuery } from "@tanstack/react-query";

import { TableSkeleton } from "@/components/common/table-skeleton";
import { AllocationTable } from "@/components/portfolio/allocation/allocation-table";
import { useHoldings } from "@/components/portfolio/use-holdings";
import { fractions, lookThrough, unclassified, type Holding } from "@/lib/avanza/portfolio";
import { fundAnalysisQuery } from "@/lib/avanza/queries";

/** Currency exposure including cash: funds looked through, everything else by trading currency. */
export function CurrencyAllocation() {
  const { holdings, cash } = useHoldings();
  // Decoration: without it funds count as unclassified rather than failing the tab.
  const funds = useQuery(fundAnalysisQuery);

  if (funds.isPending) return <TableSkeleton rows={4} columns={4} />;
  // Fund guides have no currency split, so funds share Avanza's analysis of all your funds.
  const fundCurrencies = fractions(
    funds.data?.currencyChartData.map((e) => ({ name: e.name, weight: e.y })) ?? [],
  );
  // shortcut: cash counts as SEK (Avanza reports it converted); split it by currencyBalances
  // if foreign cash matters.
  const withCash = [...holdings, { type: "CASH", currency: "SEK", value: cash } as Holding];
  return (
    <AllocationTable
      slices={lookThrough(withCash, (h) =>
        h.type === "FUND" ? fundCurrencies : [{ name: h.currency, weight: 1 }],
      )}
      rest={unclassified}
    />
  );
}
