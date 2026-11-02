import type { CreditInfo } from "avanza-ts";

import { InstrumentType } from "@/lib/avanza/codes";
import type { Holding } from "@/lib/avanza/portfolio";
import { formatPercent, formatPrice, formatShare, formatSignedShare } from "@/lib/format";
import { getSetting, onRemoteSetting, saveSetting } from "@/lib/settings";
import type { Signal, SignalKind } from "@/lib/signals";

// AvanzaDesk's own alert rules, checked locally (RuleWatcher) because Avanza's alerts only
// watch prices. A rule watches one instrument (`target`) or everything it applies to.
// Thresholds are entered in percent (drift: its weight minus its target), except `signal`,
// which is a signal score, and `price`, a price level in the instrument's currency.

export type RuleKind =
  | "price"
  | "day-move"
  | "loss"
  | "weight"
  | "drift"
  | "ltv"
  | "short"
  | "upside"
  | "signal";

export type RuleTarget = { id: string; name: string; type?: string };

export type AlertRule = {
  id: string;
  kind: RuleKind;
  threshold: number;
  /** yyyy-MM-dd; signal rules ignore signals dated before it. */
  created: string;
  /** One instrument (orderbook id, or holding key for unlisted holdings); none = all. */
  target?: RuleTarget;
  /** Signal rules only: one kind of signal; none = any. */
  signalKind?: SignalKind;
  /** Price rules only: notify when the last price is at or above (default) or at or below. */
  direction?: "above" | "below";
};

/** What a rule kind applies to: your holdings, stocks (held or watched), or credit accounts. */
export type RuleScope = "holdings" | "stocks" | "accounts";

type KindInfo = {
  label: string;
  /** One line for the kind picker: what it watches and why you'd want it. */
  explain: string;
  scope: RuleScope;
  unit: "%" | "score" | "price";
  presets: number[];
};

export const ruleKinds: Record<RuleKind, KindInfo> = {
  price: {
    label: "Price level",
    explain: "The price rises to or falls to a level you pick, e.g. a breakout or a stop.",
    scope: "stocks",
    unit: "price",
    // Offsets from the current price; the form turns them into levels.
    presets: [-10, -5, 5, 10],
  },
  "day-move": {
    label: "Big day move",
    explain: "A stock or holding moves sharply up or down during the day.",
    scope: "stocks",
    unit: "%",
    presets: [3, 5, 10],
  },
  signal: {
    label: "New signal",
    explain: "Insider trades, short interest, owner or analyst changes, upcoming reports.",
    scope: "stocks",
    unit: "score",
    presets: [1, 2, 3],
  },
  short: {
    label: "Short interest",
    explain: "The share of a stock that is sold short goes above a level.",
    scope: "stocks",
    unit: "%",
    presets: [3, 5, 10],
  },
  upside: {
    label: "Analyst upside",
    explain: "The average analyst price target is far enough above the price.",
    scope: "stocks",
    unit: "%",
    presets: [15, 25, 40],
  },
  loss: {
    label: "Loss from cost",
    explain: "A holding is down from what you paid for it.",
    scope: "holdings",
    unit: "%",
    presets: [10, 20, 30],
  },
  weight: {
    label: "Too large a share",
    explain: "A holding grows past a share of your portfolio.",
    scope: "holdings",
    unit: "%",
    presets: [10, 15, 25],
  },
  drift: {
    label: "Rebalance drift",
    explain: "A holding drifts from its target weight on the Rebalance page.",
    scope: "holdings",
    unit: "%",
    presets: [2, 5, 10],
  },
  ltv: {
    label: "Loan-to-value",
    explain: "Borrowing on a credit account gets close to the margin limit.",
    scope: "accounts",
    unit: "%",
    presets: [30, 40, 50],
  },
};

/** Labels for the signal kinds a signal rule can narrow to. */
export const signalKindLabels: Record<SignalKind, string> = {
  insider: "Insider trades",
  short: "Short interest",
  owners: "Avanza owners",
  target: "Price target",
  consensus: "Analyst consensus",
  report: "Upcoming report",
};

