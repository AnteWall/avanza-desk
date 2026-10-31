import { EventType, type StreamChunk } from "@tanstack/ai";
import { stream } from "@tanstack/ai-react";
import { Channel } from "@tauri-apps/api/core";

import {
  type AnyMessage,
  type ContentBlock,
  lastUserContent,
  prefix,
  withHistory,
} from "./content";
import type { ChatSession, ChatStatus } from "./types";

// What every provider's conversation shares: one long-lived process fed through a channel, the
// run loop that turns its events into chat chunks, stop and "Try again" handling, and the live
// status. Providers (claude/connection.ts, codex/connection.ts) add their own commands.

export type Run = { threadId: string; runId: string };

/** What the shared part offers a provider's hooks. */
export type Core = {
  /** Whether the process is up: started and not exited. */
  running: () => boolean;
  /** Starts the process (`begin`) on a fresh channel; an earlier process's late lines are dropped. */
  start: () => Promise<void>;
  /** Ends the process (`end`). */
  stop: () => Promise<void>;
  setStatus: (update: Partial<ChatStatus>) => void;
  /** Drops the run's queued events, for a process that starts over. */
  clear: () => void;
};

export type Hooks<E> = {
  statusUpdate: (event: E) => Partial<ChatStatus> | undefined;
  isExit: (event: E) => boolean;
  /** The event that ends a turn: an interrupted turn's leftovers are skipped up to it. */
  endsTurn: (event: E) => boolean;
  /** Sees every event of the running process, before it's queued. */
  onEvent?: (event: E) => void;
  toChunks: (event: E, run: Run) => { chunks: StreamChunk[]; done: boolean };
  begin: (channel: Channel<string>) => Promise<void>;
  end: () => Promise<unknown>;
  /** Sends the run's message, starting the process if needed. `first` carries the history. */
  send: (
    first: ContentBlock[],
    blocks: ContentBlock[],
    messages: readonly AnyMessage[],
  ) => Promise<void>;
  /** Handles an event before it becomes chunks; true when it was consumed. */
  intercept?: (
    event: E,
    blocks: ContentBlock[],
    messages: readonly AnyMessage[],
  ) => Promise<boolean>;
  interrupt: () => Promise<unknown>;
  /** Forgets the provider's conversation id (a new chat). */
  forget: () => void;
} & Pick<ChatSession, "setModel" | "setEffort" | "sessionId">;

/** One conversation; `resume` is the provider's id of a saved one. One run at a time. */
export function createSession<E>(resume: string | undefined, make: (core: Core) => Hooks<E>) {
  let running = false;
  // The user message last sent, to tell "Try again" from a new message.
  let lastSentId: string | undefined;
  // A session that starts on a chat with earlier turns (another provider answered them) gets
  // them as text with its first message.
  let handedOver = !!resume;
  // Events of the current run, and a wake-up for the reader waiting on them.
  let events: E[] = [];
  let wake: (() => void) | undefined;
  // After a stop, the interrupted turn's remaining events still arrive; skip up to its end.
  let draining = false;
  // Bumped per process: a stopped process's late lines (its exit) must not reach the next one.
  let generation = 0;
  let status: ChatStatus = { phase: null };
  const listeners = new Set<() => void>();
  function setStatus(update: Partial<ChatStatus>) {
    status = { ...status, ...update };
    for (const listener of listeners) listener();
  }

  const core: Core = {
    running: () => running,
    async start() {
      const current = ++generation;
      const channel = new Channel<string>();
      channel.onmessage = (line) => current === generation && onLine(line);
      await hooks.begin(channel);
      running = true;
    },
    async stop() {
      running = false;
      generation++;
      await hooks.end();
    },
    setStatus,
    clear: () => void (events = []),
  };
  const hooks = make(core);

  function onLine(line: string) {
    const event = JSON.parse(line) as E;
    const update = hooks.statusUpdate(event);
    if (update && !(draining && "phase" in update)) setStatus(update);
    hooks.onEvent?.(event);
    if (hooks.isExit(event)) running = false;
    if (draining) {
      if (hooks.endsTurn(event) || hooks.isExit(event)) draining = false;
      return;
    }
    events.push(event);
    wake?.();
  }

  async function* run(messages: readonly AnyMessage[], signal: AbortSignal | undefined, ids: Run) {
    events = [];
    setStatus({ phase: running ? "thinking" : "starting", notice: undefined });
    const { id, blocks: asked } = lastUserContent(messages);
    // "Try again" re-sends the same message, which the provider may already hold.
    const blocks =
      id && id === lastSentId
        ? prefix(
            asked,
            "(My previous message may not have reached you, or your answer was cut off. Please answer it now, once.)",
          )
        : asked;
    lastSentId = id;
    const first = handedOver ? blocks : withHistory(blocks, messages);
    handedOver = true;
    const failed = (error: unknown) => {
      setStatus({ phase: null });
      return new Error(String(error));
    };
    try {
      await hooks.send(first, blocks, messages);
    } catch (error) {
      throw failed(error);
    }
    yield { type: EventType.RUN_STARTED, threadId: ids.threadId, runId: ids.runId } as StreamChunk;
    const onAbort = () => wake?.();
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      while (!signal?.aborted) {
        const event = events.shift();
        if (event === undefined) {
          await new Promise<void>((resolve) => (wake = resolve));
          continue;
        }
        try {
          if (await hooks.intercept?.(event, blocks, messages)) continue;
        } catch (error) {
          throw failed(error);
        }
        const { chunks, done } = hooks.toChunks(event, ids);
        yield* chunks;
        if (done) return;
      }
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
    draining = true;
    setStatus({ phase: null });
    await hooks.interrupt().catch(() => (draining = false));
  }

  return {
    connection: stream((messages, _data, signal, input) =>
      run(messages, signal, { threadId: input.threadId, runId: input.runId }),
    ),
    status: {
      get: () => status,
      subscribe(listener) {
        listeners.add(listener);
        return () => void listeners.delete(listener);
      },
    },
    setModel: hooks.setModel,
    setEffort: hooks.setEffort,
    sessionId: hooks.sessionId,
    async reset() {
      hooks.forget();
      lastSentId = undefined;
      handedOver = true;
      draining = false;
      setStatus({ phase: null, notice: undefined });
      await core.stop();
    },
  } satisfies ChatSession;
}
