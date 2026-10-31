import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { AssistantPanel } from "@/components/ai/assistant-panel";
import { McpBridge } from "@/components/ai/mcp-bridge";
import { useAssistantEnabled } from "@/components/ai/use-assistant-enabled";
import { useChatOpen } from "@/components/ai/use-chat-open";
import { RuleDialog } from "@/components/alerts/rule-dialog";
import { AuthGate } from "@/components/auth/auth-gate";
import { NavRail } from "@/components/layout/nav-rail";
import { Notifier } from "@/components/layout/notifier";
import { RuleWatcher } from "@/components/layout/rule-watcher";
import { Snapshotter } from "@/components/layout/snapshotter";
import { StatusBar } from "@/components/layout/status-bar";
import { TopBar } from "@/components/layout/top-bar";
import { TradingFeed } from "@/components/layout/trading-feed";
import { Updater } from "@/components/layout/updater";
import { ResizeEdges } from "@/components/layout/window/resize-edges";
import { useInAppFrame } from "@/components/layout/window/use-in-app-frame";
import { Toaster } from "@/components/ui/sonner";
import { meQuery } from "@/lib/avanza/client";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useQuery(meQuery);
  const inAppFrame = useInAppFrame();
  const [chatOpen, toggleChat] = useChatOpen();
  const assistantEnabled = useAssistantEnabled();

  return (
    <div className="grid h-svh grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr_auto] overflow-hidden">
      {/* Mount anything that queries Avanza only with a confirmed session: earlier queries would
          race the keyring restore (and the 401 handler would wipe the stored session), and
          remounting after sign-in clears error states left over from the expired session. */}
      {me && (
        <>
          <TopBar chatOpen={chatOpen} onToggleChat={toggleChat} />
          <NavRail />
          <main className="min-h-0 min-w-0 p-1">{children}</main>
          {/* Its own column, so opening it never remounts the page. */}
          <aside className="min-h-0 py-1 pr-1 empty:hidden">
            {/* Remounts on connect, so it picks up the provider chosen in Settings. */}
            {chatOpen && <AssistantPanel key={String(assistantEnabled)} />}
          </aside>
          <StatusBar />
          {assistantEnabled && <McpBridge />}
          <Notifier />
          <Snapshotter />
          <RuleDialog />
          <RuleWatcher />
          <TradingFeed />
          {inAppFrame && <ResizeEdges />}
        </>
      )}
      <AuthGate />
      {/* Outside the session gate: updates need no Avanza sign-in. */}
      <Updater />
      <Toaster position="bottom-right" />
    </div>
  );
}
