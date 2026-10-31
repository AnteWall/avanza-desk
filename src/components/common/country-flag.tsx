import { cn } from "cn";

/** Small country flag from an ISO 3166 alpha-2 code (Avanza's `flagCode`/`countryCode`). */
export function CountryFlag({ code, className }: { code?: string | null; className?: string }) {
  if (!code) return null;
  return (
    <img
      src={`https://api.elbstream.com/logos/country/${code.toUpperCase()}?format=svg`}
      alt={code.toUpperCase()}
      title={code.toUpperCase()}
      loading="lazy"
      className={cn("h-2.5 w-3.5 shrink-0 rounded-[2px] object-cover", className)}
    />
  );
}
