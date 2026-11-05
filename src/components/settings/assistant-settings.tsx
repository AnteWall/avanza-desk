import { AssistantOptIn } from "@/components/ai/assistant-opt-in";
import { ProviderConnectRow } from "@/components/ai/provider-connect-row";
import { useConnectedProviders } from "@/components/ai/use-connected-providers";
import { AssistantConnection } from "@/components/settings/assistant-connection";
import { AssistantPreferences } from "@/components/settings/assistant-preferences";
import { SettingsSection } from "@/components/settings/settings-section";
import { providers } from "@/lib/ai/providers";
import { m } from "@/lib/i18n";

export function AssistantSettings() {
  const connected = useConnectedProviders();

  if (connected.length === 0) {
    return (
      <SettingsSection title={m.settings.assistant.title}>
        <div className="px-3 py-2">
          <AssistantOptIn />
        </div>
      </SettingsSection>
    );
  }

  return (
    <>
      <SettingsSection title={m.settings.assistant.providers}>
        {providers.map((p) =>
          connected.includes(p) ? (
            <AssistantConnection key={p.id} provider={p} />
          ) : (
            <ProviderConnectRow key={p.id} provider={p} />
          ),
        )}
      </SettingsSection>
      <AssistantPreferences />
    </>
  );
}
