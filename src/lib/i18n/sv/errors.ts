import type { Messages } from "@/lib/i18n";

// The stream names `follow` is called with (src/lib/avanza/push.ts callers).
const streams: Record<string, string> = {
  quotes: "kurser",
  "quotes file": "kursfil",
  "watchlist quotes": "kurser i bevakningslistan",
  "order book": "orderdjup",
  trades: "avslut",
  orders: "ordrar",
  deals: "avslut",
  "stop losses": "stop-loss",
};

export const errors: Messages["errors"] = {
  sessionExpired: "Din session har gått ut. Logga in igen för att se det här.",
  noData: "Avanza har ingen data för det här värdepappret.",
  rateLimited: "Avanza begränsar antalet anrop. Försök igen om en stund.",
  serverError: "Avanza har problem just nu.",
  answered: (status, statusText) => `Avanza svarade ${status} ${statusText}.`.trim(),
  unreachable: "Kan inte nå Avanza. Kontrollera din anslutning.",
  unknown: "Något gick fel när det här skulle hämtas.",
  liveStopped: (stream) => `Liveuppdatering av ${streams[stream] ?? stream} har stoppat`,
};
