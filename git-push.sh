#!/usr/bin/env bash
set -euo pipefail

# git-push.sh — Prepare repo for commit/push with a correct lockfile and a passing build.
# - Verifies Node version
# - Regenerates package-lock.json deterministically
# - Validates install via npm ci
# - Builds with safe defaults for Vite env vars
# - Stages package-lock.json if updated
# - Optionally commits and pushes when -c "msg" is provided

usage() {
  cat << EOF
Usage: $0 [-c "commit message"]

Steps performed:
  1) Check Node >= 20
  2) Regenerate package-lock.json (npm install --package-lock-only)
  3) Validate install (npm ci)
  4) Production build with safe env defaults
  5) Stage package-lock.json if changed

Options:
  -c  Commit message; if provided, the script will 'git add -A && git commit && git push'
  -h  Show this help
EOF
}

commit_msg=""
while getopts ":c:h" opt; do
  case $opt in
    c) commit_msg="$OPTARG" ;;
    h) usage; exit 0 ;;
    :) echo "Option -$OPTARG requires an argument" >&2; exit 1 ;;
    \?) echo "Unknown option -$OPTARG" >&2; usage; exit 1 ;;
  esac
done

# Ensure we're in a git repo root containing package.json
if [[ ! -f package.json ]]; then
  echo "Error: package.json not found. Run from the project root." >&2
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: Not inside a git repository." >&2
  exit 1
fi

# Check Node version
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js not found. Install Node >= 20." >&2
  exit 1
fi

node_ver=$(node -v | sed 's/^v//')
req_ver=20
major=${node_ver%%.*}
if (( major < req_ver )); then
  echo "Error: Node $node_ver detected. Please use Node >= 20." >&2
  exit 1
fi
echo "Node version OK: v$node_ver"

# Ensure package-lock.json is not ignored
if git check-ignore -q package-lock.json; then
  echo "Warning: package-lock.json is ignored by .gitignore. Remove that rule to commit the lockfile." >&2
fi

echo "\nStep 1/4: Regenerating package-lock.json (no install)"
npm install --package-lock-only

echo "\nStep 2/4: Validating a clean, reproducible install (npm ci)"
npm ci

echo "\nStep 3/4: Building for production with safe env defaults"
# Ensure build doesn’t fail due to missing runtime env vars
export VITE_LITELLM_API_KEY="${VITE_LITELLM_API_KEY:-sk-dummy-for-build}"
export VITE_LLM_MODEL="${VITE_LLM_MODEL:-gemini-2.5-flash}"
npm run build

echo "\nStep 4/4: Staging updated lockfile (if any)"
if ! git diff --quiet -- package-lock.json 2>/dev/null; then
  git add package-lock.json
  echo "Staged package-lock.json"
else
  echo "No changes in package-lock.json"
fi

echo "\nSummary:"
echo "- Node: v$node_ver"
echo "- Lockfile present and validated (npm ci)"
echo "- Build succeeded (dist/)"
echo "- Git status:"
git status -s

if [[ -n "$commit_msg" ]]; then
  echo "\nCommitting and pushing..."
  git add -A
  git commit -m "$commit_msg"
  git push
  echo "Done."
else
  cat << MSG

Next steps:
  - Review changes: git status
  - Commit:         git add -A && git commit -m "<your message>"
  - Push:           git push

Tip (Vercel):
  - Set Node.js version to 20.x in Project Settings
  - Use 'npm ci' as Install Command, 'npm run build' as Build Command
  - Clear build cache on the next deploy if dependencies changed
  - Ensure env vars: VITE_LITELLM_API_KEY, VITE_LLM_MODEL
MSG
fi

