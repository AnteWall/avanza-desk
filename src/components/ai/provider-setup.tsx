import { open } from "@tauri-apps/plugin-dialog";
import { openUrl } from "@tauri-apps/plugin-opener";
import { cn } from "cn";
import {
  Check,
  Copy,
  ExternalLink,
  FolderSearch,
  LoaderCircle,
  LogIn,
  RefreshCw,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { ProviderBillingTip } from "@/components/ai/provider-billing-tip";
import { ProviderLogo } from "@/components/ai/provider-logo";
import { useProviderSetup } from "@/components/ai/use-provider-setup";
import { Button } from "@/components/ui/button";
import type { Provider } from "@/lib/ai/types";
import { m } from "@/lib/i18n";

type StepState = "done" | "todo" | "blocked" | "checking";

/**
 * Connecting a provider, as a two-step checklist: the program is installed (found automatically,
 * or picked by hand) and you are signed in. Each step says what is wrong and offers the fix, and
 * the checklist re-checks on its own while you follow it.
 */
export function ProviderSetup({ provider }: { provider: Provider }) {
  const { data: setup, isFetching, refetch, setBinary } = useProviderSetup(provider);
  const checking = isFetching && !setup;

  const locate = async () => {
    const path = await open({
      title: m.ai.setup.locateTitle(provider.program),
      multiple: false,
      directory: false,
    });
    if (typeof path === "string") await setBinary(path);
  };
  const recheck = () => void refetch();
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string>();
  const signIn = async () => {
    setSigningIn(true);
    setSignInError(undefined);
    try {
      await provider.signIn?.();
    } catch (error) {
      setSignInError(String(error));
    } finally {
      setSigningIn(false);
    }
  };

  const installed = setup && setup.state !== "missing" && setup.state !== "broken";
  const custom = setup?.custom ?? false;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <ProviderLogo provider={provider} className="size-8" />
        <div className="flex flex-col">
          <span className="flex items-center gap-1.5 font-semibold">
            {provider.name}
            <ProviderBillingTip provider={provider} />
          </span>
          <span className="text-muted-foreground text-xs">
            {m.ai.setup.byVendor(provider.vendor, provider.program)}
          </span>
        </div>
      </div>

      <ol className="flex flex-col">
        <Step
          n={1}
          state={checking ? "checking" : installed ? "done" : "todo"}
          title={m.ai.setup.installed(provider.program)}
        >
          {checking && <Detail>{m.ai.setup.lookingFor(provider.program)}</Detail>}
          {setup?.state === "missing" && (
            <>
              <Detail tone={setup.error ? "error" : undefined}>
                {setup.error ?? m.ai.setup.notFound}
              </Detail>
              <Detail>{m.ai.setup.installHint}</Detail>
              <Actions>
                <Button size="xs" onClick={() => void openUrl(provider.installUrl)}>
                  <ExternalLink />
                  {m.ai.setup.install(provider.program)}
                </Button>
                <Button size="xs" variant="outline" onClick={() => void locate()}>
                  <FolderSearch />
                  {m.ai.setup.locate}
                </Button>
                {custom ? (
                  <Button size="xs" variant="ghost" onClick={() => void setBinary(null)}>
                    {m.ai.setup.autoDetect}
                  </Button>
                ) : (
                  <Button size="xs" variant="ghost" onClick={recheck} disabled={isFetching}>
                    <RefreshCw className={cn(isFetching && "motion-safe:animate-spin")} />
                    {m.ai.setup.detectAgain}
                  </Button>
                )}
              </Actions>
            </>
          )}
          {setup?.state === "broken" && (
            <>
              <Detail tone="error">{setup.error}</Detail>
              <Path bin={setup.bin} custom={custom} />
              <Actions>
                <Button size="xs" variant="outline" onClick={() => void locate()}>
                  <FolderSearch />
                  {m.ai.setup.chooseAnother}
                </Button>
                {custom && (
                  <Button size="xs" variant="ghost" onClick={() => void setBinary(null)}>
                    {m.ai.setup.autoDetect}
                  </Button>
                )}
              </Actions>
            </>
          )}
          {installed && (
            <>
              <Path bin={setup.bin} custom={custom} version={setup.version} />
              <Actions>
                <Button size="xs" variant="ghost" onClick={() => void locate()}>
                  <FolderSearch />
                  {m.ai.setup.change}
                </Button>
                {custom && (
                  <Button size="xs" variant="ghost" onClick={() => void setBinary(null)}>
                    {m.ai.setup.autoDetect}
                  </Button>
                )}
              </Actions>
            </>
          )}
        </Step>

        <Step
          n={2}
          state={
            !installed
              ? "blocked"
              : setup.state === "ready"
                ? "done"
                : isFetching
                  ? "checking"
                  : "todo"
          }
          title={m.ai.setup.signedIn}
          last
        >
          {!installed && <Detail>{m.ai.setup.needsFirst(provider.program)}</Detail>}
          {setup?.state === "signed-out" && provider.signIn && (
            <>
              <Detail>{m.ai.setup.signInBrowser(provider.vendor)}</Detail>
              <Actions>
                <Button size="xs" onClick={() => void signIn()} disabled={signingIn}>
                  <LogIn />
                  {m.ai.setup.signIn}
                </Button>
              </Actions>
              {signInError && <Detail tone="error">{signInError}</Detail>}
              <Detail>{m.ai.setup.orTerminal}</Detail>
              <Command text={provider.loginCommand} />
            </>
          )}
          {setup?.state === "signed-out" && !provider.signIn && (
            <>
              <Detail>{m.ai.setup.runInTerminal}</Detail>
              <Command text={provider.loginCommand} />
              <Actions>
                <Button size="xs" variant="outline" onClick={recheck} disabled={isFetching}>
                  <RefreshCw className={cn(isFetching && "motion-safe:animate-spin")} />
                  {m.ai.setup.iveSignedIn}
                </Button>
              </Actions>
            </>
          )}
          {setup?.state === "ready" && (
            <Detail>
              {[setup.account.email, setup.account.plan ?? setup.account.organization]
                .filter(Boolean)
                .join(" · ") || m.ai.setup.signedIn}
            </Detail>
          )}
        </Step>
      </ol>

      <Actions>
        <Button size="xs" variant="ghost" onClick={() => void openUrl(provider.guideUrl)}>
          <ExternalLink />
          {m.ai.setup.guide}
        </Button>
        <Button size="xs" variant="ghost" onClick={() => void openUrl(provider.plansUrl)}>
          <ExternalLink />
          {m.ai.setup.plans(provider.name)}
        </Button>
      </Actions>
    </div>
  );
}

