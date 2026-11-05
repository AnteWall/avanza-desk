import { IncomeForecast } from "@/components/analysis/income/income-forecast";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { m } from "@/lib/i18n";

/** Dividend income forecast by month and per holding. */
export function IncomeView() {
  return (
    <AsyncBoundary
      what={m.analysis.income.loading}
      fallback={<TableSkeleton rows={8} columns={6} />}
    >
      <IncomeForecast />
    </AsyncBoundary>
  );
}
