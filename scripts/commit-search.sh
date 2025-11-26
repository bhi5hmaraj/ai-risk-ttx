#!/usr/bin/env bash
set -euo pipefail

IN_FILE="docs/commit-messages-all-branches.txt"
OUT_FILE="docs/commit-search-express-colyseus.txt"

if [ ! -f "$IN_FILE" ]; then
  echo "[commit-search] Missing $IN_FILE. Run: pnpm run commit:scan" >&2
  exit 1
}

# Default patterns if none provided
if [ "$#" -eq 0 ]; then
  patterns=(
    'colyseus'
    'coleseyus'
    'websocket'
    'ws-transport'
    'matchmaker'
    'room code'
    'healthz'
    'cloud run'
    '\bexpress\b'
  )
else
  patterns=("$@")
fi

printf "# Search results for patterns: %s\n" "${patterns[*]}" > "$OUT_FILE"
echo "# Generated: $(date -Is)" >> "$OUT_FILE"
echo >> "$OUT_FILE"

joined=$(printf '%s|' "${patterns[@]}")
joined=${joined%|}

grep -Ein "$joined" "$IN_FILE" >> "$OUT_FILE" || true

echo "[commit-search] Wrote $(wc -l < "$OUT_FILE") lines to $OUT_FILE"

