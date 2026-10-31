// In-app links in the assistant's answers. Tool results carry a ready-made `link` for every
// instrument and article in them; the assistant copies it into a Markdown link, and the chat
// renders it as a chip that opens the instrument or article inside the app.
//
//   avanza:instrument/5269?type=STOCK&isin=SE0000115446
//   avanza:article?url=%2Fplacera%2F…&external=1

export const SCHEME = "avanza:";

// Marks the user's own amounts in an answer, e.g. [48 300 kr](avanza:private): privacy mode
// blurs just those instead of the whole answer.
export const PRIVATE = `${SCHEME}private`;

export type AppLink =
  | { kind: "instrument"; id: string; type?: string; isin?: string }
  | { kind: "article"; url: string; external: boolean };

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

/** The app link for an object from Avanza's API, if it is an instrument or an article. */
export function linkFor(value: Record<string, unknown>): string | undefined {
  if (typeof value.externalLink === "boolean") {
    const url = str(value.url) ?? str(value.fullArticleLink);
    if (!url) return undefined;
    const params = new URLSearchParams({ url });
    if (value.externalLink) params.set("external", "1");
    return `${SCHEME}article?${params}`;
  }
  const id = str(value.orderbookId) ?? str(value.orderBookId);
  if (!id || !/^\d+$/.test(id)) return undefined;
  const params = new URLSearchParams();
  const type = str(value.type) ?? str(value.instrumentType);
  // Avanza's type codes are upper case ("STOCK", "FUND"); other `type` fields aren't types.
  if (type && /^[A-Z_]+$/.test(type)) params.set("type", type);
  const isin = str(value.isin);
  if (isin) params.set("isin", isin);
  const query = params.toString();
  return `${SCHEME}instrument/${id}${query ? `?${query}` : ""}`;
}

/** Reads an app link back; anything else (web links, malformed ones) is undefined. */
export function parseAppLink(href: string | undefined): AppLink | undefined {
  if (!href?.startsWith(SCHEME)) return undefined;
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return undefined;
  }
  const params = url.searchParams;
  const instrument = /^instrument\/(\d+)$/.exec(url.pathname);
  if (instrument) {
    return {
      kind: "instrument",
      id: instrument[1],
      type: params.get("type") ?? undefined,
      isin: params.get("isin") ?? undefined,
    };
  }
  const article = params.get("url");
  if (url.pathname === "article" && article) {
    return { kind: "article", url: article, external: params.get("external") === "1" };
  }
  return undefined;
}
