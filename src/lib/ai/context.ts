import { linkFor } from "./links";

// What the user is looking at when they ask, so "this stock" or "the article" just work. The
// items travel inside the user's message: a tagged JSON block before the question, which the
// provider reads and the chat strips back off to show as chips (also in saved chats).

export type ContextItem =
  | { kind: "page"; label: string }
  | { kind: "account"; label: string }
  | { kind: "instrument"; id: string; type?: string; name: string; isin?: string }
  | { kind: "article"; url: string; title: string; external: boolean };

/** Stable identity for a chip, to remember which ones the user removed. */
export const contextKey = (item: ContextItem) =>
  item.kind === "instrument"
    ? `instrument:${item.id}`
    : item.kind === "article"
      ? `article:${item.url}`
      : item.kind;

const OPEN = "<app_context>";
const CLOSE = "</app_context>";

/** The message sent to the provider: the context block (if any), then the question. */
export function withContext(question: string, items: readonly ContextItem[]) {
  if (items.length === 0) return question;
  // Instruments and articles carry the same in-app link as tool results, so answers link them.
  const described = items.map((item) => {
    if (item.kind === "instrument") {
      return { ...item, link: linkFor({ orderbookId: item.id, type: item.type, isin: item.isin }) };
    }
    if (item.kind === "article") {
      return { ...item, link: linkFor({ url: item.url, externalLink: item.external }) };
    }
    return item;
  });
  return `${OPEN}\n${JSON.stringify(described)}\n${CLOSE}\n\n${question}`;
}

/** Splits a sent message back into its context items and the question as typed. */
export function splitContext(text: string): { items: ContextItem[]; question: string } {
  if (!text.startsWith(OPEN)) return { items: [], question: text };
  const end = text.indexOf(CLOSE);
  if (end < 0) return { items: [], question: text };
  try {
    const items = JSON.parse(text.slice(OPEN.length, end)) as (ContextItem & { link?: string })[];
    return {
      items: items.map(({ link: _link, ...item }) => item as ContextItem),
      question: text.slice(end + CLOSE.length).replace(/^\n+/, ""),
    };
  } catch {
    return { items: [], question: text };
  }
}

/** An instrument row as context, or undefined when the row has no order book. */
export const instrumentItem = (
  id: string | undefined | null,
  name: string,
  type?: string,
  isin?: string,
): ContextItem | undefined => (id ? { kind: "instrument", id, name, type, isin } : undefined);

export const articleItem = (url: string, title: string, external: boolean): ContextItem => ({
  kind: "article",
  url,
  title,
  external,
});
