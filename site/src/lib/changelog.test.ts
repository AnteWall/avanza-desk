import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { parseChangelog } from "./changelog.ts";

test("parses releases, sections and scoped items", () => {
  const md = `# Changelog\n\nintro\n\n## 0.2.0 (2026-11-01)\n\n### New\n\n- **Analysis:** Trading profile\n- What's new dialog\n\n### Fixed\n\n- **Charts:** Tooltips\n\n## 0.1.0 (2026-10-31)\n\n### New\n\n- Auto-update\n`;
  assert.deepEqual(parseChangelog(md), [
    {
      version: "0.2.0",
      date: "2026-11-01",
      sections: [
        {
          title: "New",
          changes: [
            { scope: "Analysis", text: "Trading profile" },
            { scope: undefined, text: "What's new dialog" },
          ],
        },
        { title: "Fixed", changes: [{ scope: "Charts", text: "Tooltips" }] },
      ],
    },
    {
      version: "0.1.0",
      date: "2026-10-31",
      sections: [{ title: "New", changes: [{ scope: undefined, text: "Auto-update" }] }],
    },
  ]);
});

test("the real changelog parses with no empty releases", () => {
  const releases = parseChangelog(
    readFileSync(new URL("../../../CHANGELOG.md", import.meta.url), "utf8"),
  );
  assert.ok(releases.length > 0);
  for (const r of releases)
    assert.ok(
      r.sections.some((s) => s.changes.length),
      r.version,
    );
});
