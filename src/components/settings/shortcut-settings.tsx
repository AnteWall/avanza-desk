import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { ShortcutRecorder } from "@/components/settings/shortcut-recorder";
import { m } from "@/lib/i18n";
import { shortcutActions } from "@/lib/shortcuts";

const fixed = [
  ["1 … 6", m.settings.shortcuts.fixedRows.chartRange],
  ["↑ ↓  j k  Enter", m.settings.shortcuts.fixedRows.tables],
  ["A", m.settings.shortcuts.fixedRows.addInstrument],
] as const;

const groups = [
  { id: "general", title: m.settings.shortcuts.general },
  { id: "pages", title: m.settings.shortcuts.pages },
] as const;

/**
 * Rebind the app-wide shortcuts, grouped: general actions, then one per page with what the
 * page is for. The keys pages use on their own are listed but fixed.
 */
export function ShortcutSettings() {
  return (
    <>
      {groups.map((g) => (
        <SettingsSection key={g.id} title={g.title}>
          {shortcutActions
            .filter((a) => a.group === g.id)
            .map((a) => (
              <SettingsRow
                key={a.action}
                label={a.label}
                hint={a.group === "general" ? a.hint : undefined}
              >
                <ShortcutRecorder action={a.action} />
              </SettingsRow>
            ))}
        </SettingsSection>
      ))}
      <SettingsSection title={m.settings.shortcuts.fixed}>
        {fixed.map(([keys, { label, hint }]) => (
          <SettingsRow key={keys} label={label} hint={hint}>
            <span className="num text-muted-foreground text-xs whitespace-pre">{keys}</span>
          </SettingsRow>
        ))}
      </SettingsSection>
    </>
  );
}
