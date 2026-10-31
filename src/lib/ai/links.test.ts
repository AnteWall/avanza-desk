import { describe, expect, it } from "vitest";

import { linkFor, parseAppLink } from "./links";

describe("linkFor", () => {
  it("links holdings, search hits and orders to their instrument", () => {
    expect(linkFor({ orderbookId: "5269", type: "STOCK", isin: "SE0000115446" })).toBe(
      "avanza:instrument/5269?type=STOCK&isin=SE0000115446",
    );
    expect(linkFor({ orderBookId: "5269", type: "STOCK", title: "Volvo B" })).toBe(
      "avanza:instrument/5269?type=STOCK",
    );
    expect(linkFor({ orderbookId: "5269", instrumentType: "STOCK" })).toBe(
      "avanza:instrument/5269?type=STOCK",
    );
  });

  it("links news from the feed and from an instrument", () => {
    const feed = linkFor({
      title: "Rapport",
      url: "/placera/telegram/a.html",
      externalLink: false,
    });
    expect(parseAppLink(feed)).toEqual({
      kind: "article",
      url: "/placera/telegram/a.html",
      external: false,
    });
    const external = linkFor({ fullArticleLink: "https://x.se/a?b=1&c=2", externalLink: true });
    expect(parseAppLink(external)).toEqual({
      kind: "article",
      url: "https://x.se/a?b=1&c=2",
      external: true,
    });
  });

  it("skips everything else", () => {
    expect(linkFor({ name: "ISK", type: "account" })).toBeUndefined();
    expect(linkFor({ orderbookId: "abc" })).toBeUndefined();
    expect(linkFor({ externalLink: false })).toBeUndefined();
  });
});

describe("parseAppLink", () => {
  it("reads instrument links and ignores web links", () => {
    expect(parseAppLink("avanza:instrument/5269?type=STOCK")).toEqual({
      kind: "instrument",
      id: "5269",
      type: "STOCK",
      isin: undefined,
    });
    // As Claude wrote it in a real answer.
    expect(
      parseAppLink(
        "avanza:article?url=https%3A%2F%2Fwww.placera.se%2Ftelegram%2Favanza%2F1_aeec2ad5.html&external=1",
      ),
    ).toEqual({
      kind: "article",
      url: "https://www.placera.se/telegram/avanza/1_aeec2ad5.html",
      external: true,
    });
    expect(parseAppLink("https://avanza.se")).toBeUndefined();
    expect(parseAppLink("avanza:instrument/drop-table")).toBeUndefined();
    expect(parseAppLink(undefined)).toBeUndefined();
  });
});
