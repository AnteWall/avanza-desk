import script from "../../../scripts/install.ps1?raw";

// shortcut: not used by the Windows one-liner yet; switch once Pages serves .ps1 as text (check with curl -I).
export const GET = () => new Response(script);
