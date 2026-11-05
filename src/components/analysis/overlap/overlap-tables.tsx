import type { ReactNode } from "react";

import { PairsTable } from "@/components/analysis/overlap/pairs-table";
import { SharedTable } from "@/components/analysis/overlap/shared-table";
import { Empty } from "@/components/common/empty";
import { useLookThroughs } from "@/components/portfolio/use-holdings";
import { InstrumentType } from "@/lib/avanza/codes";
import { m } from "@/lib/i18n";
import { fundPairs, sharedHoldings, type Source } from "@/lib/overlap";

function Heading({ title, aside }: { title: string; aside: ReactNode }) {
  return (
    <h3 className="bg-muted/40 flex h-8 items-center gap-2 border-y px-3 first:border-t-0">
      <span className="text-xs font-semibold tracking-wider uppercase">{title}</span>
      <span className="text-muted-foreground truncate text-xs">{aside}</span>
    </h3>
  );
}

/** Fund pairs by overlap, then the underlying companies you reach more than once. */
export function OverlapTables() {
  const { holdings, byKey, pending } = useLookThroughs();
  const sources: Source[] = holdings.flatMap((h) => {
    const parts = byKey.get(h.key)?.holdings;
    return parts?.length ? [{ key: h.key, name: h.name, type: h.type, value: h.value, parts }] : [];
  });
  const pairs = fundPairs(sources);
  const shared = sharedHoldings(sources);
  const funds = sources.filter((s) => s.type !== InstrumentType.Stock).length;

  if (funds < 2)
    return <Empty>{pending ? m.analysis.overlap.loadingFunds : m.analysis.overlap.needsTwo}</Empty>;
  return (
    <div className="flex flex-col">
      <Heading title={m.analysis.overlap.pairs} aside={m.analysis.overlap.pairsNote} />
      {pairs.length ? <PairsTable rows={pairs} /> : <Empty>{m.analysis.overlap.noPairs}</Empty>}
      <Heading title={m.analysis.overlap.shared} aside={m.analysis.overlap.sharedNote} />
      {shared.length ? <SharedTable rows={shared} /> : <Empty>{m.analysis.overlap.noShared}</Empty>}
      {pending && (
        <p className="text-muted-foreground p-3 text-xs">{m.analysis.overlap.loadingMore}</p>
      )}
    </div>
  );
}
