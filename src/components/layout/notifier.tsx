import { useQuery } from "@tanstack/react-query";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { useEffect, useRef } from "react";

import { toAlertRow, toDealRow, toStopLossRow } from "@/lib/avanza/loose-records";
import { alertsQuery, dealsQuery, stopLossesQuery } from "@/lib/avanza/queries";
import { formatInteger, formatPrice } from "@/lib/format";
import { newKeys } from "@/lib/new-keys";
import { getNotifications } from "@/lib/notifications";
import { getPrivacy } from "@/lib/privacy";

let permission: Promise<boolean> | undefined;
/** A desktop notification; asks for permission the first time. */
export async function notify(title: string, body: string) {
  permission ??= isPermissionGranted().then(
    async (granted) => granted || (await requestPermission()) === "granted",
  );
  if (await permission) sendNotification({ title, body });
}

const side = (s?: string) => (s === "SELL" ? "Sold" : "Bought");

/**
 * Desktop notifications for fills, triggered alerts and stop-loss status changes. Keeps those
 * lists polling on every page; renders nothing. What exists at startup is not announced.
 */
export function Notifier() {
  const { data: deals } = useQuery(dealsQuery);
  const { data: triggered } = useQuery(alertsQuery("triggered"));
  const { data: stopLosses } = useQuery(stopLossesQuery);
  const seen = useRef({ deals: {}, alerts: {}, stopLosses: {} });

  useEffect(() => {
    if (!deals) return;
    const on = getNotifications();
    const rows = [...deals.deals, ...deals.fundDeals].map(toDealRow);
    for (const id of newKeys(
      seen.current.deals,
      rows.map((r) => r.id),
    )) {
      const r = rows.find((d) => d.id === id)!;
      if (!on.fills) continue;
      const qty =
        r.volume == null || getPrivacy() || !on.quantities ? "" : `${formatInteger(r.volume)} `;
      const price = r.price == null ? "" : ` at ${formatPrice(r.price)}`;
      void notify("Order filled", `${side(r.side)} ${qty}${r.name}${price}`);
    }
  }, [deals]);

  useEffect(() => {
    if (!triggered) return;
    const rows = triggered.map(toAlertRow);
    for (const id of newKeys(
      seen.current.alerts,
      rows.map((r) => r.id),
    )) {
      if (!getNotifications().alerts) continue;
      const r = rows.find((a) => a.id === id)!;
      const level = r.value == null ? "" : ` at ${formatPrice(r.value)}`;
      void notify("Alert triggered", `${r.name}${level}`);
    }
  }, [triggered]);

  useEffect(() => {
    if (!stopLosses) return;
    const rows = stopLosses.map(toStopLossRow);
    // Keyed by status, so a stop-loss that triggers (changes status) is announced.
    const key = (r: (typeof rows)[number]) => `${r.id}:${r.status}`;
    for (const k of newKeys(seen.current.stopLosses, rows.map(key))) {
      if (!getNotifications().stopLosses) continue;
      const r = rows.find((s) => key(s) === k)!;
      void notify(
        "Stop-loss",
        `${r.name}: ${r.status?.toLowerCase().replaceAll("_", " ") ?? "new"}`,
      );
    }
  }, [stopLosses]);

  return null;
}
