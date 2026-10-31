import { useLocation, useNavigate } from "@tanstack/react-router";
import { cn } from "cn";

import { pages } from "@/components/layout/pages";
import { SettingsMenu } from "@/components/layout/settings-menu";
import { usePageShortcuts } from "@/components/layout/use-page-shortcuts";
import { Button } from "@/components/ui/button";

const itemClass =
  "text-muted-foreground data-[active=true]:bg-accent data-[active=true]:text-brand";

export function NavRail() {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });
  usePageShortcuts();

  return (
    <nav className="bg-card flex w-12 flex-col items-center gap-1 border-r py-2">
      {pages.map((item, i) => (
        <Button
          key={item.label}
          variant="ghost"
          size="icon"
          aria-label={item.label}
          title={`${item.label} (Alt ${i + 1})`}
          data-active={item.to === pathname}
          onClick={() => void navigate({ to: item.to })}
          className={itemClass}
        >
          <item.icon />
        </Button>
      ))}
      <SettingsMenu className={cn("mt-auto", itemClass)} />
    </nav>
  );
}
