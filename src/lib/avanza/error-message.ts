import { AvanzaHttpError } from "avanza-ts";

import { m } from "@/lib/i18n";

import { isUnauthorized } from "./client";

/** A short, human explanation of why an Avanza request failed. */
export function errorMessage(error: unknown) {
  if (isUnauthorized(error)) return m.errors.sessionExpired;
  if (error instanceof AvanzaHttpError) {
    if (error.status === 404) return m.errors.noData;
    if (error.status === 429) return m.errors.rateLimited;
    if (error.status >= 500) return m.errors.serverError;
    return m.errors.answered(error.status, error.statusText);
  }
  // tauriFetch rejects with a string when the request never reached Avanza.
  if (typeof error === "string" || error instanceof TypeError) return m.errors.unreachable;
  return m.errors.unknown;
}
