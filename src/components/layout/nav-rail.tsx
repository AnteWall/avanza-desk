import { useLocation, useNavigate } from "@tanstack/react-router";
import { cn } from "cn";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";

import { pages } from "@/components/layout/pages";
import { SettingsMenu } from "@/components/layout/settings-menu";
import { usePageShortcuts } from "@/components/layout/use-page-shortcuts";
import { useShortcutBindings } from "@/components/layout/use-shortcuts";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getDensity } from "@/lib/density";
import { getSetting, saveSetting } from "@/lib/settings";
import { bindingKeys, getBinding } from "@/lib/shortcuts";

const LABELS_KEY = "navLabels";

const itemClass =
  "text-muted-foreground data-[active=true]:bg-accent data-[active=true]:text-brand";

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
  const toggle = () => {
    setLabels(!labels);
    void saveSetting(LABELS_KEY, !labels);
  };

  return (
    <nav
      className={cn(
        "bg-card flex flex-col gap-1 border-r py-2",
        labels ? "w-44 items-stretch px-2" : "w-12 items-center",
      )}
    >
      {/* One provider: after the first tooltip, moving down the rail switches them instantly. */}
      <TooltipProvider delay={400}>
        {pages.map((item) => (
          <Tooltip key={item.label}>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size={labels ? "default" : "icon"}
                  aria-label={item.label}
                  data-active={item.to === pathname}
                  onClick={() => void navigate({ to: item.to })}
                  className={cn(itemClass, labels && "justify-start gap-2.5")}
                />
              }
            >
              <item.icon />
              {labels && <span className="truncate">{item.label}</span>}
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
      <Button
        variant="ghost"
        size={labels ? "default" : "icon"}
        aria-label={labels ? "Hide page names" : "Show page names"}
        title={labels ? "Hide page names" : "Show page names"}
        onClick={toggle}
        className={cn("mt-auto", itemClass, labels && "justify-start gap-2.5")}
      >
        {labels ? <PanelLeftClose /> : <PanelLeftOpen />}
        {labels && <span className="truncate">Collapse</span>}
      </Button>
      <SettingsMenu className={itemClass} />
    </nav>
  );
}
