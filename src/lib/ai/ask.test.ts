import { describe, expect, it, vi } from "vitest";

import { type Ask, askAssistant, getAskCount, isAssistantOpen, takeAsks } from "./ask";

vi.mock("@/lib/settings", () => ({
  getSetting: () => false,
  saveSetting: () => Promise.resolve(),
}));

const volvo = { kind: "instrument", id: "5269", name: "Volvo B" } as const;

describe("askAssistant", () => {
  it("opens the panel and hands a waiting request to the chat when it mounts", () => {
    askAssistant({ items: [volvo], prompt: "Why?" });
    expect(isAssistantOpen()).toBe(true);
    const take = vi.fn<(ask: Ask) => void>();
    const stop = takeAsks(take);
    expect(take).toHaveBeenCalledWith(expect.objectContaining({ prompt: "Why?" }));

    // Later requests go straight to the mounted chat.
    askAssistant({ items: [volvo], send: true, prompt: "Again" });
    expect(take).toHaveBeenLastCalledWith(expect.objectContaining({ prompt: "Again", send: true }));
    expect(getAskCount()).toBe(2);
    stop();
  });
});
