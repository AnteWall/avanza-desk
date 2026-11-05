import { AllocationTable } from "@/components/portfolio/allocation/allocation-table";
import { useHoldings } from "@/components/portfolio/use-holdings";
import { slices, typeLabel } from "@/lib/avanza/portfolio";
import { m } from "@/lib/i18n";

/** Asset classes including cash. */
export function TypeAllocation() {
  const { holdings, cash } = useHoldings({ grouped: true });
  return (
    <AllocationTable
      slices={slices([
        ...holdings.map((h) => ({ name: typeLabel(h.type), value: h.value })),
        { name: m.common.cash, value: cash },
      ])}
    />
  );
}
