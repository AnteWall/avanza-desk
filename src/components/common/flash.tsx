import { cn } from "cn";
import { useState, type ReactNode } from "react";

/**
 * Wraps a live number and tints it up/down for 600ms each time `value` changes. Remounting the
 * span (new `key`) restarts the animation on every tick.
 */
export function Flash({
  value,
  children,
  className,
}: {
  value: number | null | undefined;
  children: ReactNode;
  className?: string;
}) {
  const [last, setLast] = useState(value);
  const [tick, setTick] = useState({ n: 0, dir: 0 });
  if (value !== last) {
    setLast(value);
    if (value != null && last != null) setTick({ n: tick.n + 1, dir: Math.sign(value - last) });
  }
  return (
    <span
      key={tick.n}
      className={cn(
        "rounded-sm",
        0 < tick.dir && "motion-safe:animate-flash-up",
        tick.dir < 0 && "motion-safe:animate-flash-down",
        className,
      )}
    >
      {children}
    </span>
  );
}
