import { describe, expect, it } from "vitest";

import { defaultPreferences, instructionsFrom } from "./preferences";

describe("instructionsFrom", () => {
  it("sends nothing for the defaults", () => {
    expect(instructionsFrom(defaultPreferences)).toBeUndefined();
  });

  it("combines language, detail and the user's note", () => {
    expect(
      instructionsFrom({
        ...defaultPreferences,
        language: "en",
        detail: "brief",
        about: "  Long-term, low risk.  ",
      }),
    ).toBe(
      "Always answer in English.\nKeep answers brief: the key facts and numbers, no preamble.\n" +
        "About me, as an investor:\nLong-term, low risk.",
    );
  });
});
