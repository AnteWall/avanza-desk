import { QueryClient } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { describe, expect, it } from "vitest";

import { newsArticleQuery, newsFeedQuery } from "@/lib/avanza/queries";

import { compact, toolActivity, tools } from "./tools";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn<typeof invoke>() }));

describe("compact", () => {
  it("drops empty fields", () => {
    expect(compact({ a: 1, b: null, c: "", d: [], e: { f: null } })).toBe('{"a":1,"e":{}}');
  });

  it("caps long lists", () => {
    const parsed = JSON.parse(compact(Array.from({ length: 60 }, (_, i) => i)));
    expect(parsed).toHaveLength(51);
    expect(parsed.at(-1)).toBe("… 10 more not shown");
  });

  it("truncates huge results", () => {
    expect(compact("x".repeat(50_000))).toMatch(/… \(truncated\)$/);
  });

  it("adds in-app links to instruments", () => {
    expect(JSON.parse(compact([{ orderbookId: "5269", type: "STOCK" }]))).toEqual([
      { orderbookId: "5269", type: "STOCK", link: "avanza:instrument/5269?type=STOCK" },
    ]);
  });

  it("keeps undefined results valid JSON", () => {
    expect(compact(undefined)).toBe("null");
  });
});

describe("toolActivity", () => {
  it("describes known calls and falls back to the name", () => {
    expect(toolActivity("search_instrument", { query: "Volvo" })).toBe("Searching for “Volvo”");
    expect(toolActivity("get_holdings", undefined)).toBe("Reading your holdings");
    expect(toolActivity("search_instrument", { query: "Volvo" }, true)).toBe(
      "Searched for “Volvo”",
    );
    expect(toolActivity("mystery", {})).toBe("mystery");
  });
});

// read_article is the one tool that fetches outside Avanza: only articles Avanza linked to.
describe("read_article", () => {
  const readArticle = tools.find((t) => t.name === "read_article")!;
  const feedUrl = "https://www.placera.se/a/1";

  function client() {
    // Cached data stays fresh, so nothing reaches Avanza.
    const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity } } });
    qc.setQueryData(newsFeedQuery.queryKey, {
      news: [{ externalLink: true, url: feedUrl }],
    } as never);
    return qc;
  }

  it("fetches an external article from the news feed", async () => {
    vi.mocked(invoke).mockResolvedValue("<article><p>Body</p></article>");
    expect(await readArticle.run(client(), { url: feedUrl })).toEqual({
      url: feedUrl,
      text: "Body",
    });
    expect(invoke).toHaveBeenCalledWith("article_fetch", { url: feedUrl });
  });

  it("never fetches a URL the feed doesn't have", async () => {
    vi.mocked(invoke).mockClear();
    const qc = client();
    const url = "https://evil.example/?holdings=VOLV-B";
    qc.setQueryData(newsArticleQuery(url).queryKey, { body: "" } as never);
    await readArticle.run(qc, { url });
    expect(invoke).not.toHaveBeenCalledWith("article_fetch", expect.anything());
  });
});
