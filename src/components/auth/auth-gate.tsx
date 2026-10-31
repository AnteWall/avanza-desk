import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SignInOverlay } from "@/components/auth/sign-in-overlay";
import { meQuery } from "@/lib/avanza/client";

/** Opens the sign-in overlay whenever there is no valid Avanza session. */
export function AuthGate() {
  const { data: me } = useQuery(meQuery);
  // Tells "first sign-in" from "session expired" for the overlay copy.
  const [wasSignedIn, setWasSignedIn] = useState(false);
  if (me && !wasSignedIn) setWasSignedIn(true);

  return <SignInOverlay open={me === null} expired={wasSignedIn} />;
}
