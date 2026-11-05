import { Link } from "@tanstack/react-router";
import { Settings, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { m } from "@/lib/i18n";

/** A tiny assistant conversation drawn in tokens: a question, an answer with a rising chart. */
function ChatIllustration() {
  return (
    <div aria-hidden className="relative w-48">
      <div className="bg-muted/40 flex flex-col gap-2 rounded-lg border p-3">
        <span className="bg-muted h-3 w-24 self-end rounded-md" />
        <span className="bg-muted-foreground/40 h-1.5 w-full rounded-full" />
        <span className="bg-muted-foreground/40 h-1.5 w-4/5 rounded-full" />
        <svg viewBox="0 0 100 28" className="text-up h-8 w-full rounded-sm border">
          <polyline
            points="0,24 14,20 26,22 40,14 54,16 68,9 82,11 100,3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span className="bg-muted-foreground/40 h-1.5 w-3/5 rounded-full" />
      </div>
      <span className="bg-card text-brand absolute -top-3 -right-3 flex size-8 items-center justify-center rounded-full border">
        <Sparkles className="size-4" />
      </span>
    </div>
  );
}

/** The assistant panel while the assistant is off: a pointer to Settings, where it's set up. */
export function AssistantOff() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
      <ChatIllustration />
      <div className="flex max-w-64 flex-col gap-1.5">
        <span className="font-semibold">{m.ai.off.title}</span>
        <span className="text-muted-foreground text-xs leading-relaxed">{m.ai.off.body}</span>
      </div>
      <Button render={<Link to="/settings/assistant" />}>
        <Settings />
        {m.ai.off.setUp}
      </Button>
    </div>
  );
}
