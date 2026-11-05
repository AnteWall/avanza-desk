import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { m } from "@/lib/i18n";
import { getPrivacy, setPrivacy } from "@/lib/privacy";

/** Top-bar button that blurs your amounts and quantities. */
export function PrivacyToggle() {
  const [on, setOn] = useState(getPrivacy);
  const label = on ? m.layout.privacy.show : m.layout.privacy.hide;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      aria-pressed={on}
      title={label}
      onClick={() => {
        void setPrivacy(!on);
        setOn(!on);
      }}
    >
      {on ? <EyeOff /> : <Eye />}
    </Button>
  );
}
