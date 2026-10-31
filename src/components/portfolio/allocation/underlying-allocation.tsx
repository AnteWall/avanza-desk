import { TableSkeleton } from "@/components/common/table-skeleton";
import { AllocationTable } from "@/components/portfolio/allocation/allocation-table";
import { useLookThroughs } from "@/components/portfolio/use-holdings";
import { lookThrough } from "@/lib/avanza/portfolio";

const rest = "Undisclosed";

/**
 * Companies you actually own: direct stocks plus each fund's and ETF's disclosed holdings, merged,
 * so a stock held directly and through three funds shows up once with its full weight.
 */
export function UnderlyingAllocation() {
  const { holdings, byKey, pending } = useLookThroughs();
  if (pending) return <TableSkeleton rows={8} columns={4} />;
  const slices = lookThrough(
    holdings,
    // Instruments we can't look into count as their own holding.
    (h) => byKey.get(h.key)?.holdings ?? [{ name: h.name, key: h.orderbookId ?? h.key, weight: 1 }],
    rest,
  );
  return (
    <AllocationTable
      slices={slices}
      rest={rest}
      restNote="funds only publish their largest holdings"
      limit={40}
    />
  );
}
