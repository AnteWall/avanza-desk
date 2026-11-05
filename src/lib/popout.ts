import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { toast } from "sonner";

import { m } from "@/lib/i18n";

/** Opens (or brings forward) a window pinned to one instrument: its chart and order book. */
export async function openPopout(id: string, name: string, type?: string) {
  // One window per instrument; labels allow only letters, digits and - / : _.
  const label = `popout-${id.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const open = await WebviewWindow.getByLabel(label);
  if (open) return open.setFocus();
  const search = new URLSearchParams({ ob: id, ...(type ? { type } : {}) });
  const window = new WebviewWindow(label, {
    url: `/popout?${search}`,
    title: `${name} · AvanzaDesk`,
    width: 960,
    height: 640,
    minWidth: 560,
    minHeight: 400,
  });
  void window.once("tauri://error", (e) =>
    toast.error(m.workspace.popoutError, { description: String(e.payload) }),
  );
}