function Step({
  n,
  state,
  title,
  last,
  children,
}: {
  n: number;
  state: StepState;
  title: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "num flex size-5 shrink-0 items-center justify-center rounded-full border text-xs",
            state === "done" && "border-brand bg-brand/15 text-brand",
            state === "todo" && "border-foreground text-foreground",
            state === "blocked" && "text-muted-foreground",
            state === "checking" && "text-muted-foreground",
          )}
          aria-label={
            state === "done"
              ? m.common.done
              : state === "checking"
                ? m.ai.setup.checking
                : m.ai.setup.step(n)
          }
        >
          {state === "done" ? (
            <Check className="size-3" />
          ) : state === "checking" ? (
            <LoaderCircle className="size-3 motion-safe:animate-spin" />
          ) : state === "todo" && n === 1 ? (
            <X className="size-3" />
          ) : (
            n
          )}
        </span>
        {!last && <span className="bg-border my-1 w-px flex-1" aria-hidden />}
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5", !last && "pb-4")}>
        <span className={cn("font-medium", state === "blocked" && "text-muted-foreground")}>
          {title}
        </span>
        {children}
      </div>
    </li>
  );
}

function Detail({ tone, children }: { tone?: "error"; children: ReactNode }) {
  return (
    <p
      className={cn(
        "text-xs leading-relaxed",
        tone === "error" ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function Path({ bin, custom, version }: { bin: string; custom: boolean; version?: string }) {
  return (
    <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs">
      {version && <span className="num text-foreground shrink-0">v{version}</span>}
      <span className="num truncate" title={bin}>
        {bin}
      </span>
      <span className="shrink-0">· {custom ? m.ai.setup.chosen : m.ai.setup.autoDetected}</span>
    </p>
  );
}

function Command({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="bg-muted/40 flex items-center gap-2 rounded-md border py-1 pr-1 pl-2.5">
      <code className="num flex-1 text-xs">
        <span className="text-muted-foreground select-none">$ </span>
        {text}
      </code>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={copied ? m.common.copied : m.ai.setup.copyCommand}
        title={copied ? m.common.copied : m.ai.setup.copyCommand}
        onClick={() => {
          void navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
    </div>
  );
}
