import { cn } from "./utils";

test("cn merges conflicting tailwind classes", () => {
  expect(cn("px-2", "px-4", undefined)).toBe("px-4");
});
