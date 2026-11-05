import { ChatToggle } from "@/components/ai/chat-toggle";
import { AsyncBoundary } from "@/components/common/async-boundary";
import { Skeleton } from "@/components/common/skeleton";
import { AccountPicker } from "@/components/layout/account-picker";
import { AppLogo } from "@/components/layout/app-logo";
import { DailyPerformance } from "@/components/layout/daily-performance";
import { HistoryButtons } from "@/components/layout/history-buttons";
import { IndexTicker } from "@/components/layout/index-ticker";
import { InstrumentSearch } from "@/components/layout/instrument-search";
import { PrivacyToggle } from "@/components/layout/privacy-toggle";
import { useInAppFrame } from "@/components/layout/window/use-in-app-frame";
import { WindowControls } from "@/components/layout/window/window-controls";
import { m } from "@/lib/i18n";

const tickerSkeleton = [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-3 w-24" />);
const divider = <span className="bg-border h-6 w-px shrink-0" aria-hidden />;

/**
 * Left to right: brand, your money (the account picker scopes the numbers next to it), search
 * in the middle, then the market, your tools and the window controls.
 */
export function TopBar({
  chatOpen,
  onToggleChat,
}: {
  chatOpen: boolean;
  onToggleChat: () => void;
}) {
  const inAppFrame = useInAppFrame();
  // With in-app controls the bar is the title bar: drag it (empty space and the logo) to move
  // the window, double-click to maximize.
  const drag = inAppFrame || undefined;
  return (
    <header
      data-tauri-drag-region={drag}
      className="bg-card col-span-3 flex h-12 items-center gap-4 border-b px-3 select-none"
    >
      <div data-tauri-drag-region={drag} className="flex shrink-0 items-center gap-2 font-semibold">
        <AppLogo />
        <span>
          Avanza<span className="text-muted-foreground font-normal">{"Desk"}</span>
        </span>
      </div>
      <HistoryButtons />
      {divider}
      <div className="flex shrink-0 items-center gap-2">
        <AccountPicker />
        <AsyncBoundary
          what={m.layout.dailyPerformance.what}
          fallback={<Skeleton className="h-7 w-64" />}
          compact
        >
          <DailyPerformance />
        </AsyncBoundary>
      </div>
      <div data-tauri-drag-region={drag} className="flex min-w-48 flex-1 justify-center">
        <InstrumentSearch />
      </div>
      <div
        data-tauri-drag-region={drag}
        className="flex min-w-0 items-center gap-5 overflow-hidden"
      >
        <AsyncBoundary what={m.layout.indices} fallback={tickerSkeleton} compact>
          <IndexTicker />
        </AsyncBoundary>
      </div>
      {divider}
      <div className="flex shrink-0 items-center gap-1">
        <PrivacyToggle />
        <ChatToggle open={chatOpen} onToggle={onToggleChat} />
      </div>
      {inAppFrame && <WindowControls />}
    </header>
  );
}
