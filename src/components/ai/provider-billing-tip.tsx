import { InfoTip } from "@/components/common/info-tip";
import type { Provider } from "@/lib/ai/types";

/** An ⓘ after a provider's name: how it reaches the model and who pays for it. */
export function ProviderBillingTip({ provider }: { provider: Provider }) {
  return (
    <InfoTip label={`how ${provider.name} is billed`}>
      <p className="text-foreground font-medium">How {provider.name} is billed</p>
      <p className="text-muted-foreground">{provider.billing}</p>
    </InfoTip>
  );
}
