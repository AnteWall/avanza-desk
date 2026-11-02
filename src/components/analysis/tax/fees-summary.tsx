import { useSuspenseQueries } from "@tanstack/react-query";

import { StatList } from "@/components/analysis/stat-list";
import { accountIds } from "@/lib/account";
import { TransactionSide } from "@/lib/avanza/codes";
import { fundAnalysisQuery, totalValuesQuery, transactionFilterQuery } from "@/lib/avanza/queries";
import { formatInteger, formatShare } from "@/lib/format";
import { stockholmDay } from "@/lib/snapshots";

// Avanza's currency exchange fee for most customers; the real one depends on the price class.
const FX_FEE = 0.0025;

/** Courtage, an estimated FX fee and fund fees, in SEK and as a share of the portfolio. */
export function FeesSummary() {
  const today = stockholmDay();
  // Feb 29 has no match a year earlier.
  const yearAgo = `${Number(today.slice(0, 4)) - 1}${today.slice(4).replace("-02-29", "-02-28")}`;
  const [{ data: trades }, { data: funds }, { data: totals }] = useSuspenseQueries({
    queries: [
      transactionFilterQuery({
        from: yearAgo,
        accountIds: accountIds(),
        transactionTypes: [TransactionSide.Buy, TransactionSide.Sell],
      }),
      fundAnalysisQuery,
      totalValuesQuery,
    ],
  });

  let courtage = 0;
  let fx = 0;
  for (const t of trades.transactions) {
    if (t.cancelled) continue;
    courtage += Math.abs(t.commission?.value ?? 0);
    if (t.orderbook && t.orderbook.currency !== "SEK")
      fx += Math.abs(t.amount?.value ?? 0) * FX_FEE;
  }
  // Fees are in percent units; the product fee is the fund's total ongoing charge.
  const fundFees = funds.fundViews.reduce(
    (sum, f) => sum + (f.marketValue * (f.productFee ?? f.managementFee ?? 0)) / 100,
    0,
  );
  const total = courtage + fx + fundFees;
  const value = totals.totalValue.totalValue.value;

  return (
    <div className="flex flex-col gap-3">
      <StatList
        stats={[
          { label: "Courtage", value: formatInteger(courtage), sensitive: true },
          {
            label: "Currency exchange",
            value: formatInteger(fx),
            note: "estimate, 0,25 % of foreign trades",
            sensitive: true,
          },
          {
            label: "Fund fees",
            value: formatInteger(fundFees),
            note: "per year at today's holdings",
            sensitive: true,
          },
          {
            label: "Total",
            value: formatInteger(total),
            note: value > 0 ? `${formatShare(total / value)} of your portfolio` : undefined,
            sensitive: true,
          },
        ]}
      />
    </div>
  );
}
