import { expect, test } from "vitest";

import { toCsv } from "./csv";

test("joins with semicolons and quotes fields that need it", () => {
  expect(
    toCsv([
      ["Name", "Last"],
      ['Say "hi"; ok', "1 234,50"],
    ]),
  ).toBe('Name;Last\r\n"Say ""hi""; ok";1 234,50\r\n');
});
