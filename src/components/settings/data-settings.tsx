import { useState } from "react";

import { useLiveQuotesPath } from "@/components/layout/use-live-quotes-path";
import { SecondsInput } from "@/components/settings/seconds-input";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Button } from "@/components/ui/button";
import { pickCsvPath } from "@/lib/csv";
import { m } from "@/lib/i18n";
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
}[] = (["positions", "alerts", "news", "market", "indices"] as const).map((key) => ({
  key,
  ...m.settings.data.fields[key],
}));

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
    const path = await pickCsvPath(m.settings.data.quotesFile.label, "avanzadesk-quotes.csv");
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
      <SettingsSection title={m.settings.data.refreshIntervals}>
        {fields.map((f) => (
          <SettingsRow
            key={f.key}
            label={f.label}
            hint={m.settings.data.withDefault(f.hint, refreshIntervalDefaults[f.key] / 1000)}
          >
            <SecondsInput
              label={f.label}
              seconds={intervals[f.key] / 1000}
              onChange={(v) => update(f.key, v)}
            />
          </SettingsRow>
        ))}
      </SettingsSection>
      <SettingsSection title={m.settings.data.spreadsheets}>
        <SettingsRow
          label={m.settings.data.quotesFile.label}
          hint={
            quotesPath
              ? m.settings.data.quotesFile.writing(quotesPath)
              : m.settings.data.quotesFile.hint
          }
        >
          <span className="flex gap-1">
            <Button variant="outline" size="sm" onClick={() => void pickQuotesFile()}>
              {quotesPath ? m.settings.data.quotesFile.change : m.settings.data.quotesFile.choose}
            </Button>
            {quotesPath && (
              <Button variant="ghost" size="sm" onClick={() => setLiveQuotesPath(null)}>
                {m.settings.data.quotesFile.stop}
              </Button>
            )}
          </span>
        </SettingsRow>
        <SettingsRow
          label={m.settings.data.writeEvery.label}
          hint={m.settings.data.writeEvery.hint(refreshIntervalDefaults.quotesFile / 1000)}
        >
          <SecondsInput
            label={m.settings.data.writeEvery.aria}
            seconds={intervals.quotesFile / 1000}
            onChange={(v) => update("quotesFile", v)}
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title={m.settings.data.reset.title}>
        <SettingsRow
          label={m.settings.data.reset.layouts.label}
          hint={m.settings.data.reset.layouts.hint}
        >
          <Button variant="outline" size="sm" onClick={() => void reset("layout:")}>
            {m.settings.data.reset.button}
          </Button>
        </SettingsRow>
        <SettingsRow
          label={m.settings.data.reset.tabs.label}
          hint={m.settings.data.reset.tabs.hint}
        >
          <Button variant="outline" size="sm" onClick={() => void reset("tab:")}>
            {m.settings.data.reset.button}
          </Button>
        </SettingsRow>
      </SettingsSection>
    </>
  );
}
