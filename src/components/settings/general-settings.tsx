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
import { getStartPrivate, setStartPrivate } from "@/lib/privacy";
import { getTheme, setTheme, type Theme } from "@/lib/theme";
import { setInAppFrame } from "@/lib/window-frame";

const themes: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

const densities: { value: Density; label: string }[] = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
];

const startPages: { value: StartPage; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "workspace", label: "Workspace" },
];

const layouts: { value: WorkspaceLayout; label: string }[] = [
  { value: "simple", label: "Simple" },
  { value: "trading", label: "Trading" },
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
      <SettingsSection title="Appearance">
        <SettingsRow
          label="Theme"
          hint="How AvanzaDesk looks. System follows your OS light or dark mode."
        >
          <div className="flex gap-2 py-1.5" role="radiogroup" aria-label="Theme">
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
        <SettingsRow
          label="Text size"
          hint="Comfortable is easier to read. Compact fits more rows on screen, like a trading terminal."
        >
          <Segmented
            label="Text size"
            options={densities}
            value={density}
            onChange={(d) => {
              setDensityState(d);
              void setDensity(d);
            }}
          />
        </SettingsRow>
        <SettingsRow
          label="Workspace"
          hint="Simple shows your watchlist and everything about the instrument. Trading adds the order book and a pre-trade estimate."
        >
          <Segmented
            label="Workspace"
            options={layouts}
            value={layout}
            onChange={(l) => {
              setLayoutState(l);
              void setWorkspaceLayout(l);
            }}
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Window">
        <SettingsRow
          label="Open on"
          hint="The page you see after signing in. Home sums up your portfolio; Workspace is charts and the order book."
        >
          <Segmented
            label="Open on"
            options={startPages}
            value={startPage}
            onChange={(p) => {
              setStartPageState(p);
              void setStartPage(p);
            }}
          />
        </SettingsRow>
        <SettingsRow
          label="In-app window controls"
          hint="Minimize, maximize and close in the top bar instead of the system title bar"
        >
          <Switch
            aria-label="In-app window controls"
            checked={inAppFrame}
            onCheckedChange={(on) => void setInAppFrame(on)}
            className="data-checked:bg-brand"
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Updates">
        <UpdateRow />
      </SettingsSection>
      <SettingsSection title="Privacy">
        <SettingsRow
          label="Start in privacy mode"
          hint="Blur amounts every time AvanzaDesk opens, for screen sharing"
        >
          <Switch
            aria-label="Start in privacy mode"
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
