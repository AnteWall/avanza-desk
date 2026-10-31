#!/usr/bin/env bash
# Run `tauri dev` for N seconds, then kill everything it spawned.
# Uses a dedicated session: tauri puts the app binary in its own process group,
# so killing a process group misses it; killing by session id does not.
# Picks its own vite port so it can run next to the user's dev session; shares the normal
# debug build in src-tauri/target (cargo's lock serializes concurrent builds).
set -u
secs=${1:-15}
log=${2:-$(mktemp)}

port=1430
while ss -ltn | grep -q ":$port "; do port=$((port + 1)); done
config="{\"build\":{\"devUrl\":\"http://localhost:$port\",\"beforeDevCommand\":\"pnpm dev --port $port\"}}"

sidfile=$(mktemp)
CARGO_TERM_COLOR=never NO_COLOR=1 setsid bash -c \
  'echo $$ >"$0"; exec nix develop -c pnpm tauri dev --config "$1"' "$sidfile" "$config" >"$log" 2>&1 &
sleep 1
sid=$(cat "$sidfile")
rm -f "$sidfile"

# Wait for the app to start. Warm builds take seconds; a cold build needs START_TIMEOUT raised.
started=0
for _ in $(seq "${START_TIMEOUT:-60}"); do grep -q 'target/debug/avanza-desk`' "$log" && started=1 && break; sleep 1; done
[ "$started" = 1 ] && sleep "$secs" || echo "app did not start within ${START_TIMEOUT:-60}s" >&2

pkill -TERM -s "$sid"; sleep 2; pkill -KILL -s "$sid"
if pgrep -s "$sid" >/dev/null; then echo "leftover processes in session $sid" >&2; exit 1; fi
grep -E '^error|error\[|panicked' "$log"
echo "port: $port, log: $log"
