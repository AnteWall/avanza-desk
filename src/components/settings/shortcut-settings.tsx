import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { ShortcutRecorder } from "@/components/settings/shortcut-recorder";
import { shortcutActions } from "@/lib/shortcuts";

const fixed = [
  ["1 … 6", "Chart range", "In the workspace's overview."],
  ["↑ ↓  j k  Enter", "Tables", "Move through rows and open one."],
  ["A", "Add instrument", "On the Rebalance page."],
] as const;

const groups = [
  { id: "general", title: "General" },
  { id: "pages", title: "Go to page" },
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
      <SettingsSection title="Inside pages (fixed)">
        {fixed.map(([keys, label, hint]) => (
          <SettingsRow key={label} label={label} hint={hint}>
            <span className="num text-muted-foreground text-xs whitespace-pre">{keys}</span>
          </SettingsRow>
        ))}
      </SettingsSection>
    </>
  );
}
