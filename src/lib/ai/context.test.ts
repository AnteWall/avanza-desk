import { describe, expect, it } from "vitest";

import { type ContextItem, splitContext, withContext } from "./context";

const items: ContextItem[] = [
  { kind: "page", label: "Workspace" },
  { kind: "instrument", id: "5269", type: "STOCK", name: "Volvo B", isin: "SE0000115446" },
];

describe("withContext / splitContext", () => {
  it("round-trips the items and the question", () => {
    const sent = withContext("Is this cheap?\nThink about P/E.", items);
    expect(splitContext(sent)).toEqual({ items, question: "Is this cheap?\nThink about P/E." });
  });

  it("gives the provider in-app links for instruments and articles", () => {
    const sent = withContext("Summarize", [
      ...items,
      { kind: "article", url: "/placera/a.html", title: "Rapport", external: false },
    ]);
    expect(sent).toContain('"link":"avanza:instrument/5269?type=STOCK&isin=SE0000115446"');
    expect(sent).toContain('"link":"avanza:article?url=%2Fplacera%2Fa.html"');
  });

  it("leaves plain messages alone", () => {
    expect(withContext("Hi", [])).toBe("Hi");
    expect(splitContext("Hi")).toEqual({ items: [], question: "Hi" });
    expect(splitContext("<app_context>\nnot json\n</app_context>\n\nHi").items).toEqual([]);
  });
});
