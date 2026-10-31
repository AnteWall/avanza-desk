import { cn } from "cn";

import type { Provider } from "@/lib/ai/types";

/** A provider's brand mark (svgl.app). Decorative: the name is always next to it. */
export function ProviderLogo({ provider, className }: { provider: Provider; className?: string }) {
  const img = (src: string, theme?: string) => (
    <img src={src} alt="" aria-hidden className={cn("size-4 shrink-0", theme, className)} />
  );
  if (!provider.logoDark) return img(provider.logo);
  return (
    <>
      {img(provider.logo, "dark:hidden")}
      {img(provider.logoDark, "hidden dark:block")}
    </>
  );
}
