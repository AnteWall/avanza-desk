import { useState } from "react";

import { MultiSelect } from "@/components/common/multi-select";
import { SettingsRow } from "@/components/settings/settings-row";
import { SettingsSection } from "@/components/settings/settings-section";
import { exchanges, getShownExchanges, setShownExchanges } from "@/lib/exchanges";

export function StatusBarSettings() {
  const [shown, setShown] = useState(getShownExchanges);

  return (
    <SettingsSection title="Status bar">
      <SettingsRow label="Exchanges" hint="Regular hours, in Swedish time">
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
