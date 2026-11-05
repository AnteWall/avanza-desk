import { type RouterHistory, useRouter } from "@tanstack/react-router";
import { listen } from "@tauri-apps/api/event";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/lib/i18n";

/**
 * Back and forward through the pages you visited. Also on the mouse's side buttons,
 * Cmd+[ / Cmd+] and Alt+Left / Alt+Right, which the webview doesn't do on its own.
 */
const index = (h: RouterHistory) => h.location.state.__TSR_index;

export function HistoryButtons() {
  const { history } = useRouter();
  const [at, setAt] = useState(() => index(history));
  // The furthest entry you can go forward to; a new navigation drops everything after it.
  const [end, setEnd] = useState(() => index(history));

  useEffect(
    () =>
      history.subscribe(({ action }) => {
        const i = index(history);
        setAt(i);
        setEnd((e) => (action.type === "PUSH" ? i : Math.max(e, i)));
      }),
    [history],
  );

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      if (e.button !== 3 && e.button !== 4) return;
      // Cancel the webview's own navigation (WebView2 does one) so it doesn't go twice.
      e.preventDefault();
      if (e.type === "mouseup") history.go(e.button === 3 ? -1 : 1);
    };
    const onKey = (e: KeyboardEvent) => {
      // Alt+arrows move by word in text fields; leave them be there.
      const t = e.target as HTMLElement;
      const alt = e.altKey && !t.isContentEditable && !/^(INPUT|TEXTAREA)$/.test(t.tagName);
      const back = (e.metaKey && e.code === "BracketLeft") || (alt && e.key === "ArrowLeft");
      const forward = (e.metaKey && e.code === "BracketRight") || (alt && e.key === "ArrowRight");
      if (!back && !forward) return;
      e.preventDefault();
      history.go(back ? -1 : 1);
    };
    // macOS sends some side buttons as swipes or aux events; see src-tauri/src/mouse_nav.rs.
    const unlisten = listen<"back" | "forward">("history-nav", ({ payload }) =>
      history.go(payload === "back" ? -1 : 1),
    );
    window.addEventListener("mousedown", onMouse);
    window.addEventListener("mouseup", onMouse);
    window.addEventListener("keydown", onKey);
    return () => {
      void unlisten.then((f) => f());
      window.removeEventListener("mousedown", onMouse);
      window.removeEventListener("mouseup", onMouse);
      window.removeEventListener("keydown", onKey);
    };
  }, [history]);

  return (
    <div className="flex shrink-0 items-center">
      <Button
        variant="ghost"
        size="icon"
        aria-label={m.layout.history.back}
        title={m.layout.history.back}
        disabled={at === 0}
        onClick={() => history.back()}
      >
        <ArrowLeft />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={m.layout.history.forward}
        title={m.layout.history.forward}
        disabled={at >= end}
        onClick={() => history.forward()}
      >
        <ArrowRight />
      </Button>
    </div>
  );
}
