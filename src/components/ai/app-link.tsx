import { ArrowUpRight, Newspaper } from "lucide-react";
import type { ReactNode } from "react";

import { InstrumentLogo } from "@/components/common/instrument-logo";
import { useOpenArticle } from "@/components/news/use-open-article";
import { useFocusInstrument } from "@/components/workspace/use-focused-instrument";
import type { AppLink as Link } from "@/lib/ai/links";
import { m } from "@/lib/i18n";

/**
 * An instrument or article named in an answer, as a chip that opens it in the app: the
 * instrument in the workspace, Avanza's articles in the News reader, others in the browser.
 */
export function AppLink({ link, children }: { link: Link; children: ReactNode }) {
  const focus = useFocusInstrument();
  const openArticle = useOpenArticle();
  const text = typeof children === "string" ? children : "";

  return (
    <button
      type="button"
      onClick={() =>
        link.kind === "instrument"
          ? focus(link.id, link.type)
          : openArticle(link.url, link.external)
      }
      title={
        link.kind === "instrument"
          ? m.ai.link.workspace
          : link.external
            ? m.ai.link.browser
            : m.ai.link.news
      }
      className="bg-muted/60 hover:bg-muted focus-visible:ring-ring/50 decoration-border text-foreground mx-px inline-flex max-w-full translate-y-px items-baseline gap-1 rounded-sm px-1 align-baseline font-medium underline-offset-2 transition-colors outline-none hover:underline focus-visible:ring-2"
    >
      {link.kind === "instrument" ? (
        <InstrumentLogo isin={link.isin} name={text} className="size-3.5 self-center" />
      ) : (
        <Newspaper className="text-muted-foreground size-3.5 shrink-0 self-center" aria-hidden />
      )}
      <span className="truncate">{children}</span>
      {link.kind === "article" && link.external && (
        <ArrowUpRight className="text-muted-foreground size-3 shrink-0 self-center" aria-hidden />
      )}
    </button>
  );
}
