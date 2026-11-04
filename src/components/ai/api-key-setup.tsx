import { openUrl } from "@tauri-apps/plugin-opener";
import { ExternalLink, KeyRound, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { ProviderBillingTip } from "@/components/ai/provider-billing-tip";
import { ProviderLogo } from "@/components/ai/provider-logo";
import { useProviderSetup } from "@/components/ai/use-provider-setup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Provider } from "@/lib/ai/types";

/** Connecting a provider that runs with the user's API key: paste it, AvanzaDesk checks it. */
export function ApiKeySetup({ provider }: { provider: Provider }) {
  const { data: setup, isFetching, setApiKey } = useProviderSetup(provider);
  const [key, setKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const shownError = error ?? (setup?.state === "broken" ? setup.error : undefined);

  const save = async () => {
    setSaving(true);
    setError(undefined);
    try {
      await setApiKey(key.trim());
      setKey("");
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <ProviderLogo provider={provider} className="size-8" />
        <div className="flex flex-col">
          <span className="flex items-center gap-1.5 font-semibold">
            {provider.name}
            <ProviderBillingTip provider={provider} />
          </span>
          <span className="text-muted-foreground text-xs">
            by {provider.vendor}, with your own API key
          </span>
        </div>
      </div>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <Input
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={setup?.state === "broken" ? "Paste a new key" : "Paste your API key"}
          aria-label={`${provider.vendor} API key`}
          aria-invalid={!!shownError}
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <Button type="submit" size="sm" disabled={!key.trim() || saving}>
          {saving || (isFetching && !setup) ? (
            <LoaderCircle className="motion-safe:animate-spin" />
          ) : (
            <KeyRound />
          )}
          Save
        </Button>
      </form>
      {shownError && <p className="text-destructive text-xs leading-relaxed">{shownError}</p>}
      <div className="flex flex-wrap gap-1.5">
        <Button size="xs" variant="outline" onClick={() => void openUrl(provider.installUrl)}>
          <ExternalLink />
          Get an API key
        </Button>
        <Button size="xs" variant="ghost" onClick={() => void openUrl(provider.plansUrl)}>
          <ExternalLink />
          API pricing
        </Button>
      </div>
    </div>
  );
}
