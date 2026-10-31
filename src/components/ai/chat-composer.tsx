import { ArrowUp, AtSign, ImagePlus, Square, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { ContextChip } from "@/components/ai/context-chip";
import { MentionList } from "@/components/ai/mention-list";
import { useMentionOptions } from "@/components/ai/use-mention-options";
import { Button } from "@/components/ui/button";
import { type ContextItem, contextKey } from "@/lib/ai/context";
import { type Attachment, imageFiles, MAX_IMAGES, readImage } from "@/lib/ai/images";
import { formatTime } from "@/lib/format";

/** "@vol" right before the caret: the mention being typed, if any. */
const MENTION = /(^|\s)@([^\s@]{0,30})$/;

/**
 * The message box: what the assistant will see (context chips and images), the text, then a
 * toolbar (the model chip, then send/stop). Enter sends, Shift+Enter adds a line, Escape stops
 * a running answer. "@" mentions an instrument; images can be pasted, dropped or picked.
 */
export function ChatComposer({
  onSend,
  onStop,
  busy,
  toolbar,
  context,
  onRemoveContext,
  onMention,
  seed,
  blocked,
}: {
  onSend: (text: string, images: Attachment[]) => void;
  onStop: () => void;
  busy: boolean;
  toolbar?: ReactNode;
  context: readonly ContextItem[];
  onRemoveContext: (item: ContextItem) => void;
  onMention: (item: ContextItem) => void;
  /** Text put in the box from elsewhere ("Ask about …"); `n` changes per request. */
  seed?: { text: string; n: number };
  /** Usage limit reached: sending is off until this time (ms). */
  blocked?: number;
}) {
  const [draft, setDraft] = useState("");
  const [images, setImages] = useState<Attachment[]>([]);
  const [mention, setMention] = useState<string>();
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const options = useMentionOptions(mention);

  // Focus when the panel opens and after each answer, so you can keep typing.
  useEffect(() => {
    if (!busy) box.current?.focus();
  }, [busy]);

  // A new seed replaces the draft (adjusted during render, React's pattern for props).
  const [seeded, setSeeded] = useState(seed?.n);
  if (seed && seed.n !== seeded) {
    setSeeded(seed.n);
    setDraft(seed.text);
  }
  useEffect(() => {
    if (seed) box.current?.focus();
  }, [seed]);

  // Auto-grow by hand: WebKitGTK (Linux) has no `field-sizing: content`.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [draft]);

  const typed = (value: string, caret: number) => {
    setDraft(value);
    const match = MENTION.exec(value.slice(0, caret));
    setMention(match?.[2]);
    setActive(0);
  };

  const pick = (item: ContextItem) => {
    const el = box.current;
    const caret = el?.selectionStart ?? draft.length;
    const before = draft.slice(0, caret).replace(MENTION, "$1");
    setDraft(before + draft.slice(caret));
    setMention(undefined);
    onMention(item);
    el?.focus();
  };

  const attach = async (files: File[]) => {
    const room = MAX_IMAGES - images.length;
    if (room <= 0 || files.length === 0) return;
    const read = await Promise.all(files.slice(0, room).map((f) => readImage(f).catch(() => null)));
    setImages((current) => [...current, ...read.filter((a) => a !== null)].slice(0, MAX_IMAGES));
  };

  const send = () => {
    if ((!draft.trim() && images.length === 0) || busy || blocked) return;
    onSend(draft.trim(), images);
    setDraft("");
    setImages([]);
    setMention(undefined);
  };

  return (
    <form
      className="mx-auto flex w-full max-w-3xl flex-col gap-1.5 px-2 pt-1 pb-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <div className="relative">
        {mention !== undefined && (
          <MentionList options={options} active={active} onPick={pick} query={mention} />
        )}
        {/* Clicking the frame's empty space focuses the text, like one big field. */}
        <div
          onClick={(e) => e.target === e.currentTarget && box.current?.focus()}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            void attach(imageFiles(e.dataTransfer.files));
          }}
          data-dragging={dragging || undefined}
          className="bg-card focus-within:border-ring focus-within:ring-ring/30 dark:bg-input/20 data-dragging:border-brand data-dragging:bg-brand/5 flex flex-col rounded-xl border transition-colors focus-within:ring-3 data-dragging:border-dashed"
        >
          {(context.length > 0 || images.length > 0) && (
            <div
              className="flex flex-wrap items-center gap-1 px-2 pt-2"
              title="What the assistant sees with your next message"
            >
              {context.length > 0 && (
                <AtSign className="text-muted-foreground size-3.5" aria-label="Context" />
              )}
              {context.map((item) => (
                <ContextChip
                  key={contextKey(item)}
                  item={item}
                  onRemove={() => onRemoveContext(item)}
                />
              ))}
              {images.map((image, i) => (
                <span key={image.url} className="group/image relative">
                  <img
                    src={image.url}
                    alt={image.name}
                    className="size-12 rounded-md border object-cover"
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${image.name}`}
                    onClick={() => setImages((all) => all.filter((_, j) => j !== i))}
                    className="bg-foreground text-background focus-visible:ring-ring/50 absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full opacity-0 transition-opacity outline-none group-hover/image:opacity-100 focus-visible:opacity-100 focus-visible:ring-2"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <textarea
            ref={box}
            rows={1}
            value={draft}
            onChange={(e) => typed(e.target.value, e.target.selectionStart)}
            onPaste={(e) => {
              const files = imageFiles(e.clipboardData.files);
              if (files.length === 0) return;
              e.preventDefault();
              void attach(files);
            }}
            onKeyDown={(e) => {
              if (mention !== undefined && options.length > 0) {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                  e.preventDefault();
                  const step = e.key === "ArrowDown" ? 1 : -1;
                  setActive((a) => (a + step + options.length) % options.length);
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  pick(options[active]);
                  return;
                }
              }
              if (e.key === "Escape" && mention !== undefined) {
                e.preventDefault();
                setMention(undefined);
              } else if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              } else if (e.key === "Escape" && busy) {
                e.preventDefault();
                onStop();
              }
            }}
            placeholder={
              blocked
                ? `Usage limit reached. You can send again at ${formatTime(blocked)}.`
                : "Ask anything… @ to mention an instrument"
            }
            aria-label="Message the assistant"
            className="placeholder:text-muted-foreground max-h-40 resize-none bg-transparent px-3 pt-2.5 pb-1 leading-relaxed outline-none"
          />
          <div className="flex items-center gap-1 px-1.5 pb-1.5">
            {toolbar}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Attach an image"
              title="Attach an image (or paste one)"
              disabled={images.length >= MAX_IMAGES}
              onClick={() => picker.current?.click()}
              className="text-muted-foreground rounded-full"
            >
              <ImagePlus />
            </Button>
            <input
              ref={picker}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              hidden
              onChange={(e) => {
                void attach(imageFiles(e.target.files));
                e.target.value = "";
              }}
            />
            <span className="flex-1" />
            {busy ? (
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                aria-label="Stop (Esc)"
                title="Stop (Esc)"
                onClick={onStop}
                className="rounded-full"
              >
                <Square className="size-3 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon-sm"
                aria-label="Send (Enter)"
                title="Send (Enter)"
                disabled={(!draft.trim() && images.length === 0) || !!blocked}
                className="rounded-full"
              >
                <ArrowUp />
              </Button>
            )}
          </div>
        </div>
      </div>
      <p className="text-muted-foreground text-center text-xs">
        AI can make mistakes. Check the numbers before you trade.
      </p>
    </form>
  );
}
