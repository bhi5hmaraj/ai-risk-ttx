#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/.."

echo "[bd-setup] Working directory: $(pwd)"

if ! command -v bd >/dev/null 2>&1; then
  echo "Error: 'bd' CLI not found. Install from https://github.com/steveyegge/beads" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: 'jq' is required. Please install jq." >&2
  exit 1
fi

id_by_title() {
  local title="$1"
  bd list --json | jq -r --arg t "$title" '.[] | select(.title==$t) | .id' | head -n1
}

create_and_link_to_epic() {
  local epic_id="$1"; shift
  local title="$1"; shift
  local desc="$1"; shift
  local type="${1:-feature}"
  bd create "$title" -t "$type" -d "$desc"
  local cid
  cid=$(id_by_title "$title")
  if [[ -n "$cid" ]]; then
    bd dep add "$cid" "$epic_id" -t blocks
    echo "[bd-setup] Created $cid and linked to epic $epic_id"
  else
    echo "[bd-setup] Warning: could not resolve ID for '$title'" >&2
  fi
}

echo "[bd-setup] Creating Epic: Server‑Authoritative State & Next.js API Routes (Phase 1)"
bd create "Server‑Authoritative State & Next.js API Routes (Phase 1)" -t epic -d "Make the server the source of truth: SessionStore (memory+Prisma), Next.js /api/session routes, revision control (If‑Match), client hook refactor behind BACKEND_STATE flag, tests, docs, and cleanup."

BACKEND_EPIC_ID=$(id_by_title "Server‑Authoritative State & Next.js API Routes (Phase 1)")
echo "[bd-setup] Backend Epic ID: ${BACKEND_EPIC_ID}"

create_and_link_to_epic "$BACKEND_EPIC_ID" \
  "Define SessionStore interface + MemorySessionStore" \
  "Introduce SessionStore with create/get/update/submitActions/advance/setDebrief; include revision bump and TTL; implement in-memory version for dev/tests."

create_and_link_to_epic "$BACKEND_EPIC_ID" \
  "Prisma schema + PrismaSessionStore" \
  "Add GameSession (JSON state + revision), Player, Action tables; write migrations; implement PrismaSessionStore; acceptance: create/get/update with revision checks."

create_and_link_to_epic "$BACKEND_EPIC_ID" \
  "Routes: POST/GET/PATCH /api/session (Zod + 400/409/503)" \
  "Implement basic session lifecycle with strict Zod validation, 503 on missing env (reuse env guard), and 409 on stale If‑Match."

create_and_link_to_epic "$BACKEND_EPIC_ID" \
  "Routes: /join, /action-options, /actions, /advance, /debrief" \
  "Add subroutes with revision checks; integrate LLM facade (real/mock) server‑side; ensure responses include {state, revision}."

create_and_link_to_epic "$BACKEND_EPIC_ID" \
  "Revision control: If‑Match/If‑None‑Match" \
  "Return revision with every response; require If‑Match for mutations; support GET with If‑None‑Match → 304 unchanged."

create_and_link_to_epic "$BACKEND_EPIC_ID" \
  "Refactor useGameController → sessionClient (BACKEND_STATE)" \
  "Behind BACKEND_STATE=1, route all state changes via sessionClient; preserve current behavior; support rollback."

create_and_link_to_epic "$BACKEND_EPIC_ID" \
  "Tests: API (happy/400/409/503) + Hook (behavior)" \
  "Unit/integration tests for handlers (mock store/LLM) and hooks via jsdom; focus on behavior (phases/rounds/deltas)."

create_and_link_to_epic "$BACKEND_EPIC_ID" \
  "Docs: migration guide, env, Vercel runtime" \
  "README: server‑state migration notes, env variables, vercel dev requirements, how to flip BACKEND_STATE, coverage hooks." "task"

create_and_link_to_epic "$BACKEND_EPIC_ID" \
  "Cleanup: remove legacy SPA state paths" \
  "Delete SPA-only state code once parity is reached; verify dead imports; run coverage & lint." "chore"

create_and_link_to_epic "$BACKEND_EPIC_ID" \
  "Health/meta route for status checks" \
  "Add /api/meta/status exposing env readiness and store status for smoke tests." "chore"

echo "[bd-setup] Creating Epic: Simulation Engine Integration (SD/ABM) — Phase 0"
bd create "Simulation Engine Integration (SD/ABM) — Phase 0" -t epic -d "Introduce a pluggable simulation engine (SD/ABM) for consequence generation. Start with a deterministic stub and integrate behind a flag; align with citations/causes; document in docs/sd-abm-sim.md."

SIM_EPIC_ID=$(id_by_title "Simulation Engine Integration (SD/ABM) — Phase 0")
echo "[bd-setup] Simulation Epic ID: ${SIM_EPIC_ID}"

create_and_link_to_epic "$SIM_EPIC_ID" \
  "Define SimulationEngine interface + adapter" \
  "Design SimulationEngine (init, step, evaluate) with a clean adapter so the consequences pipeline can call either LLM or engine."

create_and_link_to_epic "$SIM_EPIC_ID" \
  "simulation-core package (deterministic stub)" \
  "Implement a deterministic engine (seeded RNG) supporting AI Safety/Election presets; JSON config for factors and transitions."

create_and_link_to_epic "$SIM_EPIC_ID" \
  "Integrate engine into /advance via flag" \
  "When SIM_ENGINE=1, /advance uses SimulationEngine to produce consequences, deltas, and citations; match existing response shape."

create_and_link_to_epic "$SIM_EPIC_ID" \
  "Stable event IDs + cause linking" \
  "Adopt deterministic IDs (evt_r{round}_k{idx}); ensure causes reference these; add 'view in log' deep-link support."

create_and_link_to_epic "$SIM_EPIC_ID" \
  "Performance baseline + profiling harness" \
  "Add profiling script with fixed seeds; record memory/time vs LLM path; set round cap defaults."

create_and_link_to_epic "$SIM_EPIC_ID" \
  "Tests: engine invariants + reproducibility" \
  "Unit tests for step transitions, invariants, and deterministic outputs; integration tests for API shape."

create_and_link_to_epic "$SIM_EPIC_ID" \
  "Docs: sd-abm-sim.md + toggles" \
  "Document architecture, flags (SIM_ENGINE), how to develop scenarios, and how citations map to engine transitions." "chore"

echo "[bd-setup] Snapshot:"
bd ready || true
bd stats || true
