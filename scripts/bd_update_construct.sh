#!/usr/bin/env bash
set -euo pipefail

# Run from repo root or scripts/, normalize to repo root
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/.."

echo "[bd-update] Working directory: $(pwd)"

if ! command -v bd >/dev/null 2>&1; then
  echo "Error: 'bd' CLI not found in PATH. Install from https://github.com/steveyegge/beads or ensure it's available." >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: 'jq' is required for ID lookups. Please install jq (https://stedolan.github.io/jq/)." >&2
  exit 1
fi

id_by_title() {
  local title="$1"
  bd list --json | jq -r --arg t "$title" '.[] | select(.title==$t) | .id' | head -n1
}

echo "[bd-update] Updating existing Next.js migration tasks (no closures)…"
bd update ai-risk-ttx-15 --title "Migrate to Next.js App Router (multi-page)" || true
bd update ai-risk-ttx-44 --title "Next.js App Router: pages and route groups" || true
bd update ai-risk-ttx-45 --title "App Router: layout.tsx, metadata, and route config" || true
bd update ai-risk-ttx-46 --title "Move screen components to App Router pages" || true
bd update ai-risk-ttx-47 --title "Route layout with Navigation (Next Link)" || true
bd update ai-risk-ttx-48 --title "Home/Lobby routes (server/client split)" || true
bd update ai-risk-ttx-49 --title "Game route with route guard/session access" || true
bd update ai-risk-ttx-50 --title "End route (debrief, tabs)" || true
bd update ai-risk-ttx-51 --title "Navigation: Next Link + active state + menu" || true
bd update ai-risk-ttx-52 --title "State across routes: session store or URL strategy" || true
bd update ai-risk-ttx-53 --title "App Router: error.tsx / not-found.tsx" || true
bd update ai-risk-ttx-54 --title "E2E test: App Router flow (lobby→game→end)" || true

echo "[bd-update] Creating small ADA epic and initial tasks…"
bd create \
  --title "The Construct (Advanced Mode) — Phase 0 (Scaffold)" \
  --issue_type epic \
  --description "Add numeric impact hints and numeric debrief using a fixed Analytic Domain (ADA). Keep LLM only as compiler; no LLM rollouts."

ADA_EPIC_ID=$(id_by_title "The Construct (Advanced Mode) — Phase 0 (Scaffold)")
echo "[bd-update] Epic ID: ${ADA_EPIC_ID}"

bd create \
  --title "ADA core + /api/ada/evaluate (mock weights)" \
  --issue_type feature \
  --description "Define ~10 ADA factors; implement step() dynamics and trust weights; add /api/ada/evaluate to score 5 options with horizon=1–2."

ADA_CORE_ID=$(id_by_title "ADA core + /api/ada/evaluate (mock weights)")
bd dep add --issue "$ADA_CORE_ID" --depends-on "$ADA_EPIC_ID"

bd create \
  --title "Mobile UI: Δ pill on action cards + Operator sheet (stub)" \
  --issue_type feature \
  --description "Show expected Δ trust pill and confidence on each option; add 'Why' (Operator) sheet stub to display driver factors."

DELTA_PILL_ID=$(id_by_title "Mobile UI: Δ pill on action cards + Operator sheet (stub)")
bd dep add --issue "$DELTA_PILL_ID" --depends-on "$ADA_EPIC_ID"

echo "[bd-update] Adding two migration tasks still needed for Next.js…"
bd create \
  --title "Move remaining API endpoints to app/api route handlers" \
  --issue_type feature \
  --description "Migrate legacy /api Node handlers to Next.js App Router route handlers; remove legacy files after parity."

bd create \
  --title "Remove legacy SPA entrypoints and dead code" \
  --issue_type chore \
  --description "Delete old SPA index/App.tsx and legacy /api files once routes are live; verify no imports remain."

echo "[bd-update] Done. Snapshot:"
bd ready || true
bd stats || true

