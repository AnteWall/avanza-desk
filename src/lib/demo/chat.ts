import { DEMO_CHATS } from "./chat-showcase";

// The assistant in demo mode: Claude Code looks installed and signed in, and the history holds
// the showcase chats. Nothing is ever sent; a question typed in the demo gets no answer.

const CLAUDE_PROBE = {
  bin: "/usr/local/bin/claude",
  custom: false,
  version: "2.4.1 (Claude Code)",
  loggedIn: true,
  account: { email: "alex@example.com", subscriptionType: "max" },
  models: [
    { value: "default", resolvedModel: "claude-opus-5-5", displayName: "Default" },
    {
      value: "opus",
      resolvedModel: "claude-opus-5-5",
      displayName: "Opus",
      description: "Most capable for complex work",
      supportsEffort: true,
      supportedEffortLevels: ["low", "medium", "high"],
    },
    {
      value: "sonnet",
      resolvedModel: "claude-sonnet-5-5",
      displayName: "Sonnet",
      description: "Best for everyday tasks",
    },
    {
      value: "haiku",
      resolvedModel: "claude-haiku-5-5",
      displayName: "Haiku",
      description: "Fastest for quick answers",
    },
  ],
  error: null,
};

const CODEX_PROBE = {
  bin: "/usr/local/bin/codex",
  custom: false,
  version: "codex-cli 0.98.0",
  loggedIn: true,
  account: { type: "chatgpt", email: "alex@example.com", planType: "plus" },
  models: [
    {
      id: "gpt-5.5",
      displayName: "GPT-5.5",
      description: "Latest frontier model",
      hidden: false,
      isDefault: true,
      supportedReasoningEfforts: [
        { reasoningEffort: "low" },
        { reasoningEffort: "medium" },
        { reasoningEffort: "high" },
      ],
    },
    {
      id: "gpt-5.5-mini",
      displayName: "GPT-5.5 mini",
      description: "Faster and cheaper",
      hidden: false,
      isDefault: false,
      supportedReasoningEfforts: [{ reasoningEffort: "low" }, { reasoningEffort: "medium" }],
    },
  ],
  error: null,
};

const summary = (c: (typeof DEMO_CHATS)[number]) => ({
  id: c.id,
  provider: "claude",
  model: "opus",
  title: c.title,
  updatedAt: Date.now() - c.ago,
  pinned: c.pinned,
});

export function chatCommand(cmd: string, args: Record<string, unknown>): unknown {
  switch (cmd) {
    case "claude_probe":
      return CLAUDE_PROBE;
    case "codex_probe":
      return CODEX_PROBE;
    // No API keys saved: the API providers show as available to set up.
    case "api_probe":
      return { hasKey: false, keyHint: null, models: [], error: null };
    case "chats_list": {
      const q = typeof args.query === "string" ? args.query.toLowerCase() : "";
      return DEMO_CHATS.filter((c) => !q || c.title.toLowerCase().includes(q)).map(summary);
    }
    case "chat_load": {
      const chat = DEMO_CHATS.find((c) => c.id === args.id);
      return chat
        ? { ...summary(chat), sessionId: null, messages: JSON.stringify(chat.messages) }
        : null;
    }
    default:
      return undefined;
  }
}
