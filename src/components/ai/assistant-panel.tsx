import type { UIMessage } from "@tanstack/ai-react";
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import {
  ChevronDown,
  CircleDashed,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Sparkles,
  SquarePen,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { ApiKeySetup } from "@/components/ai/api-key-setup";
import { AssistantOff } from "@/components/ai/assistant-off";
import { Chat } from "@/components/ai/chat";
import { ChatHistory } from "@/components/ai/chat-history";
import { ModelPicker, type ModelSource, type Selection } from "@/components/ai/model-picker";
import { PanelResizeHandle } from "@/components/ai/panel-resize-handle";
import { ProviderSetup } from "@/components/ai/provider-setup";
import { useAssistantEnabled } from "@/components/ai/use-assistant-enabled";
import { useConnectedProviders } from "@/components/ai/use-connected-providers";
import { usePanelSize } from "@/components/ai/use-panel-size";
import { providerSetupQuery, useProviderSetup } from "@/components/ai/use-provider-setup";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/workspace/panel";
import { getAskCount, subscribeAssistant } from "@/lib/ai/ask";
import { chatsKey, chatTitle, loadChat, saveChat } from "@/lib/ai/history";
import { panelCssWidth, togglePanelExpanded } from "@/lib/ai/panel";
import { getPreferences, instructionsFrom } from "@/lib/ai/preferences";
import {
  getEffort,
  getModel,
  getProvider,
  setEffort,
  setModel,
  setProvider,
} from "@/lib/ai/providers";
import type { SessionOptions } from "@/lib/ai/types";

/** The open conversation: a fresh one, or a saved one with its messages and provider session. */
type Current = {
  id: string;
  title?: string;
  messages?: UIMessage[];
  resume?: string;
  /** Not saved to history, and the provider keeps no transcript either. */
  temporary?: boolean;
};

const fresh = (temporary = false): Current => ({ id: crypto.randomUUID(), temporary });

/**
 * The AI assistant: picks among the connected providers and their models, walks you through
 * setting up the chosen provider when it isn't ready, lists earlier chats, and otherwise hosts
 * the conversation.
 */
export function AssistantPanel() {
  const queryClient = useQueryClient();
  const connected = useConnectedProviders();
  const [chosen, setChosen] = useState(() => getProvider().id);
  // The chosen provider while it's connected; disconnecting it falls back to another one.
  const provider = connected.find((p) => p.id === chosen) ?? connected[0] ?? getProvider();
  // Model and effort live in the settings; picking one saves it and re-renders.
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const model = getModel(provider);
  const effort = getEffort(provider);
  const [current, setCurrent] = useState(fresh);
  // The open chat's messages as of the last answer, carried over when the provider changes.
  const latest = useRef<UIMessage[] | undefined>(undefined);
  const [showHistory, setShowHistory] = useState(false);
  // An "Ask the assistant" from elsewhere shows the chat, even if the history list was open.
  const asks = useSyncExternalStore(subscribeAssistant, getAskCount);
  const [seenAsks, setSeenAsks] = useState(asks);
  if (asks !== seenAsks) {
    setSeenAsks(asks);
    setShowHistory(false);
  }
  const enabled = useAssistantEnabled();
  const { data: setup } = useProviderSetup(provider);
  const size = usePanelSize();
  const ready = setup?.state === "ready" ? setup : undefined;
  // Every connected provider that's ready offers its models in the picker.
  const setups = useQueries({ queries: connected.map((p) => providerSetupQuery(p, true)) });
  const sources: ModelSource[] = connected.flatMap((p, i) => {
    const s = setups[i]?.data;
    return s?.state === "ready"
      ? [{ provider: p, models: s.models, defaultModel: s.defaultModel }]
      : [];
  });

  const efforts = ready?.models.find((m) => m.value === (model ?? ready.defaultModel))?.efforts;

  // A new session per provider, binary and conversation; the old one's process ends with it.
  // Its options read the settings each time a process starts, so they're always the latest.
  const session = useMemo(
    () =>
      provider.createSession((): SessionOptions => {
        const picked = getModel(provider);
        const supported = ready?.models.find(
          (m) => m.value === (picked ?? ready.defaultModel),
        )?.efforts;
        const level = getEffort(provider);
        return {
          model: picked,
          effort: level && supported?.includes(level) ? level : undefined,
          instructions: instructionsFrom(getPreferences()),
          webSearch: getPreferences().webSearch,
          persist: !current.temporary,
        };
      }, current.resume),
    // A new binary must start a new process; turning the assistant off ends the running one.
    // oxlint-disable-next-line exhaustive-deps
    [provider, ready?.bin, current, enabled],
  );
  useEffect(() => () => void session.reset(), [session]);

  /**
   * Continues the open chat with another provider: it keeps the messages so far, and the new
   * provider gets them as text with the next question (it can't resume the other's session).
   */
  const switchProvider = (id: string) => {
    if (id === provider.id) return;
    void setProvider(id);
    setChosen(id);
    setCurrent((c) => ({ ...c, messages: latest.current ?? c.messages, resume: undefined }));
  };
  const pickEffort = (value: string | undefined) => {
    void setEffort(provider, value);
    refresh();
    void session.setEffort();
  };
  const select = ({ provider: next, model: value }: Selection) => {
    if (next !== provider) switchProvider(next.id);
    if (!value) return;
    void setModel(next, value);
    refresh();
    // Same provider: the running conversation switches model and keeps its context.
    if (next === provider) void session.setModel(value);
  };

  const save = useCallback(
    async (messages: UIMessage[]) => {
      if (current.temporary) return;
      // The first question names the chat; a rename (or a reopened title) sticks.
      const title = current.title ?? chatTitle(messages);
      setCurrent((c) => (c.id === current.id && !c.title ? { ...c, title } : c));
      await saveChat({
        id: current.id,
        provider: provider.id,
        sessionId: session.sessionId() ?? null,
        model: getModel(provider) ?? null,
        title,
        messages,
      });
      await queryClient.invalidateQueries({ queryKey: chatsKey });
    },
    [current.id, current.title, current.temporary, provider, session, queryClient],
  );

  const newChat = (temporary = false) => {
    latest.current = undefined;
    setCurrent(fresh(temporary));
    setShowHistory(false);
  };
  const open = async (id: string) => {
    setShowHistory(false);
    if (id === current.id) return;
    const chat = await loadChat(id);
    if (!chat) return;
    latest.current = undefined;
    // A chat from a provider that's no longer connected continues with the current one, which
    // gets the earlier turns as text.
    const known = connected.some((p) => p.id === chat.provider);
    if (known) {
      void setProvider(chat.provider);
      setChosen(chat.provider);
    }
    setCurrent({
      id: chat.id,
      title: chat.title,
      messages: chat.messages,
      resume: known ? (chat.sessionId ?? undefined) : undefined,
    });
  };
  // Deleting the open chat leaves an empty one behind, without leaving the list.
  const deleted = (id: string) => id === current.id && newChat();

  return (
    <div className="relative h-full" style={{ width: panelCssWidth(size) }}>
      <PanelResizeHandle />
      <Panel
        title="Assistant"
        icon={Sparkles}
        subtitle={
          ready && (
            // The chat's title opens the list of earlier chats, like a document switcher.
            <button
              type="button"
              onClick={() => setShowHistory((s) => !s)}
              aria-expanded={showHistory}
              aria-label="Chat history"
              className="hover:text-foreground focus-visible:ring-ring/50 data-[open]:text-foreground flex max-w-56 items-center gap-1 rounded-sm transition-colors outline-none focus-visible:ring-3"
              data-open={showHistory || undefined}
            >
              {current.temporary && !showHistory && (
                <CircleDashed className="size-3 shrink-0" aria-label="Temporary" />
              )}
              <span className="truncate">
                {showHistory
                  ? "History"
                  : current.temporary
                    ? "Temporary chat"
                    : (current.title ?? "New chat")}
              </span>
              <ChevronDown
                className={cn("size-3 shrink-0 transition-transform", showHistory && "rotate-180")}
                aria-hidden
              />
            </button>
          )
        }
        actions={
          <>
            {ready && (
              <Button
                variant="ghost"
                size="icon-xs"
                aria-label="New chat"
                title="New chat"
                onClick={() => newChat()}
              >
                <SquarePen />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={size.expanded ? "Narrower" : "Wider"}
              aria-pressed={size.expanded}
              title={size.expanded ? "Narrower" : "Wider, for reading"}
              onClick={togglePanelExpanded}
            >
              {size.expanded ? <Minimize2 /> : <Maximize2 />}
            </Button>
          </>
        }
      >
        {!enabled ? (
          <AssistantOff />
        ) : !setup ? (
          <p className="text-muted-foreground flex items-center gap-2 p-3 text-xs" role="status">
            <LoaderCircle className="size-3.5 motion-safe:animate-spin" />
            Connecting to {provider.name}…
          </p>
        ) : !ready ? (
          <div className="flex flex-col gap-3 p-3">
            {provider.setApiKey ? (
              <ApiKeySetup provider={provider} />
            ) : (
              <ProviderSetup provider={provider} />
            )}
            {sources.map(({ provider: other }) => (
              <Button
                key={other.id}
                variant="outline"
                size="xs"
                className="self-start"
                onClick={() => switchProvider(other.id)}
              >
                Use {other.name} instead
              </Button>
            ))}
          </div>
        ) : (
          <>
            {showHistory && (
              <ChatHistory
                currentId={current.id}
                onOpen={(id) => void open(id)}
                onDeleted={deleted}
                onRenamed={(id, title) => setCurrent((c) => (c.id === id ? { ...c, title } : c))}
              />
            )}
            {/* Kept mounted under the list, so a running answer keeps streaming. */}
            <div className={showHistory ? "hidden" : "h-full"}>
              <Chat
                key={`${provider.id}:${ready.bin}:${current.id}`}
                session={session}
                initialMessages={current.messages}
                onAnswered={(messages) => {
                  latest.current = messages;
                  void save(messages);
                }}
                toolbar={
                  <ModelPicker
                    sources={sources}
                    selection={{ provider, model }}
                    onSelect={select}
                    efforts={efforts}
                    effort={effort && efforts?.includes(effort) ? effort : undefined}
                    onEffort={pickEffort}
                    temporary={!!current.temporary}
                    onTemporary={(on) => newChat(on)}
                  />
                }
              />
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