const num = (n: number) => String(n).replace(".", ",");

/** The rule as one plain sentence, e.g. "Volvo B moves 5 % or more in a day". */
export function describeRule(
  r: Pick<AlertRule, "kind" | "threshold" | "target" | "signalKind" | "direction">,
) {
  const t = num(r.threshold);
  const name = r.target?.name;
  switch (r.kind) {
    case "price":
      return `${name ?? "The stock"} ${r.direction === "below" ? "falls to" : "rises to"} ${formatPrice(r.threshold)} or ${r.direction === "below" ? "lower" : "higher"}`;
    case "day-move":
      return `${name ?? "Any holding"} moves ${t} % or more in a day`;
    case "loss":
      return `${name ?? "Any holding"} is down ${t} % or more from what you paid`;
    case "weight":
      return `${name ?? "Any holding"} grows past ${t} % of your portfolio`;
    case "drift":
      return `${name ?? "Any holding"} drifts ${t} % or more from its rebalance target`;
    case "ltv":
      return `Loan-to-value on a credit account goes over ${t} %`;
    case "short":
      return `Short interest in ${name ?? "a held stock"} goes over ${t} %`;
    case "upside":
      return `Analysts see ${t} % or more upside in ${name ?? "a held stock"}`;
    case "signal": {
      const what = r.signalKind ? signalKindLabels[r.signalKind].toLowerCase() : "any";
      return `${name ?? "A held stock"} gets a signal (${what}) scoring ${t} or more`;
    }
  }
}

/** Live facts about one stock that stock rules compare against. Ratios, not percent units. */
export type StockFacts = {
  name: string;
  held: boolean;
  dayChange?: number;
  /** Last price, in the instrument's currency. */
  last?: number;
  short?: number;
  upside?: number;
};

export type RuleState = {
  holdings: readonly Holding[];
  /** Loan-to-value per credit account, a ratio (`ltvRatio`). */
  ltv: readonly { accountId: string; value: number }[];
  /** Facts per orderbook id, for targeted stocks and held stocks. */
  stocks: ReadonlyMap<string, StockFacts>;
  /** Rebalance target weights (0…1) by holding key. */
  targets: Readonly<Record<string, number>>;
  signals: readonly (Signal & { name: string; held: boolean })[];
  /** The trading day day changes refer to (`sessionLabel`): "Today", "Yesterday", "Friday"… */
  session: string;
};

/** One thing a rule looks at, with its current value: a ratio, or a score for signals. */
export type Measure = { key: string; name: string; value: number; fires: boolean; text: string };

const isTarget = (r: AlertRule, h: Holding) =>
  !r.target || r.target.id === h.key || r.target.id === h.orderbookId;

/**
 * `currentLtv` as a ratio. Its unit is undocumented, so it's read in whichever unit lands
 * nearer the account's own credit / collateral: a size guess would take 120 % (1.2) for 1.2 %.
 */
export function ltvRatio(c: CreditInfo) {
  const collateral = c.currentTotalPotentialCollateralValue;
  const rough = collateral > 0 ? Math.abs(c.currentUsedCredit) / collateral : undefined;
  const percent =
    rough === undefined
      ? c.currentLtv > 1
      : Math.abs(c.currentLtv / 100 - rough) < Math.abs(c.currentLtv - rough);
  return percent ? c.currentLtv / 100 : c.currentLtv;
}

