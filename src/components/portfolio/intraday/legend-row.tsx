import { cn } from "cn";

import { Change } from "@/components/common/change";

export /** A legend row: line swatch, name and change now. Clickable rows toggle their line. */
function LegendRow({
  label,
  swatch,
  value,
  strong,
  dashed,
  pressed,
  onClick,
  onHover,
}: {
  label: string;
  swatch?: string;
  value?: number;
  strong?: boolean;
  dashed?: boolean;
  pressed?: boolean;
  onClick?: () => void;
  onHover?: (over: boolean) => void;
}) {
  const content = (
    <>
      <span
        aria-hidden
        className={cn(
          "w-3 shrink-0 rounded-full",
          dashed ? "border-t-2 border-dotted" : strong ? "h-1" : "h-0.5",
        )}
        style={dashed ? { borderColor: swatch } : { background: swatch ?? "var(--border)" }}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          strong ? "font-medium" : !swatch && "text-muted-foreground",
        )}
      >
        {label}
      </span>
      {value == null ? (
        <span className="num text-muted-foreground">–</span>
      ) : (
        <Change ratio={value} className={cn(strong && "font-medium")} />
      )}
    </>
  );
  const row = "flex h-7 w-full items-center gap-2 px-3 text-left";
  return (
    <li>
      {onClick ? (
        <button
          type="button"
          aria-pressed={pressed}
          className={cn(row, "hover:bg-muted/60 transition-colors")}
          onClick={onClick}
          onMouseEnter={() => onHover?.(true)}
          onMouseLeave={() => onHover?.(false)}
          onFocus={() => onHover?.(true)}
          onBlur={() => onHover?.(false)}
        >
          {content}
        </button>
      ) : (
        <div className={row}>{content}</div>
      )}
    </li>
  );
}
