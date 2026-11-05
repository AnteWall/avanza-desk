import { useState } from "react";

import { Segmented } from "@/components/common/segmented";
import { useInAppFrame } from "@/components/layout/window/use-in-app-frame";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { ThemePreview } from "@/components/settings/theme-preview";
import { UpdateRow } from "@/components/settings/update-row";
import { Switch } from "@/components/ui/switch";
import { getStartPage, setStartPage, type StartPage } from "@/lib/briefing";
import {
  getDensity,
  getWorkspaceLayout,
  setDensity,
  setWorkspaceLayout,
  type Density,
  type WorkspaceLayout,
} from "@/lib/density";
import { lang, languages, m, setLanguage, type Language } from "@/lib/i18n";
import { getStartPrivate, setStartPrivate } from "@/lib/privacy";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import { setInAppFrame } from "@/lib/window-frame";

const themes: { value: Theme; label: string }[] = [
  { value: "light", label: m.layout.settingsMenu.themes.light },
  { value: "dark", label: m.layout.settingsMenu.themes.dark },
  { value: "system", label: m.layout.settingsMenu.themes.system },
];

const languageOptions = Object.entries(languages).map(([value, label]) => ({
  value: value as Language,
  label,
}));

const densities: { value: Density; label: string }[] = [
  { value: "comfortable", label: m.settings.general.textSize.comfortable },
  { value: "compact", label: m.settings.general.textSize.compact },
];

const startPages: { value: StartPage; label: string }[] = [
  { value: "home", label: m.layout.pages.home.label },
  { value: "workspace", label: m.layout.pages.workspace.label },
];

const layouts: { value: WorkspaceLayout; label: string }[] = [
  { value: "simple", label: m.settings.general.workspace.simple },
  { value: "trading", label: m.settings.general.workspace.trading },
];

export function GeneralSettings() {
  const [theme, setThemeState] = useState(getTheme);
  const [density, setDensityState] = useState(getDensity);
  const [startPage, setStartPageState] = useState(getStartPage);
  const [layout, setLayoutState] = useState(getWorkspaceLayout);
  const inAppFrame = useInAppFrame();
  const [startPrivate, setStartPrivateState] = useState(getStartPrivate);

  return (
    <>
      <SettingsSection title={m.settings.general.appearance}>
        <SettingsRow label={m.settings.general.theme.label} hint={m.settings.general.theme.hint}>
          <div
            className="flex gap-2 py-1.5"
            role="radiogroup"
            aria-label={m.settings.general.theme.label}
          >
            {themes.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={theme === t.value}
                data-active={theme === t.value}
                onClick={() => {
                  void setTheme(t.value);
                  setThemeState(t.value);
                }}
                className="group text-muted-foreground data-[active=true]:text-foreground flex w-28 flex-col gap-1.5 rounded-md text-xs transition-colors outline-none"
              >
                <span className="group-hover:border-muted-foreground group-focus-visible:ring-ring group-data-[active=true]:border-brand relative h-16 overflow-hidden rounded-md border-2 transition-colors group-focus-visible:ring-2">
                  {t.value === "system" ? (
                    <>
                      <ThemePreview theme="light" className="absolute inset-0" />
                      <ThemePreview
                        theme="dark"
                        className="absolute inset-0 [clip-path:polygon(100%_0,100%_100%,0_100%)]"
                      />
                    </>
                  ) : (
                    <ThemePreview theme={t.value} className="absolute inset-0" />
                  )}
                </span>
                {t.label}
              </button>
            ))}
          </div>
        </SettingsRow>
        <SettingsRow label={m.settings.language.label} hint={m.settings.language.hint}>
          <Segmented
            label={m.settings.language.label}
            options={languageOptions}
            value={lang}
            onChange={(l) => void setLanguage(l)}
          />
        </SettingsRow>
        <SettingsRow
          label={m.settings.general.textSize.label}
          hint={m.settings.general.textSize.hint}
        >
          <Segmented
            label={m.settings.general.textSize.label}
            options={densities}
            value={density}
            onChange={(d) => {
              setDensityState(d);
              void setDensity(d);
            }}
          />
        </SettingsRow>
        <SettingsRow
          label={m.settings.general.workspace.label}
          hint={m.settings.general.workspace.hint}
        >
          <Segmented
            label={m.settings.general.workspace.label}
            options={layouts}
            value={layout}
            onChange={(l) => {
              setLayoutState(l);
              void setWorkspaceLayout(l);
            }}
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title={m.settings.general.window}>
        <SettingsRow label={m.settings.general.openOn.label} hint={m.settings.general.openOn.hint}>
          <Segmented
            label={m.settings.general.openOn.label}
            options={startPages}
            value={startPage}
            onChange={(p) => {
              setStartPageState(p);
              void setStartPage(p);
            }}
          />
        </SettingsRow>
        <SettingsRow
          label={m.settings.general.inAppFrame.label}
          hint={m.settings.general.inAppFrame.hint}
        >
          <Switch
            aria-label={m.settings.general.inAppFrame.label}
            checked={inAppFrame}
            onCheckedChange={(on) => void setInAppFrame(on)}
            className="data-checked:bg-brand"
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title={m.settings.general.updates}>
        <UpdateRow />
      </SettingsSection>
      <SettingsSection title={m.settings.general.privacy}>
        <SettingsRow
          label={m.settings.general.startPrivate.label}
          hint={m.settings.general.startPrivate.hint}
        >
          <Switch
            aria-label={m.settings.general.startPrivate.label}
            checked={startPrivate}
            onCheckedChange={(on) => {
              setStartPrivateState(on);
              void setStartPrivate(on);
            }}
            className="data-checked:bg-brand"
          />
        </SettingsRow>
      </SettingsSection>
    </>
  );
}