/** What each subject of `r` stands at now, and whether it crosses the threshold. */
export function measure(r: AlertRule, s: RuleState): Measure[] {
  const t = r.kind === "signal" || r.kind === "price" ? r.threshold : r.threshold / 100;
  const holdings = s.holdings.filter((h) => isTarget(r, h));
  const total = s.holdings.reduce((sum, h) => sum + h.value, 0);
  const out: Measure[] = [];
  const push = (key: string, name: string, value: number, fires: boolean, text: string) =>
    out.push({ key: `${r.id}:${key}`, name, value, fires, text });

  // A stock rule on one stock reads its facts; without a target it covers held stocks.
  const stocks = [...s.stocks].filter(([id, f]) => (r.target ? r.target.id === id : f.held));

  // Day changes are the last trading day's; only a session running today can notify.
  const live = s.session === "Today";
  const when = live ? "today" : s.session === "Yesterday" ? "yesterday" : `on ${s.session}`;

  switch (r.kind) {
    case "price":
      for (const [id, f] of stocks)
        if (f.last != null) {
          const hit = r.direction === "below" ? f.last <= t : f.last >= t;
          push(id, f.name, f.last, hit, `Last ${formatPrice(f.last)}`);
        }
      break;
    case "day-move":
      if (r.target && s.stocks.get(r.target.id)?.dayChange != null) {
        const v = s.stocks.get(r.target.id)!.dayChange!;
        push(
          r.target.id,
          r.target.name,
          v,
          live && Math.abs(v) >= t,
          `${formatPercent(v)} ${when}`,
        );
      } else
        for (const h of holdings) {
          const yesterday = h.value - h.today;
          if (yesterday <= 0) continue;
          const v = h.today / yesterday;
          push(h.key, h.name, v, live && Math.abs(v) >= t, `${formatPercent(v)} ${when}`);
        }
      break;
    case "loss":
      for (const h of holdings)
        if (h.cost > 0) {
          const v = h.profit / h.cost;
          push(h.key, h.name, v, -v >= t, `${formatPercent(v)} from cost`);
        }
      break;
    case "weight":
      for (const h of holdings)
        if (total > 0) {
          const v = h.value / total;
          push(h.key, h.name, v, v > t, `${formatShare(v)} of the portfolio`);
        }
      break;
    case "drift":
      for (const h of holdings) {
        const target = s.targets[h.key];
        if (target == null || total <= 0) continue;
        const v = h.value / total - target;
        push(h.key, h.name, v, Math.abs(v) >= t, `${formatSignedShare(v)} from target`);
      }
      break;
    case "ltv":
      for (const c of s.ltv)
        push(
          c.accountId,
          "Credit account",
          c.value,
          c.value > t,
          `Loan-to-value ${formatShare(c.value)}`,
        );
      break;
    case "short":
      for (const [id, f] of stocks)
        if (f.short != null)
          push(id, f.name, f.short, f.short > t, `Short interest ${formatShare(f.short)}`);
      break;
    case "upside":
      for (const [id, f] of stocks)
        if (f.upside != null)
          push(id, f.name, f.upside, f.upside >= t, `${formatPercent(f.upside)} to target`);
      break;
    case "signal":
      for (const sig of s.signals) {
        if (r.target ? sig.orderbookId !== r.target.id : !sig.held) continue;
        if (r.signalKind && sig.kind !== r.signalKind) continue;
        // Only signals dated after the rule exists, so adding it doesn't replay the backlog.
        const fresh = sig.date >= r.created;
        push(
          `${sig.orderbookId}:${sig.kind}:${sig.date}`,
          sig.name,
          sig.score,
          fresh && sig.score >= t,
          sig.text,
        );
      }
      break;
  }
  return out;
}

export type Firing = {
  key: string;
  /** Signals fire once ever; conditions once per day while they hold. */
  once: boolean;
  title: string;
  body: string;
};

/** Every rule that holds right now. Pure: deduplication against what fired is `unfired`. */
export function evaluateRules(rules: readonly AlertRule[], state: RuleState): Firing[] {
  return rules.flatMap((r) =>
    measure(r, state)
      .filter((m) => m.fires)
      .map((m) => ({
        key: m.key,
        once: r.kind === "signal",
        title: `${m.name}: ${m.text}`,
        body: describeRule(r),
      })),
  );
}

