import type { StreamChunk } from "@tanstack/ai";
import type { Channel } from "@tauri-apps/api/core";

import { createSession, type Hooks } from "./session";

vi.mock("@tauri-apps/api/core", () => ({
  Channel: class {
    onmessage = (_line: string) => {};
  },
}));

type Event = { t: "text" | "end"; text?: string };

function setup() {
  let channel: Channel<string> | undefined;
  const interrupt = vi.fn<() => Promise<void>>(() => Promise.resolve());
  const session = createSession<Event>(
    undefined,
    (core) =>
      ({
        statusUpdate: () => undefined,
        isExit: () => false,
        endsTurn: (e) => e.t === "end",
        toChunks: (e) => ({
          chunks: e.text ? [{ type: "TEXT", text: e.text } as unknown as StreamChunk] : [],
          done: e.t === "end",
        }),
        begin: async (c) => void (channel = c),
        end: () => Promise.resolve(),
        send: async () => {
          if (!core.running()) await core.start();
        },
        interrupt,
        forget: () => {},
        setModel: () => Promise.resolve(),
        setEffort: () => Promise.resolve(),
        sessionId: () => undefined,
      }) satisfies Hooks<Event>,
  );
  const emit = (e: Event) => channel!.onmessage(JSON.stringify(e));
  const ask = (id: string, signal?: AbortSignal) =>
    session.connection.connect(
      [{ id, role: "user", parts: [{ type: "text", content: "hi" }] }],
      undefined,
      signal,
      { threadId: "t", runId: id },
    ) as AsyncIterable<StreamChunk>;
  return { emit, ask, interrupt };
}

const texts = (chunks: StreamChunk[]) =>
  chunks.flatMap((c) => ("text" in c ? [(c as { text: string }).text] : []));

test("streams a turn's events until the one that ends it", async () => {
  const { emit, ask } = setup();
  const chunks: StreamChunk[] = [];
  for await (const chunk of ask("1")) {
    chunks.push(chunk);
    if (chunks.length === 1) {
      emit({ t: "text", text: "a" });
      emit({ t: "text", text: "b" });
      emit({ t: "end" });
    }
  }
  expect(texts(chunks)).toEqual(["a", "b"]);
});

test("a stopped turn is interrupted and its late events never reach the next one", async () => {
  const { emit, ask, interrupt } = setup();
  const stop = new AbortController();
  for await (const _ of ask("1", stop.signal)) {
    emit({ t: "text", text: "a" });
    stop.abort();
  }
  expect(interrupt).toHaveBeenCalledOnce();

  const chunks: StreamChunk[] = [];
  for await (const chunk of ask("2")) {
    chunks.push(chunk);
    if (chunks.length === 1) {
      emit({ t: "text", text: "late" });
      emit({ t: "end" });
      emit({ t: "text", text: "new" });
      emit({ t: "end" });
    }
  }
  expect(texts(chunks)).toEqual(["new"]);
});
