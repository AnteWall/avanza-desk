import { CalendarRange, Coins, Gauge, HandCoins, Layers, Receipt, Wallet } from "lucide-react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { useAccount } from "@/components/layout/use-account";
import { AccountsTable } from "@/components/portfolio/accounts-table";
import { DividendsTable } from "@/components/portfolio/holdings/dividends-table";
import { HoldingsTable } from "@/components/portfolio/holdings/holdings-table";
import { PaidDividendsTable } from "@/components/portfolio/holdings/paid-dividends-table";
import { TransactionsTable } from "@/components/portfolio/holdings/transactions-table";
import { KeyFigures } from "@/components/portfolio/key-figures";
import { YearPanel } from "@/components/portfolio/year-panel";
import { TabbedPanel } from "@/components/workspace/tabbed-panel";

export function HoldingsPanel() {
  const account = useAccount();
  return (
    <TabbedPanel
      id="holdings"
      aside={account.label}
      tabs={[
        {
          value: "holdings",
          label: "Holdings",
          icon: Layers,
          content: (
            <AsyncBoundary what="your holdings" fallback={<TableSkeleton rows={8} columns={9} />}>
              <HoldingsTable />
            </AsyncBoundary>
          ),
        },
        {
          value: "dividends",
          label: "Dividends",
          icon: HandCoins,
          content: (
            <AsyncBoundary what="dividends" fallback={<TableSkeleton rows={6} columns={7} />}>
              <DividendsTable />
            </AsyncBoundary>
          ),
        },
        {
          value: "paid",
          label: "Paid",
          icon: Coins,
          content: (
            <AsyncBoundary what="paid dividends" fallback={<TableSkeleton rows={6} columns={5} />}>
              <PaidDividendsTable />
            </AsyncBoundary>
          ),
        },
        {
          value: "transactions",
          label: "Transactions",
          icon: Receipt,
          content: (
            <AsyncBoundary what="transactions" fallback={<TableSkeleton rows={8} columns={8} />}>
              <TransactionsTable />
            </AsyncBoundary>
          ),
        },
        { value: "year", label: "Year", icon: CalendarRange, content: <YearPanel /> },
        {
          value: "accounts",
          label: "Accounts",
          icon: Wallet,
          content: (
            <AsyncBoundary what="your accounts" fallback={<TableSkeleton rows={4} columns={6} />}>
              <AccountsTable />
            </AsyncBoundary>
          ),
        },
        {
          value: "figures",
          label: "Key figures",
          icon: Gauge,
          content: (
            <AsyncBoundary what="key figures" fallback={<TableSkeleton rows={4} columns={4} />}>
              <KeyFigures />
            </AsyncBoundary>
          ),
        },
      ]}
    />
  );
}
