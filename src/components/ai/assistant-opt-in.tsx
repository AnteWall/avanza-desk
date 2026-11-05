import { ProviderConnectRow } from "@/components/ai/provider-connect-row";
import { providers } from "@/lib/ai/providers";
import { m } from "@/lib/i18n";

/**
 * The assistant before the user opts in: what it does and what it can see, then each provider
 * with its own Connect button. Nothing runs until one is pressed.
 */
export function AssistantOptIn() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col">
        <span className="font-semibold">{m.ai.optIn.title}</span>
        <span className="text-muted-foreground text-xs">{m.ai.optIn.subtitle}</span>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">{m.ai.optIn.intro}</p>
      <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed">
        {m.ai.optIn.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <ul className="flex flex-col divide-y rounded-md border">
        {providers.map((p) => (
          <li key={p.id}>
            <ProviderConnectRow provider={p} />
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs leading-relaxed">{m.ai.optIn.footer}</p>
    </div>
  );
}
