import { cn } from "cn";

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
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex min-h-6 shrink-0 items-center gap-0.5 rounded-md border p-0.5",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "text-muted-foreground hover:text-foreground focus-visible:ring-ring aria-checked:bg-muted aria-checked:text-foreground h-5 rounded-sm px-2 text-xs whitespace-nowrap transition-colors outline-none focus-visible:ring-2 aria-checked:font-medium",
            numeric && "num",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
