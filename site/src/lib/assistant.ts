// What the assistant page says about the assistant, kept to what the app does
// (src/lib/ai/tools.ts, src/lib/ai/preferences.ts, src-tauri/src/ai/).

/** The app's tools, by what they read. Names are the tool's own, in plain words. */
export const TOOL_GROUPS: { title: string; tools: string[] }[] = [
  {
    title: "Your portfolio",
    tools: [
      "Holdings",
      "Accounts",
      "Total values",
      "Performance",
      "Key ratios",
      "Fund look-through",
      "Transactions",
      "Year summary",
      "Paid dividends",
      "Dividend outlook",
      "Rebalance plan",
      "Watchlists",
      "Alerts",
    ],
  },
  { title: "Orders", tools: ["Open orders", "Today's deals", "Stop losses"] },
  {
    title: "Markets",
    tools: [
      "Search",
      "Quote",
      "Instrument",
      "Price history",
      "Fundamentals",
      "Order depth",
      "Company events",
      "Fund holdings",
      "Market movers",
      "Index members",
      "Stock screener",
      "Exchange rates",
    ],
  },
  { title: "News", tools: ["Instrument news", "News feed", "Reports calendar", "Read article"] },
];

export const TOOL_COUNT = TOOL_GROUPS.reduce((n, g) => n + g.tools.length, 0);

// The app's own provider marks (src/assets/providers, from svgl.app); the white OpenAI knot
// because the site is dark.
import claude from "../../../src/assets/providers/claude.svg";
import openai from "../../../src/assets/providers/openai-dark.svg";

export const PROVIDERS = [
  { name: "Claude Code", how: "Your Claude subscription", logo: claude },
  { name: "Codex", how: "Your ChatGPT subscription", logo: openai },
  { name: "Claude API", how: "Your Anthropic API key", logo: claude },
  { name: "OpenAI API", how: "Your OpenAI API key", logo: openai },
];

export const SAFETY = [
  {
    title: "Read-only by design",
    text: "Every tool reads. None of them can place, change or cancel an order, move money or edit your watchlists.",
  },
  {
    title: "Locked down",
    text: "Claude Code runs with its own tools switched off, so it only gets AvanzaDesk's tools, plus web search if you leave it on. Codex runs in a read-only sandbox with the shell off.",
  },
  {
    title: "Off until you connect it",
    text: "Nothing goes to an AI provider until you connect one in Settings, and only to the one you chose.",
  },
  {
    title: "Your chats stay with you",
    text: "Conversations are saved in the app's local database; there is no AvanzaDesk server. Privacy mode blurs answers too, since they quote your amounts.",
  },
];
