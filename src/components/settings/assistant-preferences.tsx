import { cn } from "cn";
import { useState } from "react";

import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Switch } from "@/components/ui/switch";
import { getPreferences, MAX_ABOUT, savePreferences, type Preferences } from "@/lib/ai/preferences";

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="bg-muted/50 flex rounded-md p-0.5" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "focus-visible:ring-ring/50 rounded-sm px-2.5 py-0.5 text-xs transition-colors outline-none focus-visible:ring-2",
            value === o.value
              ? "bg-card text-foreground font-medium shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * How the assistant answers (language, length, a note about you as an investor) and which
 * internet tools it may use. Applies to conversations started after the change.
 */
export function AssistantPreferences() {
  const [prefs, setPrefs] = useState(getPreferences);
  const update = (next: Partial<Preferences>, save = true) => {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    if (save) void savePreferences(merged);
  };

  return (
    <>
      <SettingsSection title="Answers">
        <SettingsRow label="Language" hint="Auto answers in the language you write in">
          <Segmented
            label="Language"
            value={prefs.language}
            onChange={(language) => update({ language })}
            options={[
              { value: "auto", label: "Auto" },
              { value: "en", label: "English" },
              { value: "sv", label: "Svenska" },
            ]}
          />
        </SettingsRow>
        <SettingsRow label="Length" hint="How much detail by default">
          <Segmented
            label="Answer length"
            value={prefs.detail}
            onChange={(detail) => update({ detail })}
            options={[
              { value: "brief", label: "Brief" },
              { value: "balanced", label: "Balanced" },
              { value: "detailed", label: "Detailed" },
            ]}
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="Tools">
        <SettingsRow label="Web search" hint="Look up what Avanza doesn't have, like background">
          <Switch
            aria-label="Web search"
            checked={prefs.webSearch}
            onCheckedChange={(webSearch) => update({ webSearch })}
            className="data-checked:bg-brand"
          />
        </SettingsRow>
        <SettingsRow
          label="External articles"
          hint="Read Placera, Direkt and other articles from your news on their sites"
        >
          <Switch
            aria-label="External articles"
            checked={prefs.externalArticles}
            onCheckedChange={(externalArticles) => update({ externalArticles })}
            className="data-checked:bg-brand"
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title="About you">
        <label className="flex flex-col gap-1.5 px-3 pt-1 pb-2">
          <span className="text-muted-foreground text-xs">
            Your goals, horizon and risk appetite, or anything the assistant should always keep in
            mind.
          </span>
          <textarea
            aria-label="About you"
            value={prefs.about}
            maxLength={MAX_ABOUT}
            rows={4}
            onChange={(e) => update({ about: e.target.value }, false)}
            onBlur={() => void savePreferences(prefs)}
            placeholder="E.g. Long-term saver, 20+ year horizon. Prefer dividend stocks and index funds. Avoid crypto."
            className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 resize-y rounded-md border bg-transparent px-2.5 py-2 leading-relaxed outline-none focus-visible:ring-3"
          />
          <span className="text-muted-foreground num self-end text-xs">
            {prefs.about.length} / {MAX_ABOUT}
          </span>
        </label>
      </SettingsSection>
    </>
  );
}
