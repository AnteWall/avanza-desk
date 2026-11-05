import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

import type { Phase } from "@/lib/ai/types";
import { m } from "@/lib/i18n";

/** The live line under a running answer: what Claude is doing and for how long. */
export function ChatStatus({ phase }: { phase: Phase }) {
  const [started] = useState(Date.now);
  const [now, setNow] = useState(started);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds = Math.floor((now - started) / 1000);
  return (
    <p role="status" className="text-muted-foreground flex items-center gap-2 text-xs">
      <LoaderCircle className="size-3.5 motion-safe:animate-spin" aria-hidden />
      <span className="motion-safe:text-shimmer motion-safe:animate-shimmer">
        {m.ai.status[phase]}…
      </span>
      {seconds > 0 && <span className="num ml-auto">{seconds} s</span>}
    </p>
  );
}
