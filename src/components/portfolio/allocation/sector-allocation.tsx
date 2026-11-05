import { TableSkeleton } from "@/components/common/table-skeleton";
import { AllocationTable } from "@/components/portfolio/allocation/allocation-table";
import { useLookThroughs } from "@/components/portfolio/use-holdings";
import { lookThrough, unclassified } from "@/lib/avanza/portfolio";
import { m } from "@/lib/i18n";

/** Industry exposure: stocks by Avanza sector, funds and ETFs by their reported sectors. */
export function SectorAllocation() {
  const { holdings, byKey, pending } = useLookThroughs({ grouped: true });
  if (pending) return <TableSkeleton rows={8} columns={4} />;
  // shortcut: names are shown as each source sends them (Avanza stock sectors vs fund
  // reports), so one industry can appear twice; add a mapping table if that gets noisy.
  return (
    <AllocationTable
      slices={lookThrough(holdings, (h) => byKey.get(h.key)?.sectors)}
      rest={unclassified}
      restNote={m.portfolio.allocation.sectorNote}
    />
  );
}
