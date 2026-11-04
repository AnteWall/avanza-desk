import type { ConnectConnectionAdapter } from "@tanstack/ai-react";

// The contract every AI provider implements: Claude (through the local Claude Code CLI or the
// Claude API with the user's key) and Codex (through the local Codex CLI). Another provider adds
// a folder next to `claude/` and an entry in providers.ts.

/** What the assistant is doing right now, for the chat's status line. */
export type Phase = "starting" | "thinking" | "writing" | "tool";

export type RateLimit = {
  /** "allowed", "allowed_warning" or "rejected". */
  status: string;
  /** Which window is closest to its limit: "five_hour", "seven_day", … */
  window?: string;
  /** Seconds since the epoch. */
  resetsAt?: number;
  /** 0–1 of that window used. */
  utilization?: number;
};

export type ChatStatus = {
  phase: Phase | null;
  model?: string;
  rateLimit?: RateLimit;
  /** Something the user should know about the last answer ("Earlier messages were restored…"). */
  notice?: string;
};

/** How a conversation runs; read when its process starts. */
export type SessionOptions = {
  model?: string;
  /** "low" … "max"; only for models that support it. */
  effort?: string;
  /** The user's standing instructions (language, profile, detail), added to the system prompt. */
  instructions?: string;
  /** Lets the assistant search the web. */
  webSearch?: boolean;
  /** False for a temporary chat: the provider keeps no transcript on disk either. */
  persist: boolean;
};

export type ModelOption = {
  /** Passed to the provider: "opus", "claude-sonnet-5". */
  value: string;
  label: string;
  description?: string;
  /** Older or pinned versions, listed apart from the current models. */
  legacy?: boolean;
  /** Effort levels the model supports ("low" … "max"); none means it has no effort setting. */
  efforts?: string[];
};

type Found = { bin: string; version: string; custom: boolean };

/** Whether a provider can be used, and what the user has to do if not. */
export type ProviderSetup =
  | { state: "missing"; custom: boolean; error?: string }
  | ({ state: "broken"; error: string } & Omit<Found, "version"> & { version?: string })
  | ({ state: "signed-out" } & Found)
  | ({
      state: "ready";
      account: { email?: string; organization?: string; plan?: string };
      models: ModelOption[];
      /** The model the provider recommends; used until the user picks one. */
      defaultModel?: string;
    } & Found);

/** One conversation with a provider. */
export type ChatSession = {
  connection: ConnectConnectionAdapter;
  status: { get: () => ChatStatus; subscribe: (listener: () => void) => () => void };
  /** Switches the running conversation to another model; later turns use it. */
  setModel: (model: string) => Promise<void>;
  /**
   * Applies a new effort level (read from the settings). A provider that only takes it at start
   * restarts the conversation, with its context, on the next message.
   */
  setEffort: () => Promise<void>;
  /** The provider's id for this conversation once it started; saved so it can be resumed. */
  sessionId: () => string | undefined;
  /** Ends the conversation and its process. */
  reset: () => Promise<void>;
};

export type Provider = {
  id: string;
  name: string;
  vendor: string;
  /** URL of the provider's logo (from svgl.app). */
  logo: string;
  /** The logo's variant for the dark theme, when the plain one doesn't show on dark. */
  logoDark?: string;
  /** How it reaches the model and who pays: shown behind an ⓘ next to its name. */
  billing: string;
  installUrl: string;
  /** Step-by-step install and sign-in guide. */
  guideUrl: string;
  /** Where to get a plan that includes the program. */
  plansUrl: string;
  /** The terminal command that signs in. */
  loginCommand: string;
  /** The program the provider runs, as the setup screen names it. */
  program: string;
  probe: () => Promise<ProviderSetup>;
  /** Signs in from the app (opens the browser), when the program supports it. */
  signIn?: () => Promise<void>;
  /**
   * Set on a provider that runs in AvanzaDesk with the user's API key instead of a program on
   * this computer: saves the key (null removes it).
   */
  setApiKey?: (key: string | null) => Promise<void>;
  /** Uses this binary (a file or its folder); null goes back to auto-detect. */
  setBinary: (path: string | null) => Promise<void>;
  /**
   * `model` is read when the conversation starts. `resume` continues a saved conversation with
   * its context (a `sessionId()` from earlier).
   */
  createSession: (options: () => SessionOptions, resume?: string) => ChatSession;
};
