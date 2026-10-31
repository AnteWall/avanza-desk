/**
 * Keys in `next` that weren't in `seen`, and remembers them. The first call only records, so
 * what already existed at startup isn't reported as new.
 */
export function newKeys(seen: { keys?: Set<string> }, next: readonly string[]): string[] {
  const first = !seen.keys;
  const keys = (seen.keys ??= new Set());
  const fresh = next.filter((k) => !keys.has(k));
  for (const k of fresh) keys.add(k);
  return first ? [] : fresh;
}
