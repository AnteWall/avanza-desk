import { AllocationTable } from "@/components/portfolio/allocation/allocation-table";
import { useHoldings } from "@/components/portfolio/use-holdings";
import { slices } from "@/lib/avanza/portfolio";

/** Each holding and cash as it sits in the portfolio, funds not looked through. */
export function HoldingAllocation() {
  const { holdings, cash } = useHoldings({ grouped: true });
  return (
    <AllocationTable
      slices={slices([
        ...holdings.map((h) => ({ key: h.key, name: h.name, code: h.flagCode, value: h.value })),
        { name: "Cash", value: cash },
      ])}
      limit={12}
    />
  );
}
