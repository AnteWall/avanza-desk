import {
  CalendarRange,
  Folder,
  Coins,
  Gauge,
  HandCoins,
  Layers,
  Receipt,
  Wallet,
} from "lucide-react";

import { AsyncBoundary } from "@/components/common/async-boundary";
import { ColumnsMenu } from "@/components/common/columns-menu";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { useTab } from "@/components/common/use-tab";
import { useAccount } from "@/components/layout/use-account";
import { AccountsTable } from "@/components/portfolio/accounts-table";
import { DividendsTable } from "@/components/portfolio/holdings/dividends-table";
import { HoldingsTable } from "@/components/portfolio/holdings/holdings-table";
import { PaidDividendsTable } from "@/components/portfolio/holdings/paid-dividends-table";
import { TransactionsTable } from "@/components/portfolio/holdings/transactions-table";
import { useGroup } from "@/components/portfolio/holdings/use-groups";
import { KeyFigures } from "@/components/portfolio/key-figures";
import { YearPanel } from "@/components/portfolio/year-panel";
import { TabbedPanel } from "@/components/workspace/tabbed-panel";
import { holdingsColumns } from "@/lib/holdings-columns";
import { m } from "@/lib/i18n";

export function HoldingsPanel() {
  const account = useAccount();
  const group = useGroup();
  const tab = useTab("holdings");
  return (
    <TabbedPanel
      id="holdings"
      aside={
        <>
          {group && (
            <span className="text-brand flex min-w-0 items-center gap-1">
              <Folder className="size-3 shrink-0" />
              <span className="truncate">{group.name}</span>
            </span>
          )}
          {account.label}
          {/* The holdings tab's optional columns; the other tabs ignore it. */}
          {(!tab || tab === "holdings") && <ColumnsMenu picks={holdingsColumns} />}
        </>
      }
      tabs={[
        {
          value: "holdings",
          label: m.portfolio.holdings.tabs.holdings,
          icon: Layers,
          content: (
            <AsyncBoundary
              what={m.portfolio.holdings.loading.holdings}
              fallback={<TableSkeleton rows={8} columns={9} />}
            >
              <HoldingsTable />
            </AsyncBoundary>
          ),
        },
        {
          value: "dividends",
          label: m.portfolio.holdings.tabs.dividends,
          icon: HandCoins,
          content: (
            <AsyncBoundary
              what={m.portfolio.holdings.loading.dividends}
              fallback={<TableSkeleton rows={6} columns={7} />}
            >
              <DividendsTable />
            </AsyncBoundary>
          ),
        },
        {
          value: "paid",
          label: m.portfolio.holdings.tabs.paid,
          icon: Coins,
          content: (
            <AsyncBoundary
              what={m.portfolio.holdings.loading.paid}
              fallback={<TableSkeleton rows={6} columns={5} />}
            >
              <PaidDividendsTable />
            </AsyncBoundary>
          ),
        },
        {
          value: "transactions",
          label: m.portfolio.holdings.tabs.transactions,
          icon: Receipt,
          content: (
            <AsyncBoundary
              what={m.portfolio.holdings.loading.transactions}
              fallback={<TableSkeleton rows={8} columns={8} />}
            >
              <TransactionsTable />
            </AsyncBoundary>
          ),
        },
        {
          value: "year",
          label: m.portfolio.holdings.tabs.year,
          icon: CalendarRange,
          content: <YearPanel />,
        },
        {
          value: "accounts",
          label: m.portfolio.holdings.tabs.accounts,
          icon: Wallet,
          content: (
            <AsyncBoundary
              what={m.portfolio.holdings.loading.accounts}
              fallback={<TableSkeleton rows={4} columns={6} />}
            >
              <AccountsTable />
            </AsyncBoundary>
          ),
        },
        {
          value: "figures",
          label: m.portfolio.holdings.tabs.figures,
          icon: Gauge,
          content: (
            <AsyncBoundary
              what={m.portfolio.holdings.loading.figures}
              fallback={<TableSkeleton rows={4} columns={4} />}
            >
              <KeyFigures />
            </AsyncBoundary>
          ),
        },
      ]}
    />
  );
}
