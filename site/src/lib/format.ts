// "2026-11-04" → "4 Nov 2026". Parsed as UTC so the build machine's timezone can't shift the day.
export const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

// Swedish digits like the app (DESIGN.md): 12,3 MB.
export const formatSize = (bytes: number) =>
  `${(bytes / 1e6).toLocaleString("sv-SE", { maximumFractionDigits: 1, minimumFractionDigits: 1 })} MB`;
