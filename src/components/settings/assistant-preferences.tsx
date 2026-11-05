import { cn } from "cn";
import { useState } from "react";

import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { Switch } from "@/components/ui/switch";
import { getPreferences, MAX_ABOUT, savePreferences, type Preferences } from "@/lib/ai/preferences";
import { m } from "@/lib/i18n";

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
      <SettingsSection title={m.settings.assistant.answers}>
        <SettingsRow
          label={m.settings.assistant.language.label}
          hint={m.settings.assistant.language.hint}
        >
          <Segmented
            label={m.settings.assistant.language.label}
            value={prefs.language}
            onChange={(language) => update({ language })}
            options={[
              { value: "auto", label: m.settings.assistant.language.auto },
              { value: "en", label: "English" },
              { value: "sv", label: "Svenska" },
            ]}
          />
        </SettingsRow>
        <SettingsRow
          label={m.settings.assistant.length.label}
          hint={m.settings.assistant.length.hint}
        >
          <Segmented
            label={m.settings.assistant.length.aria}
            value={prefs.detail}
            onChange={(detail) => update({ detail })}
            options={[
              { value: "brief", label: m.settings.assistant.length.brief },
              { value: "balanced", label: m.settings.assistant.length.balanced },
              { value: "detailed", label: m.settings.assistant.length.detailed },
            ]}
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title={m.settings.assistant.tools}>
        <SettingsRow
          label={m.settings.assistant.webSearch.label}
          hint={m.settings.assistant.webSearch.hint}
        >
          <Switch
            aria-label={m.settings.assistant.webSearch.label}
            checked={prefs.webSearch}
            onCheckedChange={(webSearch) => update({ webSearch })}
            className="data-checked:bg-brand"
          />
        </SettingsRow>
        <SettingsRow
          label={m.settings.assistant.externalArticles.label}
          hint={m.settings.assistant.externalArticles.hint}
        >
          <Switch
            aria-label={m.settings.assistant.externalArticles.label}
            checked={prefs.externalArticles}
            onCheckedChange={(externalArticles) => update({ externalArticles })}
            className="data-checked:bg-brand"
          />
        </SettingsRow>
      </SettingsSection>
      <SettingsSection title={m.settings.assistant.about.title}>
        <label className="flex flex-col gap-1.5 px-3 pt-1 pb-2">
          <span className="text-muted-foreground text-xs">{m.settings.assistant.about.hint}</span>
          <textarea
            aria-label={m.settings.assistant.about.title}
            value={prefs.about}
            maxLength={MAX_ABOUT}
            rows={4}
            onChange={(e) => update({ about: e.target.value }, false)}
            onBlur={() => void savePreferences(prefs)}
            placeholder={m.settings.assistant.about.placeholder}
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
