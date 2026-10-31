import { AvanzaHttpError } from "avanza-ts";

import { isUnauthorized } from "./client";

/** A short, human explanation of why an Avanza request failed. */
export function errorMessage(error: unknown) {
  if (isUnauthorized(error)) return "Your session expired. Sign in again to see this.";
  if (error instanceof AvanzaHttpError) {
    if (error.status === 404) return "Avanza has no data for this instrument.";
    if (error.status === 429) return "Avanza is rate limiting requests. Try again shortly.";
    if (error.status >= 500) return "Avanza is having problems right now.";
    return `Avanza answered ${error.status} ${error.statusText}.`.trim();
  }
  // tauriFetch rejects with a string when the request never reached Avanza.
  if (typeof error === "string" || error instanceof TypeError)
    return "Can't reach Avanza. Check your connection.";
  return "Something went wrong while loading this.";
}
