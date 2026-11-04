import type { UIMessage } from "@tanstack/ai-react";

import { withContext, type ContextItem } from "@/lib/ai/context";
import { linkFor, PRIVATE } from "@/lib/ai/links";
import { formatInteger, formatShare } from "@/lib/format";

import { ACCOUNTS, HOLDINGS } from "./portfolio";
import { FX, instrument } from "./universe";

// Saved assistant chats for the demo. Tool results are built from the demo portfolio, so the work
// steps you can expand show the same holdings the rest of the app does.

type Part = UIMessage["parts"][number];
let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

const user = (question: string, items: ContextItem[] = []): UIMessage => ({
  id: nextId("u"),
  role: "user",
  parts: [{ type: "text", content: withContext(question, items) }],
});

/** A finished tool call and its result, as the chat stores them. */
function tool(name: string, input: Record<string, unknown>, output: unknown): Part[] {
  const id = nextId("call");
  const content = JSON.stringify(output);
  return [
    {
      type: "tool-call",
      id,
      name,
      arguments: JSON.stringify(input),
      input,
      state: "complete",
      output: content,
    },
    { type: "tool-result", toolCallId: id, content, state: "complete" },
  ];
}

const assistant = (...parts: (Part | Part[])[]): UIMessage => ({
  id: nextId("a"),
  role: "assistant",
  parts: parts.flat(),
});
const text = (content: string): Part => ({ type: "text", content });

/** `[Saab B](avanza:instrument/5260?…)`: renders as an in-app chip. */
const chip = (orderbookId: string) => {
  const i = instrument(orderbookId);
  return `[${i.name}](${linkFor({ orderbookId, type: i.type, isin: i.isin })})`;
};
const money = (sek: number) => `[${formatInteger(Math.round(sek))} kr](${PRIVATE})`;

// The holdings as get_holdings reports them, merged across accounts.
const holdings = (() => {
  const rows = new Map<string, { volume: number; value: number; accounts: string[] }>();
  for (const h of HOLDINGS) {
    const i = instrument(h.orderbookId);
    const row = rows.get(h.orderbookId) ?? { volume: 0, value: 0, accounts: [] };
    row.volume += h.volume;
    row.value += h.volume * i.price * FX[i.currency];
    row.accounts.push(ACCOUNTS.find((a) => a.id === h.accountId)!.name);
    rows.set(h.orderbookId, row);
  }
  const total = [...rows.values()].reduce((s, r) => s + r.value, 0);
  return [...rows]
    .map(([orderbookId, r]) => {
      const i = instrument(orderbookId);
      return {
        orderbookId,
        name: i.name,
        type: i.type,
        isin: i.isin,
        accounts: r.accounts,
        volume: r.volume,
        valueSek: Math.round(r.value),
        weight: r.value / total,
        link: linkFor({ orderbookId, type: i.type, isin: i.isin }),
      };
    })
    .sort((a, b) => b.valueSek - a.valueSek);
})();
const totalValue = holdings.reduce((s, h) => s + h.valueSek, 0);
const weightOf = (orderbookId: string) =>
  holdings.find((h) => h.orderbookId === orderbookId)?.weight ?? 0;
const sectorWeight = (sector: string) =>
  holdings
    .filter((h) => instrument(h.orderbookId).sector === sector && h.type === "STOCK")
    .reduce((s, h) => s + h.weight, 0);

// This year's return per holding, shown in the answer's table.
// shortcut: hand-picked, not read from the demo price charts; keep in line if those change.
const ytd: Record<string, number> = {
  "5260": 0.716,
  "4478": 0.441,
  "5247": 0.183,
  "5234": 0.092,
  "549768": -0.183,
  "5240": -0.064,
};
const PORTFOLIO_YTD = 0.148;
const INDEX_YTD = 0.112;

const pct = (r: number) => `${r >= 0 ? "+" : "−"}${formatShare(Math.abs(r))}`;

