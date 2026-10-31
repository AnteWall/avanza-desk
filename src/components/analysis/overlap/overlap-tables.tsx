import type { ReactNode } from "react";

import { PairsTable } from "@/components/analysis/overlap/pairs-table";
import { SharedTable } from "@/components/analysis/overlap/shared-table";
import { Empty } from "@/components/common/empty";
import { useLookThroughs } from "@/components/portfolio/use-holdings";
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
  const funds = sources.filter((s) => s.type !== "STOCK").length;

  if (funds < 2)
    return (
      <Empty>
        {pending
          ? "Loading fund holdings…"
          : "Overlap needs at least two funds or ETFs with disclosed holdings."}
      </Empty>
    );
  return (
    <div className="flex flex-col">
      <Heading
        title="Fund pairs"
        aside="Funds disclose only their largest holdings, so overlap is a lower bound."
      />
      {pairs.length ? (
        <PairsTable rows={pairs} />
      ) : (
        <Empty>Your funds share no disclosed holdings.</Empty>
      )}
      <Heading title="Shared holdings" aside="Companies you own through two or more holdings" />
      {shared.length ? (
        <SharedTable rows={shared} />
      ) : (
        <Empty>No company appears in more than one holding.</Empty>
      )}
      {pending && <p className="text-muted-foreground p-3 text-xs">Loading more fund holdings…</p>}
    </div>
  );
}
