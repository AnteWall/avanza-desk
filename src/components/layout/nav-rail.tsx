import { useLocation, useNavigate } from "@tanstack/react-router";
import { cn } from "cn";

import { pageDigit, pages } from "@/components/layout/pages";
import { SettingsMenu } from "@/components/layout/settings-menu";
import { usePageShortcuts } from "@/components/layout/use-page-shortcuts";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const itemClass =
  "text-muted-foreground data-[active=true]:bg-accent data-[active=true]:text-brand";

/** The page buttons; hovering one says what the page is for and its Alt shortcut. */
export function NavRail() {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });
  usePageShortcuts();

  return (
    <nav className="bg-card flex w-12 flex-col items-center gap-1 border-r py-2">
      {/* One provider: after the first tooltip, moving down the rail switches them instantly. */}
      <TooltipProvider delay={400}>
        {pages.map((item, i) => (
          <Tooltip key={item.label}>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={item.label}
                  data-active={item.to === pathname}
                  onClick={() => void navigate({ to: item.to })}
                  className={itemClass}
                />
              }
            >
              <item.icon />
            </TooltipTrigger>
            <TooltipContent side="right" className="w-64 flex-col items-start gap-1 py-2">
              <span className="flex w-full items-center gap-2">
                <span className="font-semibold">{item.label}</span>
                <KbdGroup className="ml-auto">
                  <Kbd>Alt</Kbd>
                  <Kbd>{pageDigit(i)}</Kbd>
                </KbdGroup>
              </span>
              <span className="leading-relaxed opacity-75">{item.description}</span>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
      <SettingsMenu className={cn("mt-auto", itemClass)} />
    </nav>
  );
}
