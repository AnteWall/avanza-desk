import script from "../../../scripts/install.sh?raw";

// Served at /avanza-desk/install.sh for the short one-liner; scripts/install.sh stays the source.
export const GET = () => new Response(script);
