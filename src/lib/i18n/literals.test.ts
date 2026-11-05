// @vitest-environment node
/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

// Every UI string goes through `m` (src/lib/i18n). This fails on English left in components:
// text between JSX tags and literal values of the props people read.
// ponytail: regex, not a parser (TypeScript 7 has no JS API); a false hit can be rewritten.
const ROOT = path.resolve(import.meta.dirname, "../../components");
const TEXT = /(?<![=-])>([^<>{}();=`]*?[A-Za-z]{2}[^<>{}();=`]*)</g;
const PROP = /\b(?:title|placeholder|aria-label|label|hint|description)="([^"]*[A-Za-z]{2}[^"]*)"/g;
// Names, codes and symbols read the same in every language.
const ALLOWED =
  /^(AvanzaDesk|Avanza|Claude|Claude Code|Codex|OpenAI|ChatGPT|GitHub|[A-Z0-9]{1,5})$/;

function literals(file: string) {
  const code = readFileSync(path.join(ROOT, file), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  return [...code.matchAll(TEXT), ...code.matchAll(PROP)]
    .map((match) => match[1].trim().replace(/\s+/g, " "))
    .filter((text) => !ALLOWED.test(text))
    .map((text) => `${file}: ${text}`);
}

const files = readdirSync(ROOT, { recursive: true, encoding: "utf8" }).filter(
  (f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx") && !f.startsWith("ui/"),
);

test("components have no untranslated UI strings", () => {
  expect(files.flatMap(literals)).toEqual([]);
});
