import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowUpRight, Plug } from "lucide-react";

import { ProviderLogo } from "@/components/ai/provider-logo";
import { Button } from "@/components/ui/button";
import { connect } from "@/lib/ai/connected";
import { setProvider } from "@/lib/ai/providers";
import type { Provider } from "@/lib/ai/types";

/** A provider that isn't connected: what it is, where to get its program, and Connect. */
export function ProviderConnectRow({ provider }: { provider: Provider }) {
  return (
    <div className="flex min-h-12 items-center gap-3 px-3 py-1.5">
      <ProviderLogo provider={provider} className="size-6" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span>{provider.name}</span>
        <span className="text-muted-foreground truncate text-xs">
          by {provider.vendor} · needs{" "}
          <button
            type="button"
            onClick={() => void openUrl(provider.installUrl)}
            title={`Download ${provider.program}`}
            className="text-brand focus-visible:ring-ring/50 inline-flex items-baseline gap-0.5 rounded-xs underline underline-offset-2 outline-none focus-visible:ring-2"
          >
            {provider.program}
            <ArrowUpRight className="size-3 self-center" aria-hidden />
          </button>{" "}
          on this computer
        </span>
      </span>
      <Button
        size="sm"
        onClick={() => {
          // The newest connection is the one the next chat starts with.
          void setProvider(provider.id);
          connect(provider.id);
        }}
      >
        <Plug />
        Connect
      </Button>
    </div>
  );
}
