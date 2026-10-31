import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Top-bar button that opens and closes the AI assistant (Ctrl+J). */
export function ChatToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Assistant (Ctrl+J)"
      aria-pressed={open}
      title="Assistant (Ctrl+J)"
      onClick={onToggle}
    >
      <Sparkles className={open ? "text-brand" : undefined} />
    </Button>
  );
}
