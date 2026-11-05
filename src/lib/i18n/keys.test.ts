import { languages, type Messages } from "@/lib/i18n";
import { en } from "@/lib/i18n/en";

// tsc already checks each language against English's shape. This also covers what types
// can't: open code maps (`Record<string, string>`), array lengths, empty strings, and a
// function that takes a different number of values than English's.
const dictionaries = import.meta.glob<{ default: Messages }>("./*/index.ts", { eager: true });

/** Every mismatch between `source` and `target`, as dotted paths. */
function diff(source: unknown, target: unknown, path = "m"): string[] {
  const kind = (v: unknown) => (Array.isArray(v) ? "array" : typeof v);
  if (kind(source) !== kind(target)) return [`${path}: ${kind(source)} vs ${kind(target)}`];
  if (typeof source === "string") return (target as string).trim() ? [] : [`${path}: empty`];
  if (typeof source === "function") {
    const [a, b] = [source.length, (target as typeof source).length];
    return a === b ? [] : [`${path}: takes ${a} values in English, ${b} here`];
  }
  if (source === null || typeof source !== "object") return [];
  const s = source as Record<string, unknown>;
  const t = target as Record<string, unknown>;
  return [
    ...Object.keys(t)
      .filter((k) => !(k in s))
      .map((k) => `${path}.${k}: not in English`),
    ...Object.keys(s).flatMap((k) =>
      k in t ? diff(s[k], t[k], `${path}.${k}`) : [`${path}.${k}: missing`],
    ),
  ];
}

const others = Object.entries(languages)
  .map(([code]) => code)
  .filter((code) => code !== "en");

test("every language folder is registered", () => {
  const folders = Object.keys(dictionaries)
    .map((p) => p.split("/")[1])
    .filter((f) => f !== "en");
  expect(folders.toSorted()).toEqual(others.toSorted());
});

test.each(others)("%s has every English key, and nothing else", (code) => {
  expect(diff(en, dictionaries[`./${code}/index.ts`]!.default)).toEqual([]);
});

test("the check catches a missing and an extra key", () => {
  expect(diff({ a: "x", b: { c: "y" } }, { a: "x", b: { d: "y" } })).toEqual([
    "m.b.d: not in English",
    "m.b.c: missing",
  ]);
});
