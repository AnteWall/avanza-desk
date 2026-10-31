/**
 * An article body (HTML from Avanza) as plain paragraphs. Parsing into an inert document and
 * reading `textContent` means no markup, script or link from the feed ever reaches the DOM.
 */
export function articleParagraphs(body: string): string[] {
  const doc = new DOMParser().parseFromString(body, "text/html");
  const blocks = [...doc.body.querySelectorAll("p, li, h1, h2, h3, h4, blockquote, pre")];
  const texts = blocks.length
    ? blocks.filter((b) => !b.querySelector("p, li")).map((b) => b.textContent ?? "")
    : (doc.body.textContent ?? "").split(/\n\s*\n/);
  return texts.map((t) => t.replace(/\s+/g, " ").trim()).filter(Boolean);
}

/** A whole web page's article text: its `<article>` (or `<main>`) when it has one, else the body. */
export function pageParagraphs(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const root = doc.querySelector("article") ?? doc.querySelector("main") ?? doc.body;
  return articleParagraphs(root.innerHTML);
}
