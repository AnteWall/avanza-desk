import { useLocation, useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";

import { BasketMenu } from "@/components/basket/basket-menu";
import { pages } from "@/components/layout/pages";
import { SettingsMenu } from "@/components/layout/settings-menu";
import { usePageShortcuts } from "@/components/layout/use-page-shortcuts";
import { useShortcutBindings } from "@/components/layout/use-shortcuts";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDensity } from "@/lib/density";
import { m } from "@/lib/i18n";
import { getSetting, saveSetting } from "@/lib/settings";
import { bindingKeys, getBinding } from "@/lib/shortcuts";

const LABELS_KEY = "navLabels";

// Same shape collapsed and expanded (icon at a fixed spot, name clipped away), so the rail's
// width can animate. The active fill is the sliding highlight below, not the button's own.
const itemClass =
  "text-muted-foreground relative w-full justify-start gap-2.5 overflow-hidden px-2 data-[active=true]:text-brand data-[active=true]:hover:bg-transparent";

/**
 * The page buttons; hovering one says what the page is for and its Alt shortcut. Shows page
 * names next to the icons until you collapse it (default follows the text size: comfortable
 * starts with names, compact with icons only).
 */
export function NavRail() {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });
  const [labels, setLabels] = useState(() =>
    getSetting(LABELS_KEY, getDensity() === "comfortable"),
  );
  usePageShortcuts();
  useShortcutBindings();
  const navRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);
  // The highlight slides to the active page (or Settings) instead of jumping between buttons.
  useLayoutEffect(() => {
    const nav = navRef.current;
    const highlight = highlightRef.current;
    if (!nav || !highlight) return;
    const on = nav.querySelector<HTMLElement>('[data-active="true"]');
    // On launch it just appears where it belongs; it only slides on later page changes.
    if (!placed.current) highlight.style.transition = "none";
    highlight.style.opacity = on ? "1" : "0";
    if (on) highlight.style.transform = `translateY(${on.offsetTop}px)`;
    if (!placed.current) {
      void highlight.offsetWidth; // commit the jump before transitions come back
      highlight.style.transition = "";
      placed.current = true;
    }
  }, [pathname]);
  const labelClass = cn(
    "truncate transition-opacity duration-200 ease-out-quint",
    !labels && "opacity-0",
  );
  const toggle = () => {
    setLabels(!labels);
    void saveSetting(LABELS_KEY, !labels);
  };

  return (
    <nav
      ref={navRef}
      className={cn(
        "bg-card ease-out-quint relative flex flex-col gap-1 overflow-hidden border-r px-2 py-2 transition-[width] duration-250",
        labels ? "w-44" : "w-12",
      )}
    >
      <span
        ref={highlightRef}
        aria-hidden
        className="bg-accent ease-out-quint absolute inset-x-2 top-0 h-8 rounded-md opacity-0 transition-[transform,opacity] duration-250"
      />
      {/* One provider: after the first tooltip, moving down the rail switches them instantly. */}
      <TooltipProvider delay={400}>
        {pages.map((item) => (
          <Tooltip key={item.label}>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  aria-label={item.label}
                  data-active={item.to === pathname}
                  onClick={() => void navigate({ to: item.to })}
                  className={itemClass}
                />
              }
            >
              <item.icon />
              <span className={labelClass}>{item.label}</span>
            </TooltipTrigger>
            <TooltipContent side="right" className="w-64 flex-col items-start gap-1 py-2">
              <span className="flex w-full items-center gap-2">
                <span className="font-semibold">{item.label}</span>
                <KbdGroup className="ml-auto">
                  {bindingKeys(getBinding(`page:${item.to}`)).map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </KbdGroup>
              </span>
              <span className="leading-relaxed opacity-75">{item.description}</span>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
      <BasketMenu
        className={itemClass}
        labelClassName={labelClass}
        active={pathname === "/basket"}
      />
      <Button
        variant="ghost"
        aria-label={labels ? m.layout.nav.hideNames : m.layout.nav.showNames}
        title={labels ? m.layout.nav.hideNames : m.layout.nav.showNames}
        onClick={toggle}
        className={itemClass}
      >
        {labels ? <PanelLeftClose /> : <PanelLeftOpen />}
        <span className={labelClass}>{m.layout.nav.collapse}</span>
      </Button>
      <SettingsMenu
        className={itemClass}
        labelClassName={labelClass}
        active={pathname.startsWith("/settings")}
      />
    </nav>
  );
}
