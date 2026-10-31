import { AssistantOptIn } from "@/components/ai/assistant-opt-in";
import { ProviderConnectRow } from "@/components/ai/provider-connect-row";
import { useConnectedProviders } from "@/components/ai/use-connected-providers";
import { AssistantConnection } from "@/components/settings/assistant-connection";
import { AssistantPreferences } from "@/components/settings/assistant-preferences";
import { SettingsSection } from "@/components/settings/settings-section";
import { providers } from "@/lib/ai/providers";

export function AssistantSettings() {
  const connected = useConnectedProviders();

  if (connected.length === 0) {
    return (
      <SettingsSection title="Assistant">
        <div className="px-3 py-2">
          <AssistantOptIn />
        </div>
      </SettingsSection>
    );
  }

  return (
    <>
      <SettingsSection title="Providers">
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
