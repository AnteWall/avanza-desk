import { invoke } from "@tauri-apps/api/core";

import { type ContentBlock, withHistory } from "../content";
import { createSession } from "../session";
import type { ChatSession, SessionOptions } from "../types";
import { type CodexEvent, statusUpdate, toChunks } from "./stream";

/** `codex_start`'s answer (src-tauri/src/ai/codex.rs). */
type Started = { threadId: string; model: string | null };

/**
 * A conversation with one long-lived `codex app-server` (src-tauri/src/ai/codex.rs). Started on
 * the first message; restarted on its thread if it exits, so the conversation survives a crash.
 * Model and effort go with every turn, so changing them needs no restart.
 */
export function createCodexSession(options: () => SessionOptions, resume?: string): ChatSession {
  let threadId = resume;

  return createSession<CodexEvent>(resume, (core) => {
    async function send(blocks: ContentBlock[]) {
      const { model, effort } = options();
      await invoke("codex_send", { content: blocks, model: model ?? null, effort: effort ?? null });
      if (model) core.setStatus({ model });
    }

    return {
      statusUpdate,
      isExit: (event) => event.method === "exit",
      endsTurn: (event) => event.method === "turn/completed",
      toChunks,
      async begin(channel) {
        const { model, instructions, webSearch, persist } = options();
        const started = await invoke<Started>("codex_start", {
          onEvent: channel,
          options: {
            model: model ?? null,
            instructions: instructions ?? null,
            webSearch: webSearch ?? false,
            persist,
            resume: threadId ?? null,
          },
        });
        threadId = started.threadId;
        core.setStatus({ model: started.model ?? undefined });
      },
      end: () => invoke("codex_stop"),
      // Starts the process if needed, then sends; a thread that can't be resumed starts over.
      async send(first, blocks, messages) {
        if (core.running()) return send(first);
        try {
          await core.start();
        } catch (error) {
          if (!threadId) throw error;
          // The saved thread is gone: start a fresh one and hand it the earlier conversation as
          // text, so the context survives.
          threadId = undefined;
          await core.start();
          core.setStatus({
            notice:
              "The earlier session couldn't be restored, so the assistant got the chat as text.",
          });
          return send(withHistory(blocks, messages));
        }
        return send(first);
      },
      interrupt: () => invoke("codex_interrupt"),
      forget: () => void (threadId = undefined),
      // The next turn carries the model and effort (read from the settings when it's sent).
      setModel: () => Promise.resolve(),
      setEffort: () => Promise.resolve(),
      sessionId: () => threadId,
    };
  });
}
