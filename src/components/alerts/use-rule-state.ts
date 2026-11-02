import { useQueries, useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useMemo } from "react";

import { useSignals } from "@/components/signals/use-signals";
import {
  ltvRatio,
  ruleKinds,
  type AlertRule,
  type RuleState,
  type StockFacts,
} from "@/lib/alert-rules";
import { aggregateHoldings } from "@/lib/avanza/portfolio";
import {
  allPositionsQuery,
  creditInfoQuery,
  fundamentalsQuery,
  quoteQuery,
  universeQuery,
} from "@/lib/avanza/queries";
import type { UniverseStock } from "@/lib/avanza/universe";
import { sessionLabel } from "@/lib/exchanges";
import { targetsKey } from "@/lib/rebalance";
import { refreshEvery } from "@/lib/refresh-intervals";
import { getSetting } from "@/lib/settings";
import { latestShort } from "@/lib/signals";

type Wanted = Pick<AlertRule, "kind" | "target">;

// Module scope keeps it stable, so TanStack only recombines when a result changes.
const dataOf = <T>(results: UseQueryResult<T>[]) => results.map((r) => r.data);

/**
 * The live numbers `rules` compare against (src/lib/alert-rules.ts). Only fetches what those
 * rules need: positions always, credit for loan-to-value, fundamentals and quotes for stock
 * rules (their target, or every held stock), signals for signal rules. Shared by the watcher
 * and the rule dialog's "now" preview.
 */
export function useRuleState(rules: readonly Wanted[]) {
  const needs = (...kinds: string[]) => rules.some((r) => kinds.includes(r.kind));
  const stockRule =
    needs("signal", "short", "upside", "price") ||
    rules.some((r) => r.kind === "day-move" && r.target);
  const { data: positions, dataUpdatedAt } = useQuery({
    ...allPositionsQuery,
    enabled: rules.length > 0,
    refetchInterval: refreshEvery("positions"),
  });
  const { data: credit } = useQuery({
    ...creditInfoQuery,
    enabled: needs("ltv"),
    refetchInterval: 5 * 60_000,
  });
  const { data: universe } = useQuery({ ...universeQuery, enabled: stockRule });

  // Stocks to read facts for: every rule's target, plus held stocks for untargeted ones.
  const stocks = useMemo(() => {
    const byId = new Map<string, UniverseStock>();
    const known = new Map((universe ?? []).map((s) => [s.orderbookId, s]));
    for (const r of rules) {
      if (ruleKinds[r.kind].scope !== "stocks") continue;
      if (r.target) {
        const s = known.get(r.target.id);
        byId.set(
          r.target.id,
          s ?? {
            orderbookId: r.target.id,
            name: r.target.name,
            currency: "",
            held: false,
            watched: false,
            value: 0,
          },
        );
      } else for (const s of universe ?? []) if (s.held) byId.set(s.orderbookId, s);
    }
    return [...byId.values()];
  }, [rules, universe]);

  const factsWanted = needs("short", "upside");
  const fundamentals = useQueries({
    queries: stocks.map((s) => ({ ...fundamentalsQuery(s.orderbookId), enabled: factsWanted })),
    combine: dataOf,
  });
  const quotes = useQueries({
    queries: stocks.map((s) => ({
      ...quoteQuery(s.orderbookId),
      enabled: needs("upside", "day-move", "price"),
    })),
    combine: dataOf,
  });
  const { signals } = useSignals(stocks, needs("signal"));
  const targets = getSetting<Record<string, number>>(targetsKey, {});

  return useMemo((): RuleState | undefined => {
    if (!positions) return undefined;
    const facts = new Map<string, StockFacts>();
    stocks.forEach((s, i) => {
      const f = fundamentals[i];
      const q = quotes[i];
      const target = f?.targets?.numberOfEstimates ? f.targets.averagePriceTarget : undefined;
      facts.set(s.orderbookId, {
        name: s.name,
        held: s.held,
        // Avanza sends the quote's change in percent units.
        dayChange: q?.changePercent != null ? q.changePercent / 100 : undefined,
        last: q?.last ?? undefined,
        short: f?.shorts ? latestShort(f.shorts.shortSellingHistory) : undefined,
        upside: target && q?.last ? target / q.last - 1 : undefined,
      });
    });
    return {
      holdings: aggregateHoldings(positions),
      ltv: (credit?.creditInfos ?? [])
        .filter((c) => c.creditLimit > 0)
        .map((c) => ({ accountId: c.accountId, value: ltvRatio(c) })),
      stocks: facts,
      targets,
      signals: signals.map((s) => ({ ...s, name: s.stock.name, held: s.stock.held })),
      // When positions were read: the day changes are as of then.
      session: sessionLabel(new Date(dataUpdatedAt)),
    };
  }, [positions, dataUpdatedAt, credit, stocks, fundamentals, quotes, signals, targets]);
}
