import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut, Settings, SlidersHorizontal, SunMoon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { meQuery, signOut } from "@/lib/avanza/client";
import { getTheme, setTheme, type Theme } from "@/lib/theme";

const themes: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/** Settings button at the bottom of the nav rail: signed-in user, theme and sign out. */
export function SettingsMenu({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useQuery(meQuery);
  const [theme, setThemeState] = useState(getTheme);

  return (
    // Re-read on open: the settings page can change the theme too.
    <DropdownMenu onOpenChange={(open) => open && setThemeState(getTheme())}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Settings"
            title="Settings"
            className={className}
          />
        }
      >
        <Settings />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" sideOffset={8} className="w-56">
        {me && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-foreground text-sm">
                {me.greetingName}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <SunMoon />
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-32">
            <DropdownMenuRadioGroup
              value={theme}
              onValueChange={(value: Theme) => {
                void setTheme(value);
                setThemeState(value);
              }}
            >
              {themes.map((t) => (
                <DropdownMenuRadioItem key={t.value} value={t.value}>
                  {t.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem onClick={() => void navigate({ to: "/settings" })}>
          <SlidersHorizontal />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!me}
          onClick={() => void signOut(queryClient, { remote: true })}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
