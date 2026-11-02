import { Link, Outlet } from "@tanstack/react-router";
import { Bell, Keyboard, Monitor, PanelBottom, RefreshCw, Sparkles } from "lucide-react";

import { Panel } from "@/components/workspace/panel";

const categories = [
  { to: "/settings/general", label: "General", icon: Monitor },
  { to: "/settings/data", label: "Data", icon: RefreshCw },
  { to: "/settings/notifications", label: "Notifications", icon: Bell },
  { to: "/settings/status-bar", label: "Status bar", icon: PanelBottom },
  { to: "/settings/shortcuts", label: "Shortcuts", icon: Keyboard },
  { to: "/settings/assistant", label: "Assistant", icon: Sparkles },
] as const;

/** Settings frame: category list on the left, the selected category's route on the right. */
export function SettingsLayout() {
  return (
    <Panel title="Settings">
      <div className="flex h-full min-h-0">
        <nav
          aria-label="Settings categories"
          className="flex w-48 shrink-0 flex-col gap-0.5 border-r p-1"
        >
          {categories.map((c) => (
            <Link
              key={c.to}
              to={c.to}
              className="text-muted-foreground hover:bg-muted/60 hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground flex h-8 items-center gap-2 rounded-sm px-2.5 transition-colors"
            >
              <c.icon className="size-4" aria-hidden />
              {c.label}
            </Link>
          ))}
        </nav>
        <div className="min-w-0 flex-1 overflow-auto">
          <div className="max-w-2xl">
            <Outlet />
          </div>
        </div>
      </div>
    </Panel>
  );
}
