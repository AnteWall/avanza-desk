import { useState } from "react";

import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Switch } from "@/components/ui/switch";
import { m } from "@/lib/i18n";
import { getNotifications, setNotifications, type NotificationSettings } from "@/lib/notifications";

const events: { key: keyof NotificationSettings; label: string; hint: string }[] = (
  ["fills", "alerts", "stopLosses", "rules"] as const
).map((key) => ({ key, ...m.settings.notifications.events[key] }));

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
      <SettingsSection title={m.settings.notifications.desktop}>
        {events.map((e) => row(e.key, e.label, e.hint))}
      </SettingsSection>
      <SettingsSection title={m.settings.notifications.content}>
        {row(
          "quantities",
          m.settings.notifications.quantities.label,
          m.settings.notifications.quantities.hint,
        )}
      </SettingsSection>
    </>
  );
}
