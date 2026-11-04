// The site serves scripts/install.sh itself (src/pages/install.sh.ts), so the one-liner stays short.
export const INSTALL_UNIX = "curl -fsSL https://antewall.github.io/avanza-desk/install.sh | sh";
export const INSTALL_WINDOWS =
  "irm https://raw.githubusercontent.com/AnteWall/avanza-desk/main/scripts/install.ps1 | iex";
