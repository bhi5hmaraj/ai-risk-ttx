#!/usr/bin/env bash
set -euo pipefail

# Output file
OUT_FILE="docs/commit-messages-all-branches.txt"

# Ensure we are in a git repo
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "[commit-scan] Not a git repository." >&2
  exit 1
}

echo "# Commit messages per branch (local branches)" > "$OUT_FILE"
echo "# Generated: $(date -Is)" >> "$OUT_FILE"
echo >> "$OUT_FILE"

branches=$(git for-each-ref --format='%(refname:short)' refs/heads)
if [ -z "$branches" ]; then
  echo "[commit-scan] No local branches found." >&2
  exit 0
fi

for b in $branches; do
  echo "=== BRANCH: $b ===" >> "$OUT_FILE"
  git log --no-merges --date=iso --pretty='format:%h | %ad | %an | %s' "$b" >> "$OUT_FILE" || true
  echo >> "$OUT_FILE"
done

echo "[commit-scan] Wrote $(wc -l < "$OUT_FILE") lines to $OUT_FILE"

