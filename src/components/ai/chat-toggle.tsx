import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { m } from "@/lib/i18n";

/** Top-bar button that opens and closes the AI assistant (Ctrl+J). */
export function ChatToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={m.ai.toggle}
      aria-pressed={open}
      title={m.ai.toggle}
      onClick={onToggle}
    >
      <Sparkles className={open ? "text-brand" : undefined} />
    </Button>
  );
}
