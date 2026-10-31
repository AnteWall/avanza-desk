import { cn } from "cn";
import { useState } from "react";

// Elbstream serves logos keyed by ISIN; unknown ISINs return 404 and fall back to an initial.
const logoUrl = (isin: string) =>
  `https://api.elbstream.com/logos/isin/${isin}?format=webp&size=64`;

/**
 * Company logo (Elbstream ships it on its own background), or the name's initial. A muted tile
 * pulses while the image (or, with `pending`, the ISIN itself) is still loading, then the logo
 * fades in over it.
 */
export function InstrumentLogo({
  isin,
  name,
  pending,
  className,
}: {
  isin?: string | null;
  name: string;
  pending?: boolean;
  className?: string;
}) {
  const [loadedIsin, setLoadedIsin] = useState<string | null>(null);
  const [failedIsin, setFailedIsin] = useState<string | null>(null);
  const loaded = !!isin && loadedIsin === isin;
  const box = cn("bg-muted relative size-5 shrink-0 overflow-hidden rounded-sm", className);

  if (pending) return <span aria-hidden className={cn(box, "motion-safe:animate-pulse")} />;
  if (!isin || failedIsin === isin)
    return (
      <span
        aria-hidden
        className={cn(
          box,
          "text-muted-foreground grid place-items-center text-[10px] font-semibold",
        )}
      >
        {name.trim().charAt(0).toUpperCase()}
      </span>
    );
  return (
    <span aria-hidden className={cn(box, !loaded && "motion-safe:animate-pulse")}>
      <img
        key={isin}
        src={logoUrl(isin)}
        alt=""
        loading="lazy"
        decoding="async"
        onLoad={() => setLoadedIsin(isin)}
        onError={() => setFailedIsin(isin)}
        className={cn(
          "size-full object-cover opacity-0 motion-safe:transition-opacity motion-safe:duration-300",
          loaded && "opacity-100",
        )}
      />
    </span>
  );
}
