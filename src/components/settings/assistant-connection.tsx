import { open } from "@tauri-apps/plugin-dialog";
import { Ellipsis, FolderSearch, KeyRound, RotateCcw, Unplug } from "lucide-react";

import { ApiKeySetup } from "@/components/ai/api-key-setup";
import { ProviderBillingTip } from "@/components/ai/provider-billing-tip";
import { ProviderLogo } from "@/components/ai/provider-logo";
import { ProviderSetup } from "@/components/ai/provider-setup";
import { useProviderSetup } from "@/components/ai/use-provider-setup";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { disconnect } from "@/lib/ai/connected";
import type { Provider } from "@/lib/ai/types";

/**
 * Disconnecting stops the provider's program and drops it from the chat; the last one turns the
 * assistant off. It doesn't sign you out of the program, so connecting again needs no sign-in.
 */
function Disconnect({ provider }: { provider: Provider }) {
  return (
    <Button
      variant="outline"
      size="xs"
      title={`Stop using ${provider.name}. Your chats and preferences stay.`}
      onClick={() => disconnect(provider.id)}
    >
      <Unplug />
      Disconnect
    </Button>
  );
}

/** One quiet row once the provider is ready, program details in its menu; the setup checklist until then. */
export function AssistantConnection({ provider }: { provider: Provider }) {
  const { data: setup, setBinary, setApiKey } = useProviderSetup(provider);

  if (setup?.state !== "ready") {
    return (
      <div className="flex flex-col gap-3 px-3 py-2">
        {provider.setApiKey ? (
          <ApiKeySetup provider={provider} />
        ) : (
          <ProviderSetup provider={provider} />
        )}
        <span className="self-start">
          <Disconnect provider={provider} />
        </span>
      </div>
    );
  }

  const locate = async () => {
    const path = await open({ title: `Locate ${provider.program}`, multiple: false });
    if (typeof path === "string") await setBinary(path);
  };
  const account = [setup.account.email, setup.account.plan ?? setup.account.organization]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <div className="flex min-h-12 items-center gap-3 px-3 py-1.5">
        <ProviderLogo provider={provider} className="size-6" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-1.5">
            {provider.name}
            <ProviderBillingTip provider={provider} />
          </span>
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className="bg-brand size-1.5 shrink-0 rounded-full" aria-hidden />
            <span className="truncate">Connected{account && ` · ${account}`}</span>
          </span>
        </span>
        <Disconnect provider={provider} />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${provider.program} details`}
                title={`${provider.program} details`}
                className="text-muted-foreground"
              />
            }
          >
            <Ellipsis />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            {provider.setApiKey ? (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{setup.account.plan}</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void setApiKey(null)}>
                  <KeyRound />
                  Remove API key
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="text-foreground">
                      {provider.program} <span className="num">v{setup.version}</span>
                    </span>
                    <span className="num truncate" title={setup.bin}>
                      {setup.bin}
                    </span>
                    <span>{setup.custom ? "Chosen by you" : "Auto-detected"}</span>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void locate()}>
                  <FolderSearch />
                  Change…
                </DropdownMenuItem>
                {setup.custom && (
                  <DropdownMenuItem onClick={() => void setBinary(null)}>
                    <RotateCcw />
                    Use auto-detect
                  </DropdownMenuItem>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
