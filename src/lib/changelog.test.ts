import { expect, test } from "vitest";

import { compareVersions, parseChangelog, unseenReleases } from "./changelog";

// The shape git-cliff writes with cliff.toml.
const md = `# Changelog

What changed in each AvanzaDesk release. Generated from commit messages by git-cliff.

## Unreleased

### New

- Not out yet

## 0.10.0 (2026-12-01)

### New

- **Breaking:** **Settings:** Old layouts are reset
- Add one-line install scripts

### Fixed

- **Charts:** Tooltips show labeled values

## 0.2.0 (2026-11-01)

### New

- **Analysis:** Trading profile finds habits in your trades
`;

test("parses releases, groups and scoped items, skipping Unreleased", () => {
  const releases = parseChangelog(md);
  expect(releases.map((r) => [r.version, r.date])).toEqual([
    ["0.10.0", "2026-12-01"],
    ["0.2.0", "2026-11-01"],
  ]);
  expect(releases[0]!.groups).toEqual([
    {
      title: "New",
      items: [
        { breaking: true, scope: "Settings", text: "Old layouts are reset" },
        { breaking: false, scope: undefined, text: "Add one-line install scripts" },
      ],
    },
    {
      title: "Fixed",
      items: [{ breaking: false, scope: "Charts", text: "Tooltips show labeled values" }],
    },
  ]);
  expect(parseChangelog("")).toEqual([]);
});

test("picks the releases since the last one you saw, numerically not as text", () => {
  expect(compareVersions("0.10.0", "0.9.0")).toBeGreaterThan(0);
  const releases = parseChangelog(md);
  const versions = (current: string, seen: string) =>
    unseenReleases(releases, current, seen).map((r) => r.version);
  expect(versions("0.10.0", "0.1.0")).toEqual(["0.10.0", "0.2.0"]);
  expect(versions("0.10.0", "0.2.0")).toEqual(["0.10.0"]);
  expect(versions("0.2.0", "0.1.0")).toEqual(["0.2.0"]); // newer entries than the app: not yet
  expect(versions("0.10.0", "0.10.0")).toEqual([]);
});