const showcase: UIMessage[] = [
  user(
    "How is my portfolio doing against OMXS30 this year, and what could I add to spread my risk?",
    [
      { kind: "page", label: "Portfolio" },
      { kind: "account", label: "All accounts" },
    ],
  ),
  assistant(
    tool("get_holdings", {}, { holdings, totalValueSek: totalValue }),
    tool(
      "get_portfolio_performance",
      { period: "THIS_YEAR" },
      {
        returnPercent: {
          start: 0,
          end: Math.round(PORTFOLIO_YTD * 1000) / 10,
          change: PORTFOLIO_YTD,
          high: 16.2,
          low: -3.1,
        },
      },
    ),
    tool(
      "get_price_history",
      { orderbookId: "19002", period: "this_year" },
      { start: 2444.6, end: 2718.42, change: INDEX_YTD, high: 2741.3, low: 2309.8 },
    ),
    tool(
      "get_portfolio_exposure",
      {},
      {
        industries: [
          { name: "Information technology", share: 0.27 },
          { name: "Industrials", share: 0.24 },
          { name: "Financials", share: 0.18 },
          { name: "Health care", share: 0.06 },
          { name: "Consumer staples", share: 0.03 },
        ],
        countries: [
          { name: "Sweden", share: 0.52 },
          { name: "United States", share: 0.34 },
          { name: "Other", share: 0.14 },
        ],
        totalFee: 0.0019,
      },
    ),
    tool(
      "screen_stocks",
      { name: "" },
      {
        stocks: ["5361", "5263", "5246", "5447"].map((id) => {
          const i = instrument(id);
          return {
            orderbookId: id,
            name: i.name,
            type: i.type,
            isin: i.isin,
            pe: i.pe,
            dividendYield: i.yield,
            link: linkFor({ orderbookId: id, type: i.type, isin: i.isin }),
          };
        }),
      },
    ),
    text(
      [
        `**You're ahead of the index this year.** Your portfolio is up **${pct(PORTFOLIO_YTD)}** since New Year, against **${pct(INDEX_YTD)}** for OMXS30. On ${money(totalValue)} that's about ${money((totalValue * (PORTFOLIO_YTD - INDEX_YTD)) / (1 + PORTFOLIO_YTD))} more than if you had tracked the index.`,
        "```chart\n" +
          JSON.stringify({ kind: "portfolio", period: "THIS_YEAR", mode: "return" }) +
          "\n```",
        "### What drove it",
        [
          "| Holding | Weight | This year |",
          "| --- | ---: | ---: |",
          ...Object.entries(ytd)
            .sort((a, b) => b[1] - a[1])
            .map(([id, r]) => `| ${chip(id)} | ${formatShare(weightOf(id))} | ${pct(r)} |`),
        ].join("\n"),
        `${chip("5260")} did most of the work: it alone added about 4 percentage points. ${chip("549768")} was the drag.`,
        "### Where the risk sits",
        `- **Swedish industrials** are ${formatShare(sectorWeight("Industri"))} of what you own, through ${chip("5234")}, ${chip("5269")}, ${chip("5271")} and ${chip("5260")}. They tend to fall together when the economy slows.`,
        `- **US tech** comes in twice: directly through ${chip("4478")} and ${chip("3873")}, and again through ${chip("878733")}, where the largest holdings are the same companies.`,
        "- **Health care and consumer staples** are almost missing, 9 % together. Those are the sectors that usually hold up when the others don't.",
        "### Ideas to spread it",
        `These would fill the gaps without adding to what you already have. ${chip("5361")} is the largest health care company on the Stockholm exchange, and ${chip("5263")} and ${chip("5246")} pay steady dividends with low swings.`,
        "```instrument\n" + JSON.stringify({ orderbookId: "5361", type: "STOCK" }) + "\n```",
        "If you want to put new money in this direction, here's a mix you can take straight to the Rebalance page:",
        "```targets\n" +
          JSON.stringify({
            targets: [
              { orderbookId: "5361", type: "STOCK", percent: 35 },
              { orderbookId: "5263", type: "STOCK", percent: 25 },
              { orderbookId: "325406", type: "FUND", percent: 25 },
              { orderbookId: "5246", type: "STOCK", percent: 15 },
            ],
          }) +
          "\n```",
        "You can also right-click any of them to add it to your basket and split your next deposit over it. This isn't investment advice: check the numbers in Avanza before you trade.",
      ].join("\n\n"),
    ),
  ),
];

