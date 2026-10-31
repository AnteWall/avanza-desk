import { type UIMessage, useChat } from "@tanstack/ai-react";
import { ArrowDown, RotateCcw } from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { ChatComposer } from "@/components/ai/chat-composer";
import { ChatMessage } from "@/components/ai/chat-message";
import { ChatStatus } from "@/components/ai/chat-status";
import { ChatSuggestions } from "@/components/ai/chat-suggestions";
import { UsageNotice } from "@/components/ai/usage-notice";
import { useStickToBottom } from "@/components/ai/use-stick-to-bottom";
import { useViewContext } from "@/components/ai/use-view-context";
import { Button } from "@/components/ui/button";
import { type Ask, takeAsks } from "@/lib/ai/ask";
import { type ContextItem, contextKey, withContext } from "@/lib/ai/context";
import type { Attachment } from "@/lib/ai/images";
import type { ChatSession, RateLimit } from "@/lib/ai/types";

/** While the usage limit is reached, the time it resets; sending would only fail until then. */
function blockedUntil(limit: RateLimit | undefined) {
  if (limit?.status !== "rejected" || !limit.resetsAt) return undefined;
  return limit.resetsAt * 1000 > Date.now() ? limit.resetsAt * 1000 : undefined;
}

/**
 * One conversation: the messages, the live status and the message box. `onAnswered` runs after
 * each finished answer, to save the chat.
 */
export function Chat({
  session,
  initialMessages,
  onAnswered,
  toolbar,
}: {
  session: ChatSession;
  initialMessages?: UIMessage[];
  onAnswered: (messages: UIMessage[]) => void;
  /** Controls in the message box's toolbar (the model picker). */
  toolbar?: ReactNode;
}) {
  const [threadId] = useState(() => crypto.randomUUID());
  const { messages, sendMessage, stop, reload, isLoading, error } = useChat({
    connection: session.connection,
    threadId,
    initialMessages,
  });
  const live = useSyncExternalStore(session.status.subscribe, session.status.get);
  const { scrollRef, contentRef, atBottom, scrollToBottom } = useStickToBottom<
    HTMLDivElement,
    HTMLDivElement
  >();

  // Save once per answer: when a run settles with messages newer than the last save (opening a
  // saved chat isn't a change).
  const saved = useRef(initialMessages?.at(-1)?.id);
  useEffect(() => {
    const lastId = messages.at(-1)?.id;
    if (isLoading || !lastId || lastId === saved.current) return;
    saved.current = lastId;
    onAnswered([...messages]);
  }, [isLoading, messages, onAnswered]);

  // What the user sees goes with each message, minus the chips they removed. Removals last
  // until the view changes.
  const view = useViewContext();
  const viewKey = view.map(contextKey).join("|");
  const [removed, setRemoved] = useState<{ view: string; keys: Set<string> }>();
  // Items asked about from elsewhere (a row's menu, an @ mention): kept until sent.
  const [pinned, setPinned] = useState<ContextItem[]>([]);
  const pinnedKeys = new Set(pinned.map(contextKey));
  const context = [
    ...pinned,
    ...view.filter(
      (item) =>
        !pinnedKeys.has(contextKey(item)) &&
        (removed?.view !== viewKey || !removed.keys.has(contextKey(item))),
    ),
  ];

  const send = (text: string, images: Attachment[] = [], items = context) => {
    scrollToBottom();
    const question = withContext(text, items);
    void sendMessage(
      images.length
        ? {
            content: [
              { type: "text", content: question },
              ...images.map((image) => ({
                type: "image" as const,
                source: { type: "data" as const, value: image.data, mimeType: image.mimeType },
              })),
            ],
          }
        : question,
    );
    setPinned([]);
  };
  const pin = (item: ContextItem) =>
    setPinned((p) => (p.some((i) => contextKey(i) === contextKey(item)) ? p : [...p, item]));

  // "Ask the assistant" from elsewhere in the app: attach its items, then send its prompt or
  // leave it in the box to finish.
  const [seed, setSeed] = useState<{ text: string; n: number }>();
  const takeAsk = useEffectEvent((ask: Ask) => {
    if (ask.send && ask.prompt && !isLoading) {
      send(ask.prompt, [], [...ask.items, ...context.filter((c) => c.kind === "page")]);
    } else {
      for (const item of ask.items) pin(item);
      setSeed({ text: ask.prompt ?? "", n: ask.n });
    }
  });
  // After the mount settles: StrictMode's rehearsal unmount detaches useChat, which cancels a
  // stream started in the mount pass (the ask that opened the panel would get no answer).
  useEffect(() => {
    let release: (() => void) | undefined;
    const timer = setTimeout(() => (release = takeAsks(takeAsk)));
    return () => {
      clearTimeout(timer);
      release?.();
    };
  }, []);
  const last = messages.at(-1);

  return (
    <div className="flex h-full flex-col">
      <div className="relative min-h-0 flex-1">
        <div ref={scrollRef} className="h-full overflow-y-auto">
          <div ref={contentRef} className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-3">
            {messages.length === 0 && <ChatSuggestions onPick={send} />}
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                message={m}
                streaming={isLoading && m === last}
                latest={m === last}
              />
            ))}
            {isLoading && live.phase && live.phase !== "writing" && (
              <ChatStatus phase={live.phase} />
            )}
            {live.notice && (
              <p className="text-muted-foreground border-l-2 pl-2.5 text-xs" role="status">
                {live.notice}
              </p>
            )}
            {error && !isLoading && (
              <div role="alert" className="flex flex-col items-start gap-1.5">
                <p className="text-destructive whitespace-pre-wrap">{error.message}</p>
                <Button variant="outline" size="xs" onClick={() => void reload()}>
                  <RotateCcw />
                  Try again
                </Button>
              </div>
            )}
          </div>
        </div>
        {!atBottom && (
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Jump to latest"
            title="Jump to latest"
            onClick={scrollToBottom}
            className="bg-card absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full"
          >
            <ArrowDown />
          </Button>
        )}
      </div>
      {live.rateLimit && <UsageNotice limit={live.rateLimit} />}
      <ChatComposer
        onSend={send}
        onStop={stop}
        busy={isLoading}
        blocked={blockedUntil(live.rateLimit)}
        toolbar={toolbar}
        context={context}
        onRemoveContext={(item) =>
          pinnedKeys.has(contextKey(item))
            ? setPinned((p) => p.filter((i) => contextKey(i) !== contextKey(item)))
            : setRemoved((r) => ({
                view: viewKey,
                keys: new Set([...(r?.view === viewKey ? r.keys : []), contextKey(item)]),
              }))
        }
        onMention={pin}
        seed={seed}
      />
    </div>
  );
}
