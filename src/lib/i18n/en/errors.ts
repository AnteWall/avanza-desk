// Strings from src/lib/avanza: why a request failed.
export const errors = {
  sessionExpired: "Your session expired. Sign in again to see this.",
  noData: "Avanza has no data for this instrument.",
  rateLimited: "Avanza is rate limiting requests. Try again shortly.",
  serverError: "Avanza is having problems right now.",
  answered: (status: number, statusText: string) =>
    `Avanza answered ${status} ${statusText}.`.trim(),
  unreachable: "Can't reach Avanza. Check your connection.",
  unknown: "Something went wrong while loading this.",
  /** Toast title when a push stream ends for good; `stream` is the name `follow` was given. */
  liveStopped: (stream: string) => `Live ${stream} stopped`,
};
