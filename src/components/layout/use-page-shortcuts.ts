import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { pages } from "@/components/layout/pages";

/** Alt+1… opens the pages in nav-rail order. */
export function usePageShortcuts() {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // `code`, not `key`: Alt+digit types other characters on some layouts.
      if (!e.altKey || e.ctrlKey || e.metaKey || !e.code.startsWith("Digit")) return;
      const page = pages[Number(e.code.slice("Digit".length)) - 1];
      if (!page) return;
      e.preventDefault();
      void navigate({ to: page.to });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
}
