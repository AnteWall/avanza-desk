import { cn } from "cn";
import { useLayoutEffect, useRef } from "react";

/**
 * Pick one of a few options (chart ranges, views, presets): a framed group where the chosen
 * segment is filled. For one-off actions use a Button instead, never this.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  numeric,
  className,
}: {
  options: readonly { label: string; value: T; title?: string }[];
  /** No match (e.g. a typed value off the presets) leaves every segment unselected. */
  value: T | undefined;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label: string;
  /** Labels are numbers (ranges, years): set them in the numeral font. */
  numeric?: boolean;
  className?: string;
}) {
  const groupRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  // The fill slides to the chosen segment. Written to the DOM directly: no re-render, and it
  // re-measures when the group resizes (text size setting, late font load).
  useLayoutEffect(() => {
    const group = groupRef.current;
    const thumb = thumbRef.current;
    if (!group || !thumb) return;
    const place = () => {
      const on = group.querySelector<HTMLElement>('[aria-checked="true"]');
      thumb.style.opacity = on ? "1" : "0";
      if (!on) return;
      thumb.style.left = `${on.offsetLeft}px`;
      thumb.style.width = `${on.offsetWidth}px`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(group);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative inline-flex min-h-6 shrink-0 items-center gap-0.5 rounded-md border p-0.5",
        className,
      )}
    >
      <span
        ref={thumbRef}
        aria-hidden
        className="bg-muted ease-out-quint absolute inset-y-0.5 rounded-sm opacity-0 transition-[left,width,opacity] duration-200"
      />
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "text-muted-foreground hover:text-foreground focus-visible:ring-ring aria-checked:text-foreground relative h-5 rounded-sm px-2 text-xs whitespace-nowrap transition-colors outline-none focus-visible:ring-2 aria-checked:font-medium",
            numeric && "num",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
