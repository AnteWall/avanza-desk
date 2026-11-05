import type { UIMessage } from "@tanstack/ai-react";
import { cn } from "cn";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { ChatMarkdown } from "@/components/ai/chat-markdown";
import { ContextChip } from "@/components/ai/context-chip";
import { ToolCall } from "@/components/ai/tool-call";
import { Button } from "@/components/ui/button";
import { contextKey, splitContext } from "@/lib/ai/context";
import { m } from "@/lib/i18n";

const textOf = (message: UIMessage) =>
  message.parts.map((p) => (p.type === "text" ? p.content : "")).join("\n\n");

/**
 * One chat message: yours as a bubble on the right, the assistant's as its work steps and then
 * full-width markdown. Actions show under the latest answer and on hover for older ones.
 */
export function ChatMessage({
  message,
  streaming,
  latest,
}: {
  message: UIMessage;
  streaming: boolean;
  latest: boolean;
}) {
  const [copied, setCopied] = useState(false);

  if (message.role === "user") {
    const { items, question } = splitContext(textOf(message));
    const images = message.parts.flatMap((p) =>
      p.type === "image" && p.source.type === "data"
        ? [`data:${p.source.mimeType};base64,${p.source.value}`]
        : [],
    );
    return (
      <div className="flex max-w-[85%] flex-col items-end gap-1 self-end">
        {items.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1" aria-label={m.ai.message.askedWith}>
            {items.map((item) => (
              <ContextChip key={contextKey(item)} item={item} />
            ))}
          </div>
        )}
        {images.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1">
            {images.map((src, i) => (
              <img
                key={i}
                src={src}
                alt={m.ai.message.image}
                className="max-h-40 max-w-full rounded-lg border object-contain"
              />
            ))}
          </div>
        )}
        {question && (
          <p className="bg-muted rounded-2xl rounded-br-md px-3 py-1.5 leading-relaxed break-words whitespace-pre-wrap">
            {question}
          </p>
        )}
      </div>
    );
  }

  const text = textOf(message).trim();
  const copy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group/message flex flex-col gap-2">
      {message.parts.map((part, i) => {
        if (part.type === "text" && part.content.trim()) {
          return <ChatMarkdown key={i} text={part.content} />;
        }
        if (part.type === "tool-call") {
          const result = message.parts.find(
            (p) => p.type === "tool-result" && p.toolCallId === part.id,
          );
          const failed =
            part.state === "error" || (result?.type === "tool-result" && result.state === "error");
          return (
            <ToolCall
              key={part.id}
              name={part.name}
              input={part.input ?? part.arguments}
              output={part.output}
              failed={failed}
            />
          );
        }
        return null;
      })}
      {text && !streaming && (
        <div
          className={cn(
            "-mt-1 flex transition-opacity group-hover/message:opacity-100 focus-within:opacity-100",
            !latest && "opacity-0",
          )}
        >
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={copied ? m.common.copied : m.ai.message.copy}
            title={copied ? m.common.copied : m.ai.message.copy}
            onClick={copy}
            className="text-muted-foreground"
          >
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
      )}
    </div>
  );
}
