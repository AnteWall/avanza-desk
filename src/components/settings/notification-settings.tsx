import { useState } from "react";

import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Switch } from "@/components/ui/switch";
import { getNotifications, setNotifications, type NotificationSettings } from "@/lib/notifications";

const events: { key: keyof NotificationSettings; label: string; hint: string }[] = [
  { key: "fills", label: "Order filled", hint: "When one of your orders is executed" },
  { key: "alerts", label: "Avanza alerts", hint: "Price alerts you set on Avanza" },
  { key: "stopLosses", label: "Stop-loss", hint: "When a stop-loss is placed, triggers or ends" },
  { key: "rules", label: "Alert rules", hint: "Your local rules under Alerts › Rules" },
];

export function NotificationSettings() {
  const [settings, setSettings] = useState(getNotifications);
  const update = (key: keyof NotificationSettings, on: boolean) => {
    const next = { ...settings, [key]: on };
    setSettings(next);
    void setNotifications(next);
  };
  const row = (key: keyof NotificationSettings, label: string, hint: string) => (
    <SettingsRow key={key} label={label} hint={hint}>
      <Switch
        aria-label={label}
        checked={settings[key]}
        onCheckedChange={(on) => update(key, on)}
        className="data-checked:bg-brand"
      />
    </SettingsRow>
  );

  return (
    <>
      <SettingsSection title="Desktop notifications">
        {events.map((e) => row(e.key, e.label, e.hint))}
      </SettingsSection>
      <SettingsSection title="Content">
        {row(
          "quantities",
          "Show quantities",
          "Number of shares in fill notifications. Always hidden in privacy mode.",
        )}
      </SettingsSection>
    </>
  );
}
