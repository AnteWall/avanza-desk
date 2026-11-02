import { useState } from "react";

import { useLiveQuotesPath } from "@/components/layout/use-live-quotes-path";
import { SecondsInput } from "@/components/settings/seconds-input";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { pickCsvPath } from "@/lib/csv";
import { setLiveQuotesPath } from "@/lib/live-quotes-file";
import {
  getRefreshIntervals,
  refreshIntervalDefaults,
  setRefreshIntervals,
  type RefreshIntervals,
} from "@/lib/refresh-intervals";
import { saveSetting, settingKeys } from "@/lib/settings";

const fields: {
  key: Exclude<keyof RefreshIntervals, "quotesFile">;
  label: string;
  hint: string;
}[] = [
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
  const quotesPath = useLiveQuotesPath();
  const pickQuotesFile = async () => {
    const path = await pickCsvPath("Live quotes file", "avanzadesk-quotes.csv");
    if (path) setLiveQuotesPath(path);
  };

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
            <SecondsInput
              label={f.label}
              seconds={intervals[f.key] / 1000}
              onChange={(v) => update(f.key, v)}
            />
          </SettingsRow>
        ))}
      </SettingsSection>
      <SettingsSection title="Spreadsheets">
        <SettingsRow
          label="Live quotes file"
          hint={
            quotesPath
              ? `Writing your watchlists' quotes to ${quotesPath} while AvanzaDesk runs.`
              : "A CSV of your watchlists' quotes, rewritten as prices move. Point Excel or Sheets at it and refresh."
          }
        >
          <span className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => void pickQuotesFile()}>
              {quotesPath ? "Change file…" : "Choose file…"}
            </Button>
            {quotesPath && (
              <Button variant="ghost" size="sm" onClick={() => setLiveQuotesPath(null)}>
                Stop
              </Button>
            )}
          </span>
        </SettingsRow>
        <SettingsRow
          label="Write every"
          hint={`How often the file is rewritten while prices move · default ${refreshIntervalDefaults.quotesFile / 1000}s`}
        >
          <SecondsInput
            label="Write the live quotes file every"
            seconds={intervals.quotesFile / 1000}
            onChange={(v) => update("quotesFile", v)}
          />
        </SettingsRow>
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
