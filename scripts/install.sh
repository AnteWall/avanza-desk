#!/bin/sh
# Installs the latest AvanzaDesk release on macOS or Linux:
#   curl -fsSL https://antewall.github.io/avanza-desk/install.sh | sh
# The app updates itself after that.
set -eu

repo=AnteWall/avanza-desk
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# Download URL of the latest release's asset whose name ends with $1 (a grep regex).
asset_url() {
  url=$(curl -fsSL "https://api.github.com/repos/$repo/releases/latest" |
    grep -o "https://[^\"]*$1\"" | head -n 1 | tr -d '"')
  [ -n "$url" ] || { echo "No release asset matching $1" >&2; exit 1; }
  echo "$url"
}

fetch() {
  echo "Downloading $(basename "$1")"
  curl -fL --progress-bar -o "$2" "$1"
}

case "$(uname -s)" in
Darwin)
  [ "$(uname -m)" = arm64 ] && arch=aarch64 || arch=x64
  fetch "$(asset_url "_$arch\.app\.tar\.gz")" "$tmp/app.tar.gz"
  tar -xzf "$tmp/app.tar.gz" -C "$tmp"
  rm -rf /Applications/avanza-desk.app
  mv "$tmp/avanza-desk.app" /Applications/
  echo "Installed to /Applications/avanza-desk.app"
  ;;
Linux)
  [ "$(uname -m)" = x86_64 ] || { echo "Only x86_64 Linux builds are published" >&2; exit 1; }
  if command -v apt-get >/dev/null; then
    fetch "$(asset_url "_amd64\.deb")" "$tmp/avanza-desk.deb"
    sudo apt-get install -y "$tmp/avanza-desk.deb"
  elif command -v dnf >/dev/null; then
    fetch "$(asset_url "\.x86_64\.rpm")" "$tmp/avanza-desk.rpm"
    sudo dnf install -y "$tmp/avanza-desk.rpm"
  else
    # shortcut: no menu entry for the AppImage; add a .desktop file if people ask for one.
    mkdir -p "$HOME/.local/bin"
    fetch "$(asset_url "_amd64\.AppImage")" "$HOME/.local/bin/avanza-desk"
    chmod +x "$HOME/.local/bin/avanza-desk"
    echo "Installed to ~/.local/bin/avanza-desk (needs FUSE 2, e.g. the fuse2 package)"
  fi
  ;;
*)
  echo "Unsupported OS; on Windows use install.ps1" >&2
  exit 1
  ;;
esac
