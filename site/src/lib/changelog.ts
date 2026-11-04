// Parses git-cliff's CHANGELOG.md (cliff.toml) into releases for the changelog page.
export type Change = { scope?: string; text: string };
export type Release = {
  version: string;
  date?: string;
  sections: { title: string; changes: Change[] }[];
};

export function parseChangelog(md: string): Release[] {
  const releases: Release[] = [];
  for (const line of md.split("\n")) {
    const release = line.match(/^## (\S+)(?: \((\d{4}-\d{2}-\d{2})\))?/);
    if (release) {
      releases.push({ version: release[1], date: release[2], sections: [] });
      continue;
    }
    const current = releases.at(-1);
    if (!current) continue;
    const section = line.match(/^### (.+)/);
    if (section) current.sections.push({ title: section[1].trim(), changes: [] });
    const item = line.match(/^- (?:\*\*(.+?):\*\* )?(.+)/);
    if (item) current.sections.at(-1)?.changes.push({ scope: item[1], text: item[2].trim() });
  }
  return releases;
}