/**
 * Rules worth adding, from your own numbers: your largest holding, your credit, held stocks
 * with heavy short interest, saved rebalance targets. Skips what an existing rule already covers.
 */
export function suggestRules(
  state: RuleState,
  rules: readonly AlertRule[],
): Omit<AlertRule, "id" | "created">[] {
  const has = (kind: RuleKind, targetId?: string) =>
    rules.some((r) => r.kind === kind && (r.target?.id === targetId || !r.target));
  const out: Omit<AlertRule, "id" | "created">[] = [];
  const roundUp = (v: number, step: number) => Math.ceil(v / step) * step;

  if (!has("signal") && [...state.stocks.values()].some((f) => f.held))
    out.push({ kind: "signal", threshold: 2 });
  if (!has("day-move") && state.holdings.length) out.push({ kind: "day-move", threshold: 5 });

  const total = state.holdings.reduce((sum, h) => sum + h.value, 0);
  const top = state.holdings[0];
  if (top && total > 0 && top.value / total >= 0.1 && !has("weight", top.orderbookId ?? top.key))
    out.push({
      kind: "weight",
      threshold: roundUp((top.value / total) * 100 + 5, 5),
      target: { id: top.orderbookId ?? top.key, name: top.name, type: top.type },
    });

  const ltv = Math.max(0, ...state.ltv.map((c) => c.value));
  if (state.ltv.length && !has("ltv"))
    out.push({ kind: "ltv", threshold: roundUp(ltv * 100 + 10, 10) });

  for (const [id, f] of state.stocks)
    if (f.held && f.short != null && f.short >= 0.03 && !has("short", id))
      out.push({
        kind: "short",
        threshold: roundUp(f.short * 100 + 2, 1),
        target: { id, name: f.name, type: InstrumentType.Stock },
      });

  if (Object.keys(state.targets).length && !has("drift")) out.push({ kind: "drift", threshold: 5 });
  return out.slice(0, 5);
}

/** Fired keys → the day they fired. */
export type Fired = Record<string, string>;

/**
 * The firings not yet announced, and the updated record. Conditions re-fire on a new day;
 * signals never. Entries older than 60 days are dropped so the record stays small.
 */
export function unfired(firings: readonly Firing[], fired: Fired, day: string) {
  const cutoff = new Date(Date.parse(day) - 60 * 24 * 60 * 60_000).toISOString().slice(0, 10);
  const next: Fired = Object.fromEntries(Object.entries(fired).filter(([, d]) => d >= cutoff));
  const fresh = firings.filter((f) => (f.once ? !(f.key in next) : next[f.key] !== day));
  for (const f of fresh) next[f.key] = day;
  return { fresh, next };
}

// The rules themselves: a setting with listeners, so the watcher follows edits live.
const KEY = "alert-rules";
const listeners = new Set<() => void>();

// One empty array: useSyncExternalStore needs a stable snapshot or it re-renders forever.
const none: AlertRule[] = [];
export const getRules = () => getSetting<AlertRule[]>(KEY, none);

export function setRules(rules: AlertRule[]) {
  void saveSetting(KEY, rules);
  for (const l of listeners) l();
}

/** Adds the rule, or replaces the one with the same id (an edit). */
export const saveRule = (rule: AlertRule) => {
  const rules = getRules();
  setRules(
    rules.some((r) => r.id === rule.id)
      ? rules.map((r) => (r.id === rule.id ? rule : r))
      : [...rules, rule],
  );
};

export const removeRule = (id: string) => setRules(getRules().filter((r) => r.id !== id));

export function subscribeRules(listener: () => void) {
  listeners.add(listener);
  // Rules made in a pop-out window reach the watcher in the main one.
  const off = onRemoteSetting(KEY, listener);
  return () => {
    listeners.delete(listener);
    off();
  };
}

export const getFired = () => getSetting<Fired>(`${KEY}:fired`, {});
export const setFired = (fired: Fired) => saveSetting(`${KEY}:fired`, fired);
