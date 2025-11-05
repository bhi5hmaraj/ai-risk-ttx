#!/usr/bin/env bash
set -euo pipefail

if ! command -v bd >/dev/null 2>&1; then
  echo "Error: 'bd' CLI not found. Install from https://github.com/steveyegge/beads" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: 'jq' is required by this script. Please install jq." >&2
  exit 1
fi

title_epic="App Router: Session Routing (/game/:sessionId)"
desc_epic="Introduce parametric deep links for game sessions (SSR bootstrap + SSE), enable refresh/reconnect via URL, and simplify orchestrator. Deliver /game/:id with server-authoritative state."

# Helper: get issue id by exact title (last one wins)
get_id_by_title() {
  local title="$1"
  bd list --json | jq -r --arg t "$title" '.[] | select(.title==$t) | .id' | tail -n1
}

# Helper: ensure issue exists, echo id
ensure_issue() {
  local title="$1"; shift
  local type="$1"; shift
  local desc="$1"; shift
  local id
  id=$(get_id_by_title "$title")
  if [[ -z "$id" ]]; then
    bd create "$title" -t "$type" -d "$desc" >/dev/null
    id=$(get_id_by_title "$title")
    echo "Created $type: $title ($id)"
  else
    echo "Found $type: $title ($id)"
  fi
  echo "$id"
}

epic_id=$(ensure_issue "$title_epic" epic "$desc_epic")

# Related/parent epic we may already have
nx_mig_id=$(get_id_by_title "Migrate from Vite to Next.js for Docker deployment")
if [[ -n "$nx_mig_id" ]]; then
  # Make routing epic blocked by Next.js migration epic
  bd dep add "$epic_id" "$nx_mig_id" -t blocks || true
  bd update "$nx_mig_id" --status in_progress || true
fi

# Optional: Phase 1 epic for server-authoritative state
p1_epic_id=$(get_id_by_title "Server‑Authoritative State & Next.js API Routes (Phase 1)")
if [[ -n "$p1_epic_id" ]]; then
  bd dep add "$epic_id" "$p1_epic_id" -t blocks || true
  bd update "$p1_epic_id" --status in_progress || true
fi

# Child tasks under the routing epic
declare -A TASKS
TASKS[
"SSR bootstrap for /game/:id"
]="Server component fetch for session snapshot (ETag) and hydration of stores on first paint."
TASKS[
"SessionMonitor: param-based SSE connect"
]="Read sessionId from URL params; open /api/session/:id/stream; keep sessionMeta.revision in sync."
TASKS[
"/game redirector and orchestrator cleanup"
]="Make /game a thin redirector to /game/:id or /lobby; slim RouteOrchestrator to END-state routing."
TASKS[
"Host token persistence (non-URL)"
]="Keep hostToken in memory/sessionStorage; never put in URL; send via x-host-token only."
TASKS[
"NotFound/Expired session UX"
]="Handle 404/410 for /game/:id with a user-friendly screen and link back to /lobby."
TASKS[
"Deep link + reconnect tests"
]="Add tests: open /game/:id, refresh reconnects SSE, notFound path."
TASKS[
"Docs: session routing architecture"
]="Document URL design, SSR bootstrap, SSE, and pros/cons in the docs site (Nextra)."
TASKS[
"Phase 2: remove client chat-mode paths"
]="Delete client LLM paths; ensure useGameActions only uses SessionService; keep guard tests."
TASKS[
"Replace legacy controller tests (modular)"
]="Add modular tests for useGameActions/SessionMonitor/Orchestrator; remove skipped legacy suites."

for t in "${!TASKS[@]}"; do
  tid=$(ensure_issue "$t" task "${TASKS[$t]}")
  bd dep add "$tid" "$epic_id" -t parent-child || true
done

echo "\nAll set. Current epic and tasks:"
bd show "$epic_id" || true
echo "\nReady issues:"
bd ready || true
echo "\nStats:"
bd stats || true

