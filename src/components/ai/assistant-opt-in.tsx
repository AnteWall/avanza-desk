import { ProviderConnectRow } from "@/components/ai/provider-connect-row";
import { providers } from "@/lib/ai/providers";

/**
 * The assistant before the user opts in: what it does and what it can see, then each provider
 * with its own Connect button. Nothing runs until one is pressed.
 */
export function AssistantOptIn() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col">
        <span className="font-semibold">AI assistant</span>
        <span className="text-muted-foreground text-xs">Off until you connect a provider</span>
      </div>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Ask about your holdings, news and instruments in plain language. Answers use your live
        Avanza data, with charts and links back into the app.
      </p>
      <ul className="text-muted-foreground flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed">
        <li>Runs on your own plan with the provider. AvanzaDesk never sees your credentials.</li>
        <li>The assistant can read your accounts but never trade.</li>
        <li>What you ask is sent to the provider you connect.</li>
      </ul>
      <ul className="flex flex-col divide-y rounded-md border">
        {providers.map((p) => (
          <li key={p.id}>
            <ProviderConnectRow provider={p} />
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs leading-relaxed">
        Connecting finds the program for you and walks you through anything missing. You can connect
        several and switch between them in the chat.
      </p>
    </div>
  );
}
