import { invoke } from "@tauri-apps/api/core";

import { m } from "@/lib/i18n";

import { type ContentBlock, withHistory } from "../content";
import { createSession } from "../session";
import type { ChatSession, SessionOptions } from "../types";
import { type ClaudeEvent, statusUpdate, toChunks } from "./stream";

/**
 * A conversation with one long-lived `claude` process (src-tauri/src/ai/claude.rs). Started on
 * the first message; restarted with `--resume` if it exits, so the conversation survives a
 * crash.
 */
export function createClaudeSession(options: () => SessionOptions, resume?: string): ChatSession {
  let sessionId = resume;
  // Whether the running process resumed a session and has confirmed it (its `init`).
  let resumed = false;
  let confirmed = false;

  return createSession<ClaudeEvent>(resume, (core) => {
    async function send(blocks: ContentBlock[]) {
      if (!core.running()) await core.start();
      await invoke("chat_send", { content: blocks });
    }

    return {
      statusUpdate,
      isExit: (event) => event.type === "exit",
      endsTurn: (event) => event.type === "result",
      onEvent(event) {
        if (event.type === "system" && "session_id" in event && event.session_id) {
          sessionId = event.session_id;
          confirmed = true;
        }
      },
      toChunks,
      async begin(channel) {
        const { model, effort, instructions, webSearch, persist } = options();
        resumed = !!sessionId;
        confirmed = false;
        await invoke("chat_start", {
          onEvent: channel,
          options: {
            model: model ?? null,
            effort: effort ?? null,
            instructions: instructions ?? null,
            webSearch: webSearch ?? false,
            persist,
            resume: sessionId ?? null,
          },
        });
      },
      end: () => invoke("chat_stop"),
      send: (first) => send(first),
      // The saved session is gone (the CLI ends before its `init`): start a fresh one and hand
      // it the earlier conversation as text, so the context survives.
      async intercept(event, blocks, messages) {
        if (!resumed || confirmed || (event.type !== "result" && event.type !== "exit")) {
          return false;
        }
        await core.stop();
        sessionId = undefined;
        core.clear();
        core.setStatus({
          phase: "starting",
          notice: m.ai.provider.notRestored,
        });
        await send(withHistory(blocks, messages));
        return true;
      },
      interrupt: () => invoke("chat_interrupt"),
      forget: () => void (sessionId = undefined),
      // Not running yet: the next start passes the model on the command line instead.
      setModel: (next) =>
        core.running() ? invoke("chat_set_model", { model: next }) : Promise.resolve(),
      // Effort is a start-up flag: end the process, keep the session to resume.
      setEffort: () => (core.running() ? core.stop() : Promise.resolve()),
      sessionId: () => sessionId,
    };
  });
}
