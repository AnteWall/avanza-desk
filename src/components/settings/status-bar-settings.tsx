import { useState } from "react";

import { MultiSelect } from "@/components/common/multi-select";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { exchanges, getShownExchanges, setShownExchanges } from "@/lib/exchanges";
import { m } from "@/lib/i18n";

export function StatusBarSettings() {
  const [shown, setShown] = useState(getShownExchanges);

  return (
    <SettingsSection title={m.settings.statusBar.title}>
      <SettingsRow
        label={m.settings.statusBar.exchanges.label}
        hint={m.settings.statusBar.exchanges.hint}
      >
        <MultiSelect
          options={exchanges.map((ex) => ({ value: ex.short, label: ex.short, hint: ex.name }))}
          value={shown}
          onChange={(next) => {
            setShown(next);
            void setShownExchanges(next);
          }}
        />
      </SettingsRow>
    </SettingsSection>
  );
}
