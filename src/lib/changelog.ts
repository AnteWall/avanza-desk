// CHANGELOG.md as git-cliff writes it (cliff.toml): "## 1.2.0 (2026-11-01)", then "### New" groups
// of "- **Scope:** Text" lines. Parsed here so the app can show what changed since you last looked.

export type ChangelogItem = { text: string; scope?: string; breaking: boolean };
export type ChangelogGroup = { title: string; items: ChangelogItem[] };
export type Release = { version: string; date?: string; groups: ChangelogGroup[] };

const RELEASE = /^## (\d+\.\d+\.\d+)(?: \((\d{4}-\d{2}-\d{2})\))?/;
const ITEM = /^- (\*\*Breaking:\*\* )?(?:\*\*(.+?):\*\* )?(.+)$/;

/** Released versions, newest first as in the file; "Unreleased" is skipped. */
export function parseChangelog(markdown: string): Release[] {
  const releases: Release[] = [];
  let release: Release | undefined;
  for (const line of markdown.split("\n")) {
    if (line.startsWith("## ")) {
      const m = RELEASE.exec(line);
      release = m ? { version: m[1]!, date: m[2], groups: [] } : undefined;
      if (release) releases.push(release);
    } else if (release && line.startsWith("### ")) {
      release.groups.push({ title: line.slice(4).trim(), items: [] });
    } else if (release?.groups.length) {
      const m = ITEM.exec(line.trim());
      if (m) release.groups.at(-1)!.items.push({ breaking: !!m[1], scope: m[2], text: m[3]! });
    }
  }
  return releases;
}

/** Negative when `a` is the older version. Plain x.y.z, as the release recipe enforces. */
export function compareVersions(a: string, b: string) {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i++) if (x![i] !== y![i]) return (x![i] ?? 0) - (y![i] ?? 0);
  return 0;
}

/** Releases after `lastSeen` up to and including `current`, newest first. */
export const unseenReleases = (releases: readonly Release[], current: string, lastSeen: string) =>
  releases.filter(
    (r) => compareVersions(r.version, lastSeen) > 0 && compareVersions(r.version, current) <= 0,
  );

// The release commit writes CHANGELOG.md before the build, so each release ships its own notes.
// A glob, not an import: the file doesn't exist until the first `just release`.
const files = import.meta.glob<string>("/CHANGELOG.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
export const REPO_URL = "https://github.com/AnteWall/avanza-desk";
export const RELEASES_URL = `${REPO_URL}/releases`;
/** A new "Ideas" discussion on GitHub, prefilled with the app version. */
export const ideaUrl = (version: string | undefined) =>
  `${REPO_URL}/discussions/new?${new URLSearchParams({
    category: "ideas",
    body: `**What would you like AvanzaDesk to do?**\n\n\n**Why would it help you?**\n\n\n---\nAvanzaDesk v${version ?? "unknown"}`,
  })}`;
export const releaseUrl = (version: string) => `${RELEASES_URL}/tag/v${version}`;

/** The notes bundled into this build. */
export const releases = parseChangelog(files["/CHANGELOG.md"] ?? "");

/** The newest bundled notes up to `version`: what "What's new" shows on demand. */
export const notesFor = (version: string | undefined) =>
  version ? releases.find((r) => compareVersions(r.version, version) <= 0) : undefined;
