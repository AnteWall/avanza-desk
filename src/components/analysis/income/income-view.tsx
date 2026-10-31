import { IncomeForecast } from "@/components/analysis/income/income-forecast";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { TableSkeleton } from "@/components/common/table-skeleton";

/** Dividend income forecast by month and per holding. */
export function IncomeView() {
  return (
    <AsyncBoundary what="your dividends" fallback={<TableSkeleton rows={8} columns={6} />}>
      <IncomeForecast />
    </AsyncBoundary>
  );
}
