import { cn } from "@/lib/utils";

/** AvanzaDesk mark: Avanza's rising bars standing on a desk. Source: src-tauri/icons/logo.svg. */
export function AppLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cn("size-5 shrink-0", className)}>
      <rect width="32" height="32" rx="7.5" className="fill-brand" />
      <g fill="white">
        <rect x="7" y="16.5" width="3" height="6" />
        <rect x="11.5" y="14.5" width="3" height="8" />
        <rect x="16" y="12" width="3" height="10.5" />
        <rect x="20.5" y="7.5" width="3" height="15" />
        <rect x="5" y="24" width="22" height="2" rx="1" />
      </g>
    </svg>
  );
}
