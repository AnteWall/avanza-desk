import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/lib/i18n";

/** Minimize, maximize/restore and close, at the right end of the top bar. */
export function WindowControls() {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    const win = getCurrentWindow();
    const sync = () => void win.isMaximized().then(setMaximized);
    sync();
    const unlisten = win.onResized(sync);
    return () => void unlisten.then((f) => f());
  }, []);

  const win = getCurrentWindow();
  return (
    <div className="-mr-1.5 flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon"
        aria-label={m.layout.window.minimize}
        title={m.layout.window.minimize}
        onClick={() => void win.minimize()}
      >
        <Minus />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={maximized ? m.layout.window.restore : m.layout.window.maximize}
        title={maximized ? m.layout.window.restore : m.layout.window.maximize}
        onClick={() => void win.toggleMaximize()}
      >
        {maximized ? <Copy className="size-3.5" /> : <Square className="size-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={m.common.close}
        title={m.common.close}
        className="hover:bg-destructive hover:text-white"
        onClick={() => void win.close()}
      >
        <X />
      </Button>
    </div>
  );
}
