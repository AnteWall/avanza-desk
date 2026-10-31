import { useState } from "react";

import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getRefreshIntervals,
  refreshIntervalDefaults,
  setRefreshIntervals,
  type RefreshIntervals,
} from "@/lib/refresh-intervals";
import { saveSetting, settingKeys } from "@/lib/settings";

const fields: { key: keyof RefreshIntervals; label: string; hint: string }[] = [
  { key: "positions", label: "Positions", hint: "Holdings and account values" },
  { key: "alerts", label: "Alerts", hint: "Avanza price alerts" },
  { key: "news", label: "News", hint: "News feed and instrument news" },
  { key: "market", label: "Market movers", hint: "Gainers and losers" },
  { key: "indices", label: "Index ticker", hint: "Indices in the top bar" },
];

/** Forgets every saved value under `prefix`, then reloads so open panels fall back to defaults. */
async function reset(prefix: string) {
  await Promise.all(
    settingKeys()
      .filter((k) => k.startsWith(prefix))
      .map((k) => saveSetting(k, null)),
  );
  location.reload();
}

export function DataSettings() {
  const [intervals, setIntervals] = useState(getRefreshIntervals);

  const update = (key: keyof RefreshIntervals, seconds: number) => {
    // Floor at 1s so a typo can't hammer Avanza's API.
    const next = { ...intervals, [key]: Math.max(1, seconds || 0) * 1000 };
    setIntervals(next);
    void setRefreshIntervals(next);
  };

  return (
    <>
      <SettingsSection title="Refresh intervals">
        {fields.map((f) => (
          <SettingsRow
            key={f.key}
            label={f.label}
            hint={`${f.hint} · default ${refreshIntervalDefaults[f.key] / 1000}s`}
          >
            <span className="relative">
              <Input
                type="number"
                min={1}
                aria-label={`${f.label}, seconds`}
                value={intervals[f.key] / 1000}
                onChange={(e) => update(f.key, e.currentTarget.valueAsNumber)}
                className="num w-24 [appearance:textfield] pr-6 text-right [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs">
                s
              </span>
            </span>
          </SettingsRow>
        ))}
      </SettingsSection>
      <SettingsSection title="Reset">
        <SettingsRow label="Panel layouts" hint="Panel sizes back to default. Reloads the window.">
          <Button variant="outline" size="sm" onClick={() => void reset("layout:")}>
            Reset
          </Button>
        </SettingsRow>
        <SettingsRow
          label="Open tabs"
          hint="Every page opens on its first tab. Reloads the window."
        >
          <Button variant="outline" size="sm" onClick={() => void reset("tab:")}>
            Reset
          </Button>
        </SettingsRow>
      </SettingsSection>
    </>
  );
}
