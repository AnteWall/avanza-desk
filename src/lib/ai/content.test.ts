import type { UIMessage } from "@tanstack/ai-react";
import { describe, expect, it } from "vitest";

import { lastUserContent, transcript, withHistory } from "./content";

const msg = (id: string, role: "user" | "assistant", ...parts: UIMessage["parts"]) =>
  ({ id, role, parts }) as UIMessage;
const text = (content: string) => ({ type: "text", content }) as const;

describe("lastUserContent", () => {
  it("sends the last question's text, then its images", () => {
    const messages = [
      msg("1", "user", text("old")),
      msg("2", "assistant", text("answer")),
      msg("3", "user", text("What is this chart?"), {
        type: "image",
        source: { type: "data", value: "QUJD", mimeType: "image/png" },
      } as UIMessage["parts"][number]),
    ];
    expect(lastUserContent(messages)).toEqual({
      id: "3",
      blocks: [
        { type: "text", text: "What is this chart?" },
        { type: "image", source: { type: "base64", media_type: "image/png", data: "QUJD" } },
      ],
    });
  });
});

describe("transcript", () => {
  it("writes the turns before the last question, without context blocks", () => {
    const messages = [
      msg(
        "1",
        "user",
        text('<app_context>\n[{"kind":"page","label":"News"}]\n</app_context>\n\nHi'),
      ),
      msg("2", "assistant", text("Hello!")),
      msg("3", "user", text("new question")),
    ];
    expect(transcript(messages)).toBe("User: Hi\n\nAssistant: Hello!");
    expect(transcript([msg("1", "user", text("only"))])).toBe("");
  });
});

describe("withHistory", () => {
  it("puts earlier turns before the question, and leaves a first question alone", () => {
    const question = [{ type: "text" as const, text: "And now?" }];
    const messages = [
      msg("1", "user", text("Hi")),
      msg("2", "assistant", text("Hello!")),
      msg("3", "user", text("And now?")),
    ];
    const [first] = withHistory(question, messages);
    expect(first).toMatchObject({ type: "text" });
    expect(first?.type === "text" && first.text).toMatch(
      /^\(Our earlier conversation.*\n\nUser: Hi\n\nAssistant: Hello!\n\n\(My new message:\)\n\nAnd now\?$/s,
    );
    expect(withHistory(question, [msg("1", "user", text("And now?"))])).toBe(question);
  });
});
