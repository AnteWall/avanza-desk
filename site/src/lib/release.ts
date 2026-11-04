// The latest GitHub release, read once at build time. The site workflow rebuilds after every release.
export const REPO = "AnteWall/avanza-desk";
export const RELEASES_URL = `https://github.com/${REPO}/releases/latest`;

export type Download = {
  os: "mac" | "windows" | "linux";
  /** The mark shown on this file's button (os-icon.astro). */
  icon: "mac" | "windows" | "linux" | "debian" | "fedora";
  label: string;
  detail: string;
  url: string;
  size: number;
};
export type LatestRelease = { version: string; date: string; downloads: Download[] };

// Asset name suffixes from tauri-action's bundles, in display order.
const KINDS: (Omit<Download, "url" | "size"> & { suffix: string })[] = [
  {
    suffix: "_aarch64.dmg",
    os: "mac",
    icon: "mac",
    label: "macOS",
    detail: "Apple silicon · .dmg",
  },
  { suffix: "_x64.dmg", os: "mac", icon: "mac", label: "macOS", detail: "Intel · .dmg" },
  {
    suffix: "_x64-setup.exe",
    os: "windows",
    icon: "windows",
    label: "Windows",
    detail: "Installer · .exe",
  },
  {
    suffix: "_en-US.msi",
    os: "windows",
    icon: "windows",
    label: "Windows",
    detail: "MSI package · .msi",
  },
  {
    suffix: "_amd64.AppImage",
    os: "linux",
    icon: "linux",
    label: "Linux",
    detail: "Any distro · .AppImage",
  },
  {
    suffix: "_amd64.deb",
    os: "linux",
    icon: "debian",
    label: "Linux",
    detail: "Debian, Ubuntu · .deb",
  },
  {
    suffix: ".x86_64.rpm",
    os: "linux",
    icon: "fedora",
    label: "Linux",
    detail: "Fedora, openSUSE · .rpm",
  },
];

type GhRelease = {
  tag_name: string;
  published_at: string;
  assets: { name: string; size: number; browser_download_url: string }[];
};

async function github<T>(path: string): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json() as Promise<T>;
}

// Fetched once per build for the nav on every page; without it the button just shows no count.
const starCount = github<{ stargazers_count: number }>("").then(
  (r) => r.stargazers_count,
  () => undefined,
);
export const stars = () => starCount;

export async function latestRelease(): Promise<LatestRelease | undefined> {
  try {
    const gh = await github<GhRelease>("/releases/latest");
    const downloads = KINDS.flatMap(({ suffix, ...k }) => {
      const asset = gh.assets.find((a) => a.name.endsWith(suffix));
      return asset ? [{ ...k, url: asset.browser_download_url, size: asset.size }] : [];
    });
    return {
      version: gh.tag_name.replace(/^v/, ""),
      date: gh.published_at.slice(0, 10),
      downloads,
    };
  } catch (e) {
    // CI must not publish a site without downloads; locally (offline) the page falls back to the releases link.
    if (process.env.CI) throw e;
    console.warn(`latest release unavailable, using fallback links: ${e}`);
    return undefined;
  }
}
