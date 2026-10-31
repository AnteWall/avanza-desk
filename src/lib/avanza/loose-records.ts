import type { Alert, DealItem, OrderItem, StopLoss } from "avanza-ts";

// avanza-ts types orders, deals and alerts as loose records: no response with items was ever
// captured. These read the field names Avanza's web app uses, trying the known alternatives, so
// a renamed field shows "–" instead of breaking the table.
// shortcut: field names are best guesses; pin them down once a real response is captured.

type Loose = Readonly<Record<string, unknown>>;

const lastCaptured = new Map<string, string>();
/**
 * Dev builds log each loose response to the console when it changes ("[avanza raw] orders"),
 * so a real one can be copied into a test fixture and these field guesses pinned down.
 */
export function captureRaw<T>(label: string) {
  return (data: T): T => {
    if (!import.meta.env.DEV) return data;
    const json = JSON.stringify(data);
    if (lastCaptured.get(label) !== json) {
      lastCaptured.set(label, json);
      console.info(`[avanza raw] ${label}`, json);
    }
    return data;
  };
}

/** First of `paths` (dot-separated) that holds a value of the wanted type. */
function field<T extends "string" | "number">(
  record: Loose,
  kind: T,
  ...paths: string[]
): (T extends "string" ? string : number) | undefined {
  for (const path of paths) {
    let value: unknown = record;
    for (const key of path.split(".")) value = (value as Loose | undefined)?.[key];
    // Avanza wraps many numbers as { value, unit }.
    if (kind === "number" && typeof value === "object" && value !== null)
      value = (value as Loose).value;
    if (kind === "number" && typeof value === "string" && value.trim() !== "")
      value = Number(value);
    if (typeof value === kind && !(kind === "number" && Number.isNaN(value)))
      return value as T extends "string" ? string : number;
  }
  return undefined;
}

export type OrderRow = {
  id: string;
  orderbookId?: string;
  type?: string;
  name: string;
  side?: string;
  price?: number;
  volume?: number;
  /** For orders: how much of `volume` has filled. */
  filled?: number;
  currency?: string;
  state?: string;
  account?: string;
  accountId?: string;
  time?: string;
  validUntil?: string;
};

function common(item: Loose, id: string): OrderRow {
  return {
    id,
    orderbookId: field(item, "string", "orderbook.id", "orderbookId", "orderBookId"),
    type: field(item, "string", "orderbook.type", "orderbook.instrumentType", "instrumentType"),
    name: field(item, "string", "orderbook.name", "orderbookName", "instrumentName", "name") ?? "–",
    side: field(item, "string", "side", "orderType", "type")?.toUpperCase(),
    price: field(item, "number", "price", "priceInTradedCurrency", "limitPrice"),
    currency: field(item, "string", "orderbook.currency", "currency"),
    account: field(item, "string", "account.name", "accountName", "account.type"),
    accountId: field(item, "string", "account.id", "account.accountId", "accountId"),
  };
}

export function toOrderRow(order: OrderItem): OrderRow {
  const volume = field(order, "number", "originalVolume", "volume", "amount");
  const open = field(order, "number", "volume", "remainingVolume");
  return {
    ...common(order, field(order, "string", "orderId", "id") ?? order.id),
    volume,
    filled: volume != null && open != null && open <= volume ? volume - open : undefined,
    state: field(order, "string", "state", "status", "statusDescription"),
    time: field(order, "string", "created", "createdAt", "orderDateTime", "modified"),
    validUntil: field(order, "string", "validUntil", "validDate"),
  };
}

export function toDealRow(deal: DealItem): OrderRow {
  return {
    ...common(deal, field(deal, "string", "dealId", "id") ?? deal.id),
    volume: field(deal, "number", "volume", "amount"),
    time: field(deal, "string", "dealTime", "time", "tradeTime", "created"),
  };
}

export type StopLossRow = {
  id: string;
  accountId?: string;
  orderbookId?: string;
  name: string;
  status?: string;
  /** Trigger, e.g. "≤ 95,00" or "−5 %"; percentage triggers are trailing. */
  trigger?: { type: string; value: number; percent: boolean };
  order?: { side: string; price: number; percent: boolean; volume: number };
  validUntil?: string;
};

export function toStopLossRow(s: StopLoss): StopLossRow {
  return {
    id: s.id,
    accountId: s.account.id,
    orderbookId: s.orderbook?.id,
    name: s.orderbook?.name ?? "–",
    status: s.status ?? undefined,
    trigger: s.trigger
      ? {
          type: s.trigger.type,
          value: s.trigger.value,
          percent: s.trigger.valueType === "PERCENTAGE",
        }
      : undefined,
    order: s.order
      ? {
          side: s.order.type.toUpperCase(),
          price: s.order.price,
          percent: s.order.priceType === "PERCENTAGE",
          volume: s.order.volume,
        }
      : undefined,
    validUntil: s.trigger?.validUntil ?? undefined,
  };
}

export type AlertRow = {
  id: string;
  orderbookId?: string;
  type?: string;
  name: string;
  /** What fires it: "Above 120,00", "+5 %", or the alert's own description. */
  direction?: string;
  value?: number;
  channels: string;
  validUntil?: string;
  triggered?: string;
};

export function toAlertRow(alert: Alert, index: number): AlertRow {
  const orderbookId = field(alert, "string", "orderbook.id", "orderbookId", "orderBookId");
  return {
    id: field(alert, "string", "id", "alertId") ?? `${orderbookId ?? "alert"}-${index}`,
    orderbookId,
    type: field(alert, "string", "orderbook.type", "orderbook.instrumentType", "instrumentType"),
    name: field(alert, "string", "orderbook.name", "orderbookName", "name", "title") ?? "–",
    direction: field(alert, "string", "direction", "condition", "alertType", "type"),
    value: field(alert, "number", "price", "triggerValue", "value", "percent", "percentage"),
    channels: alert.messageTypes.map((t) => t.toLowerCase()).join(", "),
    validUntil: field(alert, "string", "validUntil", "validDate", "expires"),
    triggered: field(alert, "string", "triggeredDate", "triggered", "triggeredAt"),
  };
}
