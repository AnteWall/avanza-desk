import { openUrl } from "@tauri-apps/plugin-opener";
import { useEffect } from "react";

import { BankIdQr } from "@/components/auth/bankid-qr";
import { SuccessCheck } from "@/components/auth/success-check";
import { useBankIdLogin } from "@/components/auth/use-bankid-login";
import { SignedOutFrame } from "@/components/layout/window/window-frame";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const SUCCESS_HOLD_MS = 1400;

const failures = {
  denied: "Sign-in was cancelled in BankID.",
  expired: "The QR code expired. Start again to get a new one.",
  error: "Couldn't reach Avanza. Check your connection and try again.",
};

/** Fullscreen BankID sign-in that slides up over the app and slides away once signed in. */
export function SignInOverlay({ open, expired }: { open: boolean; expired: boolean }) {
  const { state, start, cancel, finish } = useBankIdLogin();

  useEffect(() => {
    if (state.step !== "success") return;
    const id = setTimeout(() => finish(state.user), SUCCESS_HOLD_MS);
    return () => clearTimeout(id);
  }, [state, finish]);

  return (
    <Dialog
      open={open}
      // Not dismissable: Esc only backs out of a running QR attempt.
      onOpenChange={(next) => !next && state.step === "qr" && cancel()}
      onOpenChangeComplete={(next) => !next && cancel()}
    >
      <DialogContent
        showCloseButton={false}
        className="bg-background ease-sheet inset-0 top-0 left-0 flex max-w-none translate-x-0 translate-y-0 flex-col items-center justify-center rounded-none p-6 ring-0 transition-[translate,opacity] duration-500 data-closed:animate-none data-ending-style:translate-y-full data-ending-style:duration-400 data-ending-style:ease-in-out data-open:animate-none data-starting-style:translate-y-full motion-reduce:data-ending-style:translate-y-0 motion-reduce:data-ending-style:opacity-0 motion-reduce:data-starting-style:translate-y-0 motion-reduce:data-starting-style:opacity-0 sm:max-w-none"
      >
        <SignedOutFrame />
        <div
          key={state.step}
          className="animate-in fade-in-0 flex w-full max-w-xs flex-col items-center gap-6 text-center duration-300"
        >
          {state.step === "start" && (
            <>
              <span className="bg-brand size-4 rotate-45 rounded-xs" aria-hidden />
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xl font-semibold">Sign in to AvanzaDesk</DialogTitle>
                <DialogDescription>
                  {expired
                    ? "Your session has expired. Sign in again to continue."
                    : "Sign in with BankID to see your accounts and trade."}
                </DialogDescription>
              </div>
              <Button size="lg" className="w-full" onClick={() => void start()}>
                Sign in with BankID
              </Button>
            </>
          )}

          {state.step === "qr" && (
            <>
              <DialogTitle className="text-xl font-semibold">Scan with BankID</DialogTitle>
              <div className="flex flex-col items-center gap-3">
                <BankIdQr payload={state.challenge.qrPayload} />
                {/* Time left on the 120s BankID attempt. */}
                <div className="bg-muted h-0.5 w-56 overflow-hidden rounded-full">
                  <div
                    key={state.startedAt}
                    className="bg-brand animate-countdown h-full origin-left motion-reduce:animate-none"
                  />
                </div>
              </div>
              <DialogDescription>
                Open the BankID app on your phone, tap the QR icon and point the camera here.
              </DialogDescription>
              <div className="flex w-full flex-col gap-1">
                {state.challenge.autostartUrl && (
                  <Button
                    variant="outline"
                    onClick={() => void openUrl(state.challenge.autostartUrl!)}
                  >
                    Open BankID on this computer
                  </Button>
                )}
                <Button variant="ghost" className="text-muted-foreground" onClick={cancel}>
                  Cancel
                </Button>
              </div>
            </>
          )}

          {state.step === "success" && (
            <>
              <SuccessCheck />
              <div className="animate-rise flex flex-col gap-2 motion-reduce:animate-none">
                <DialogTitle className="text-xl font-semibold">
                  Welcome, {state.user.greetingName}
                </DialogTitle>
                <DialogDescription>You're signed in.</DialogDescription>
              </div>
            </>
          )}

          {state.step === "failed" && (
            <>
              <span className="bg-brand size-4 rotate-45 rounded-xs" aria-hidden />
              <div className="flex flex-col gap-2">
                <DialogTitle className="text-xl font-semibold">Sign in to AvanzaDesk</DialogTitle>
                <DialogDescription className="text-destructive">
                  {failures[state.reason]}
                </DialogDescription>
              </div>
              <Button size="lg" className="w-full" onClick={() => void start()}>
                Try again
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
