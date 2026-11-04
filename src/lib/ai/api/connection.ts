import { invoke } from "@tauri-apps/api/core";

import { statusUpdate, toChunks, type ClaudeEvent } from "../claude/stream";
import { createSession } from "../session";
import type { ChatSession, SessionOptions } from "../types";

/** Which API the backend calls (src-tauri/src/ai/api/mod.rs `Vendor`). */
export type Vendor = "anthropic" | "openai";

/**
 * A conversation through a vendor's API (src-tauri/src/ai/api/), which keeps its history while
 * it runs and sends the claude CLI's event shapes. A reopened chat starts a new one that gets the
 * earlier messages as text.
 */
export const createApiSession =
  (vendor: Vendor) =>
  (options: () => SessionOptions): ChatSession =>
    createSession<ClaudeEvent>(undefined, (core) => ({
      statusUpdate,
      isExit: (event) => event.type === "exit",
      endsTurn: (event) => event.type === "result",
      toChunks,
      async begin(channel) {
        const { model, effort, instructions, webSearch } = options();
        await invoke("api_start", {
          vendor,
          onEvent: channel,
          options: {
            model: model ?? null,
            effort: effort ?? null,
            instructions: instructions ?? null,
            webSearch: webSearch ?? false,
          },
        });
      },
      end: () => invoke("api_stop", { vendor }),
      async send(first) {
        if (!core.running()) await core.start();
        await invoke("api_send", { vendor, content: first });
      },
      interrupt: () => invoke("api_interrupt", { vendor }),
      forget: () => {},
      setModel: (model) => invoke("api_set_model", { vendor, model }),
      setEffort: () => invoke("api_set_effort", { vendor, effort: options().effort ?? null }),
      sessionId: () => undefined,
    }));
