import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { RuleDialog } from "@/components/alerts/rule-dialog";
import { AuthGate } from "@/components/auth/auth-gate";
import { QuoteFeed } from "@/components/layout/quote-feed";
import { Toaster } from "@/components/ui/sonner";
import { meQuery } from "@/lib/avanza/client";

/**
 * The frame of a pop-out window: just the page, with the OS title bar. The main window keeps
 * the app-wide work (notifications, rule checks, snapshots) so nothing runs twice.
 */
export function PopoutShell({ children }: { children: ReactNode }) {
  const { data: me } = useQuery(meQuery);
  return (
    <div className="h-svh overflow-hidden p-1">
      {me && (
        <>
          {children}
          <QuoteFeed />
          <RuleDialog />
        </>
      )}
      <AuthGate />
      <Toaster position="bottom-right" />
    </div>
  );
}
