/**
 * Today's weight as a filled bar, the target as a tick on it, both on a shared `scale` (the
 * largest weight or target in the plan), so a gap between fill and tick reads as drift.
 */
export function WeightBar({
  weight,
  target,
  scale,
}: {
  weight: number;
  target: number;
  scale: number;
}) {
  const at = (v: number) => `${Math.min(v / (scale || 1), 1) * 100}%`;
  return (
    <span className="bg-muted relative ml-auto block h-1.5 w-28 rounded-full" aria-hidden>
      <span
        className="bg-muted-foreground/60 absolute inset-y-0 left-0 rounded-full"
        style={{ width: at(weight) }}
      />
      <span
        className="bg-foreground absolute -top-1 h-3.5 w-0.5 -translate-x-1/2 rounded-full"
        style={{ left: at(target) }}
      />
    </span>
  );
}
