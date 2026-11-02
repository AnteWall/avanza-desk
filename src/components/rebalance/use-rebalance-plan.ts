import { useQueries, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useGroup } from "@/components/portfolio/holdings/use-groups";
import { useHoldings } from "@/components/portfolio/use-holdings";
import { InstrumentType } from "@/lib/avanza/codes";
import { exchangeRatesQuery, quoteQuery } from "@/lib/avanza/queries";
import {
  addedKey,
  defaultOptions,
  optionsKey,
  rebalance,
  targetsKey,
  type AddedInstrument,
  type Order,
} from "@/lib/rebalance";
import { getSetting, saveSetting } from "@/lib/settings";

type Targets = Record<string, number>;

/** One instrument in the plan: a holding, or one added to buy (`remove` set). */
export type RebalanceRow = {
  key: string;
  orderbookId?: string;
  name: string;
  type: string;
  isin?: string;
  value: number;
  /** Accounts holding it, where a sell comes from; empty for an added instrument. */
  accounts: string[];
  /** Share of the total now and the one wanted, 0…1. */
  weight: number;
  target: number;
  order: Order | null;
  setTarget: (target: number) => void;
  remove?: () => void;
};

/**
 * The rebalance plan: your holdings (in the picked group) plus instruments you added to buy,
 * each with a saved target share and the trade that reaches it. Targets and added instruments
 * are saved per group. Suspends while holdings load.
 */
export function useRebalancePlan() {
  const { holdings } = useHoldings({ grouped: true });
  const group = useGroup();
  const suffix = group ? `:${group.id}` : "";
  const [targets, setTargets] = useState(() => getSetting<Targets>(targetsKey + suffix, {}));
  const [added, setAdded] = useState(() => getSetting<AddedInstrument[]>(addedKey + suffix, []));
  const [newMoney, setNewMoney] = useState(0);
  const [buyOnly, setBuyOnly] = useState(false);
  const [options, setOptions] = useState(() => getSetting(optionsKey, defaultOptions));

  const held = holdings.filter((h) => h.value > 0);
  // Once bought, an added instrument shows up as a holding instead.
  const toBuy = added.filter((a) => !held.some((h) => h.key === a.orderbookId));
  const prices = useBuyPrices(toBuy);

  const saveTargets = (next: Targets) => {
    setTargets(next);
    void saveSetting(targetsKey + suffix, next);
  };
  const saveAdded = (next: AddedInstrument[]) => {
    setAdded(next);
    void saveSetting(addedKey + suffix, next);
  };

  const total = held.reduce((s, h) => s + h.value, 0);
  const items = [
    ...held.map((h) => ({
      ...h,
      weight: total ? h.value / total : 0,
      price: h.type === InstrumentType.Fund || !h.volume ? null : h.value / h.volume,
      remove: undefined,
    })),
    ...toBuy.map((a, i) => ({
      ...a,
      key: a.orderbookId,
      value: 0,
      accounts: [],
      weight: 0,
      price: a.type === InstrumentType.Fund ? null : prices[i]!,
      remove: () => {
        saveAdded(added.filter((x) => x !== a));
        const { [a.orderbookId]: _, ...rest } = targets;
        saveTargets(rest);
      },
    })),
  ];
  // A target not set yet is today's weight: nothing to trade until you change it.
  const withTargets = items.map((it) => ({ ...it, target: targets[it.key] ?? it.weight }));
  const orders = rebalance(withTargets, { ...options, newMoney, buyOnly });
  const rows: RebalanceRow[] = withTargets.map((it, i) => ({
    ...it,
    order: orders[i]!,
    setTarget: (t) => saveTargets({ ...targets, [it.key]: t }),
  }));

  const targetSum = withTargets.reduce((s, it) => s + it.target, 0);
  return {
    group,
    rows,
    newMoney,
    setNewMoney,
    buyOnly,
    setBuyOnly,
    ...options,
    /** Change the tolerance or minimum order; saved for every group. */
    setOption: (change: Partial<typeof defaultOptions>) => {
      const next = { ...options, ...change };
      setOptions(next);
      void saveSetting(optionsKey, next);
    },
    targetSum,
    inPlan: new Set(items.map((it) => it.key)),
    add: (a: AddedInstrument) => saveAdded([...added, a]),
    /** Replace every target; `{}` puts them back to today's weights. */
    setTargets: saveTargets,
    /**
     * Follow a model portfolio: add what you don't hold, `weights` (equal by default) for it,
     * 0 for the rest.
     */
    applyPreset: (preset: readonly AddedInstrument[], weights?: readonly number[]) => {
      const inPlan = new Set(items.map((it) => it.key));
      saveAdded([...added, ...preset.filter((p) => !inPlan.has(p.orderbookId))]);
      saveTargets(
        Object.fromEntries([
          ...items.map((it) => [it.key, 0]),
          ...preset.map((p, i) => [p.orderbookId, weights?.[i] ?? 1 / preset.length]),
        ]),
      );
    },
    equalTargets: () =>
      saveTargets(Object.fromEntries(items.map((it) => [it.key, 1 / items.length]))),
    /** Scale every target by the same factor so they sum to 100 %. */
    normalizeTargets: () =>
      saveTargets(
        Object.fromEntries(withTargets.map((it) => [it.key, it.target / (targetSum || 1)])),
      ),
  };
}

/**
 * Last price in SEK of each instrument to buy, or null while it loads (it then trades in SEK).
 * Foreign prices use Avanza's rate for buying the currency.
 */
function useBuyPrices(instruments: readonly AddedInstrument[]) {
  const quotes = useQueries({
    queries: instruments.map((a) => ({
      ...quoteQuery(a.orderbookId),
      enabled: a.type !== InstrumentType.Fund,
    })),
  });
  const foreign = instruments.some((a) => a.currency !== "SEK");
  const { data: rates } = useQuery({ ...exchangeRatesQuery, enabled: foreign });
  return instruments.map((a, i) => {
    const last = quotes[i]?.data?.last;
    // Avanza sends rates as Swedish decimal strings.
    const rate =
      a.currency === "SEK"
        ? 1
        : Number(rates?.find((r) => r.currency === a.currency)?.buyPrice.replace(",", "."));
    return last && rate ? last * rate : null;
  });
}