const reports: UIMessage[] = [
  user("Which of my holdings report in the next two weeks?"),
  assistant(
    tool("get_news_calendar", {}, { note: "Upcoming reports and dividends for your holdings" }),
    text(
      [
        "Three of your holdings report before the end of next week:",
        `- ${chip("4478")}: interim report in 6 days. It's your largest US stock, ${formatShare(weightOf("4478"))} of the portfolio.`,
        `- ${chip("5260")}: interim report in 9 days, after raising its growth forecast last quarter.`,
        `- ${chip("549768")}: interim report in 14 days.`,
        `${chip("5241")} also goes ex-dividend in 2 days: 7,65 kr per share.`,
      ].join("\n\n"),
    ),
  ),
];

const saab: UIMessage[] = [
  user("Summarize today's news about Saab", [
    {
      kind: "instrument",
      id: "5260",
      type: "STOCK",
      name: "Saab B",
      isin: instrument("5260").isin,
    },
  ]),
  assistant(
    tool("get_instrument_news", { orderbookId: "5260" }, { articles: 2 }),
    tool(
      "read_article",
      { url: "/placera/telegram/n1" },
      { title: "Saab får order på pansarvärnsvapen värd 2,1 miljarder kronor" },
    ),
    text(
      `${chip("5260")} won an order worth **2,1 billion SEK** for anti-tank weapons this morning, delivered over 2027–2029. The stock is up ${pct(instrument("5260").change)} today and has gained ${pct(ytd["5260"])} this year. Last quarter the company raised its organic growth forecast to 20–24 %, so the order fits a pattern rather than being a one-off.`,
    ),
  ),
];

const evolution: UIMessage[] = [
  user("Is Evolution cheap compared to its own history?", [
    {
      kind: "instrument",
      id: "549768",
      type: "STOCK",
      name: "Evolution",
      isin: instrument("549768").isin,
    },
  ]),
  assistant(
    tool(
      "get_fundamentals",
      { orderbookId: "549768" },
      { pe: 13.1, peFiveYearAverage: 31.4, dividendYield: 0.039 },
    ),
    tool("get_price_history", { orderbookId: "549768", period: "five_years" }, { change: -0.42 }),
    text(
      `On earnings, yes: ${chip("549768")} trades at a P/E of **13,1**, less than half its five-year average of 31,4. The market is pricing in slower growth and regulatory risk, like the new UK gaming tax. The dividend yield is 3,9 %, the highest it has been.`,
    ),
  ),
];

const dividends: UIMessage[] = [
  user("How much dividend will I get in December?"),
  assistant(
    tool("get_dividend_outlook", {}, { months: [{ month: "December", amountSek: 1840 }] }),
    text(`About ${money(1840)} in December, mostly from ${chip("3873")} and ${chip("5247")}.`),
  ),
];

const DAY = 86_400_000;
const HOUR = 3_600_000;

export const DEMO_CHATS = [
  {
    id: "demo-showcase",
    title: "Portfolio vs OMXS30 this year",
    messages: showcase,
    ago: 0.2 * HOUR,
    pinned: true,
  },
  { id: "demo-saab", title: "Saab news today", messages: saab, ago: 2 * HOUR, pinned: false },
  {
    id: "demo-reports",
    title: "Reports in the next two weeks",
    messages: reports,
    ago: 1.2 * DAY,
    pinned: false,
  },
  {
    id: "demo-evolution",
    title: "Is Evolution cheap?",
    messages: evolution,
    ago: 3 * DAY,
    pinned: false,
  },
  {
    id: "demo-dividends",
    title: "Dividends in December",
    messages: dividends,
    ago: 12 * DAY,
    pinned: false,
  },
];
