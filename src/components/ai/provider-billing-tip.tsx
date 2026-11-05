import { InfoTip } from "@/components/common/info-tip";
import type { Provider } from "@/lib/ai/types";
import { m } from "@/lib/i18n";

/** An ⓘ after a provider's name: how it reaches the model and who pays for it. */
export function ProviderBillingTip({ provider }: { provider: Provider }) {
  return (
    <InfoTip label={m.ai.provider.billedLabel(provider.name)}>
      <p className="text-foreground font-medium">{m.ai.provider.billedTitle(provider.name)}</p>
      <p className="text-muted-foreground">{provider.billing}</p>
    </InfoTip>
  );
}
