import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowUpRight, Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RELEASES_URL, REPO_URL, releaseUrl, type Release } from "@/lib/changelog";
import { formatDate } from "@/lib/format";

/** Release notes grouped New / Fixed / Faster; with several releases each gets its version. */
export function ReleaseNotesDialog({
  open,
  onClose,
  releases,
  description,
}: {
  open: boolean;
  onClose: () => void;
  releases: readonly Release[];
  description: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="gap-0 p-0 sm:max-w-lg"
        // A moment to read, not a quick pick: dim and blur the app behind it.
        overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-sm"
      >
        <DialogHeader className="p-4 pb-3">
          <DialogTitle>What's new in AvanzaDesk</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto border-t p-4">
          {releases.map((release) => (
            <section key={release.version} className="flex flex-col gap-3">
              {releases.length > 1 && (
                <h3 className="text-muted-foreground flex items-baseline gap-2 text-xs">
                  <span className="num text-foreground font-semibold">v{release.version}</span>
                  {release.date && <span className="num">{formatDate(release.date)}</span>}
                  <button
                    type="button"
                    onClick={() => void openUrl(releaseUrl(release.version))}
                    className="hover:text-foreground ml-auto inline-flex cursor-pointer items-center gap-0.5 transition-colors"
                  >
                    On GitHub
                    <ArrowUpRight className="size-3" aria-hidden />
                  </button>
                </h3>
              )}
              {release.groups.map((group) => (
                <div key={group.title} className="flex flex-col gap-1.5">
                  <h4 className="text-xs font-semibold tracking-wider uppercase">{group.title}</h4>
                  <ul className="flex flex-col gap-1.5">
                    {group.items.map((item) => (
                      <li key={item.text} className="flex gap-2">
                        <span className="bg-brand mt-[0.45rem] size-1.5 shrink-0 rounded-full" />
                        <span>
                          {item.breaking && (
                            <span className="text-warning font-medium">Breaking: </span>
                          )}
                          {item.scope && <span className="font-medium">{item.scope}: </span>}
                          <span className="text-muted-foreground">{item.text}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
        <DialogFooter className="m-0 rounded-b-xl sm:justify-between">
          <div className="flex gap-1">
            <Button variant="ghost" onClick={() => void openUrl(RELEASES_URL)}>
              All releases
              <ArrowUpRight aria-hidden />
            </Button>
            <Button variant="ghost" onClick={() => void openUrl(`${REPO_URL}/stargazers`)}>
              <Star aria-hidden />
              Star on GitHub
            </Button>
          </div>
          <Button onClick={onClose}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
