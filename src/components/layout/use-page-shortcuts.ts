import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { pages } from "@/components/layout/pages";
import { getBinding, matches } from "@/lib/shortcuts";

/** Each page's shortcut (Alt+1…9, then Alt+0, unless rebound) opens it. */
export function usePageShortcuts() {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const page = pages.find((p) => matches(e, getBinding(`page:${p.to}`)));
      if (!page) return;
      e.preventDefault();
      void navigate({ to: page.to });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
}
