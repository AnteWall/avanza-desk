import type { Alert, DealItem, OrderItem } from "avanza-ts";

import { toAlertRow, toDealRow, toOrderRow } from "./loose-records";

test("reads an order in the web app's shape, with a partial fill", () => {
  const order = {
    id: "x",
    orderId: "123",
    side: "buy",
    price: 101.5,
    volume: 4,
    originalVolume: 10,
    state: "ACTIVE",
    created: "2026-10-30T08:00:00Z",
    validUntil: "2026-11-30",
    orderbook: { id: "5247", name: "Investor B", currency: "SEK", type: "STOCK" },
    account: { name: "ISK", urlParameterId: "a" },
  } as unknown as OrderItem;
  expect(toOrderRow(order)).toMatchObject({
    id: "123",
    orderbookId: "5247",
    name: "Investor B",
    side: "BUY",
    price: 101.5,
    volume: 10,
    filled: 6,
    account: "ISK",
    validUntil: "2026-11-30",
  });
});

test("falls back to flat fields and unwraps { value } numbers", () => {
  const deal = {
    id: "d1",
    orderbookId: "5247",
    instrumentName: "Investor B",
    side: "SELL",
    price: { value: 99, unit: "SEK" },
    volume: "3",
    dealTime: "2026-10-30T09:00:00Z",
    account: {},
  } as unknown as DealItem;
  expect(toDealRow(deal)).toMatchObject({
    id: "d1",
    orderbookId: "5247",
    name: "Investor B",
    side: "SELL",
    price: 99,
    volume: 3,
  });
});

test("missing fields stay undefined instead of throwing", () => {
  const row = toOrderRow({ id: "1", account: {} } as OrderItem);
  expect(row).toMatchObject({ id: "1", name: "–" });
  expect(row.filled).toBeUndefined();
  const alert = toAlertRow({ messageTypes: ["PUSH", "EMAIL"] } as Alert, 2);
  expect(alert).toMatchObject({ id: "alert-2", channels: "push, email" });
});
