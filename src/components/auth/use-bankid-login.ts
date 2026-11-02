import { useQueryClient } from "@tanstack/react-query";
import type { BankIdAuthAttempt, BankIdChallenge } from "avanza-ts";
import { useCallback, useEffect, useRef, useState } from "react";

import { avanza, meQuery, saveSession, type User } from "@/lib/avanza/client";
import { markSignedIn } from "@/lib/briefing";

export type BankIdLoginState =
  | { step: "start" }
  | { step: "qr"; challenge: BankIdChallenge; startedAt: number }
  | { step: "success"; user: User }
  | { step: "failed"; reason: "denied" | "expired" | "error" };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs one BankID QR login at a time. `cancel` abandons it and returns to the start step. */
export function useBankIdLogin() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<BankIdLoginState>({ step: "start" });
  // The current run; cancel or a newer start replaces it and the old run stops quietly.
  const runRef = useRef<{ attempt?: BankIdAuthAttempt } | null>(null);

  const abandon = useCallback(() => {
    void runRef.current?.attempt?.cancel().catch(() => {});
    runRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    abandon();
    setState({ step: "start" });
  }, [abandon]);

  const start = useCallback(async () => {
    abandon();
    const run: { attempt?: BankIdAuthAttempt } = {};
    runRef.current = run;
    const stale = () => runRef.current !== run;
    try {
      const attempt = await avanza.auth.startBankId();
      run.attempt = attempt;
      if (stale()) return void attempt.cancel().catch(() => {});
      setState({ step: "qr", challenge: attempt.challenge, startedAt: Date.now() });
      for (;;) {
        await sleep(attempt.challenge.refreshAfterMs);
        if (stale()) return;
        const result = await attempt.poll();
        if (stale()) return;
        if (result.status === "pending") {
          setState((s) => (s.step === "qr" ? { ...s, challenge: result.challenge } : s));
          continue;
        }
        runRef.current = null;
        if (result.status !== "complete")
          return setState({ step: "failed", reason: result.status });
        await saveSession();
        const { user } = await avanza.auth.getSessionInfo();
        return setState({ step: "success", user });
      }
    } catch {
      if (stale()) return;
      runRef.current = null;
      setState({ step: "failed", reason: "error" });
    }
  }, [abandon]);

  /**
   * Called once the success animation is done: closes the overlay. Failed queries (e.g. 401s
   * that landed after sign-out) are dropped first, so panels mount fresh and refetch instead
   * of rethrowing the cached error.
   */
  const finish = useCallback(
    (user: User) => {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== "auth" && query.state.status === "error",
      });
      markSignedIn();
      queryClient.setQueryData(meQuery.queryKey, user);
    },
    [queryClient],
  );

  useEffect(() => abandon, [abandon]);

  return { state, start, cancel, finish };
}
