import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Gift, Lightbulb, LogOut, Settings, SlidersHorizontal, SunMoon } from "lucide-react";
import { useState } from "react";

import { ReleaseNotesDialog } from "@/components/common/release-notes-dialog";
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
import { ideaUrl, notesFor } from "@/lib/changelog";
import { m } from "@/lib/i18n";
import { getTheme, setTheme, type Theme } from "@/lib/theme";

const themes: { value: Theme; label: string }[] = [
  { value: "light", label: m.layout.settingsMenu.themes.light },
  { value: "dark", label: m.layout.settingsMenu.themes.dark },
  { value: "system", label: m.layout.settingsMenu.themes.system },
];

/** Settings button at the bottom of the nav rail: user, theme, settings, what's new, suggest a feature, sign out. */
export function SettingsMenu({
  className,
  labelClassName,
  active,
}: {
  className?: string;
  /** Styles the "Settings" name beside the icon (the nav rail fades it when collapsed). */
  labelClassName?: string;
  /** A settings page is open: the nav rail highlights this button. */
  active?: boolean;
}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: me } = useQuery(meQuery);
  const [theme, setThemeState] = useState(getTheme);
  const { data: version } = useQuery({
    queryKey: ["app", "version"],
    queryFn: getVersion,
    staleTime: Infinity,
  });
  const notes = notesFor(version);
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <>
      {/* Re-read on open: the settings page can change the theme too. */}
      <DropdownMenu onOpenChange={(open) => open && setThemeState(getTheme())}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              aria-label={m.common.settings}
              title={m.common.settings}
              data-active={active}
              className={className}
            />
          }
        >
          <Settings />
          <span className={labelClassName}>{m.common.settings}</span>
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
              {m.layout.settingsMenu.theme}
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
            {m.common.settings}
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!notes} onClick={() => setNotesOpen(true)}>
            <Gift />
            {m.layout.settingsMenu.whatsNew}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => void openUrl(ideaUrl(version))}>
            <Lightbulb />
            {m.layout.settingsMenu.suggestFeature}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={!me}
            onClick={() => void signOut(queryClient, { remote: true })}
          >
            <LogOut />
            {m.layout.settingsMenu.signOut}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Beside the menu, not in it: the menu unmounts its content when it closes. */}
      {notes && (
        <ReleaseNotesDialog
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
          releases={[notes]}
          description={m.common.version(notes.version)}
        />
      )}
    </>
  );
}
