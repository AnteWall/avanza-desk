import { cn } from "cn";

/** A tiny AvanzaDesk drawn in one theme's tokens: top bar, nav rail and a panel of rows. */
export function ThemePreview({
  theme,
  className,
}: {
  theme: "light" | "dark";
  className?: string;
}) {
  return (
    <div aria-hidden className={cn(theme, "bg-background flex flex-col gap-0.5 p-0.5", className)}>
      <div className="bg-card flex h-2.5 items-center gap-1 rounded-xs px-1">
        <span className="bg-brand size-1 rounded-full" />
        <span className="bg-muted h-1 w-6 rounded-full" />
      </div>
      <div className="flex min-h-0 flex-1 gap-0.5">
        <div className="bg-card flex w-2.5 flex-col items-center gap-1 rounded-xs py-1">
          <span className="bg-brand size-1 rounded-full" />
          <span className="bg-muted-foreground/50 size-1 rounded-full" />
          <span className="bg-muted-foreground/50 size-1 rounded-full" />
        </div>
        <div className="bg-card flex flex-1 flex-col gap-1 rounded-xs p-1">
          {["bg-up", "bg-down", "bg-up"].map((color, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <span className="bg-foreground/70 h-1 w-8 rounded-full" />
              <span className={cn(color, "h-1 w-3 rounded-full")} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
