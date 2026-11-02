import { TableSkeleton } from "@/components/common/table-skeleton";
import { AllocationTable } from "@/components/portfolio/allocation/allocation-table";
import { useLookThroughs } from "@/components/portfolio/use-holdings";
import { lookThrough, unclassified } from "@/lib/avanza/portfolio";

/** Where the money is invested: stocks by listing country, funds and ETFs by their holdings. */
export function CountryAllocation() {
  const { holdings, byKey, pending } = useLookThroughs({ grouped: true });
  if (pending) return <TableSkeleton rows={8} columns={4} />;
  return (
    <AllocationTable
      slices={lookThrough(holdings, (h) => byKey.get(h.key)?.countries)}
      rest={unclassified}
      restNote="cash in funds, or instruments without country data"
    />
  );
}
