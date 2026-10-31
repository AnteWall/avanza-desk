import { cn } from "cn";

/** A muted placeholder block that pulses while data loads. Size it with `className`. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("bg-muted block rounded-sm motion-safe:animate-pulse", className)}
    />
  );
}
