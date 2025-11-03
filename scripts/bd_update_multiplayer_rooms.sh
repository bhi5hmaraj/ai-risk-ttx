#!/usr/bin/env bash
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE/.."

echo "[bd-rooms] Working directory: $(pwd)"

if ! command -v bd >/dev/null 2>&1; then
  echo "Error: 'bd' CLI not found. Install from https://github.com/steveyegge/beads" >&2
  exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: 'jq' is required. Please install jq." >&2
  exit 1
fi

id_by_title_last() {
  local title="$1"
  bd list --json | jq -r --arg t "$title" '.[] | select(.title==$t) | .id' | tail -n1
}

ensure_issue() {
  local title="$1"; shift
  local type="$1"; shift
  local desc="$1"; shift
  local exist
  exist=$(id_by_title_last "$title" || true)
  if [[ -n "$exist" ]]; then
    echo "$exist"
    return 0
  fi
  bd create "$title" -t "$type" -d "$desc" >/dev/null
  id_by_title_last "$title"
}

link_dep() {
  local issue="$1"; shift
  local epic="$1"; shift
  # Prefer parent-child when available; fall back to blocks
  bd dep add "$issue" "$epic" -t parent-child || bd dep add "$issue" "$epic" -t blocks
}

EPIC_TITLE="Server‑Authoritative State & Next.js API Routes (Phase 1)"
EPIC_ID=$(id_by_title_last "$EPIC_TITLE")
if [[ -z "$EPIC_ID" ]]; then
  echo "Error: Epic '$EPIC_TITLE' not found. Run bd_create_backend_state_and_sim.sh first." >&2
  exit 1
fi
echo "[bd-rooms] Target Epic: $EPIC_ID ($EPIC_TITLE)"

create_and_link() {
  local t="$1"; shift
  local typ="$1"; shift
  local d="$1"; shift
  local id
  id=$(ensure_issue "$t" "$typ" "$d")
  link_dep "$id" "$EPIC_ID"
  echo "[bd-rooms] Added $id -> $EPIC_ID"
}

# Tasks breakdown for Rooms/Multiplayer integration
create_and_link "Prisma models: Room, RoomMember, Seat (+ migration)" feature \
"Add Room/Seat/Member models with indices and unique constraints; generate migration; acceptance: prisma validate passes and models documented."

create_and_link "RoomStore: Memory + Prisma (create/join/claim/release/start/presence)" feature \
"Implement Room store interfaces and two backends, including heartbeat-based presence and room revision for ETag."

create_and_link "Routes: POST /api/rooms and GET /api/rooms/:roomId (ETag)" feature \
"Create room and fetch room detail with seats/members/currentSessionId; return ETag for polling."

create_and_link "Routes: join, claim seat, release seat (tokens, 403/409)" feature \
"Implement join with playerToken cookie; enforce seat uniqueness and lock checks; return proper errors."

create_and_link "Routes: toggle AI seat + lock/unlock (host only)" feature \
"Host can set seat isAI/aiConfig and lock/unlock roles; validate with hostToken."

create_and_link "Route: start room → create GameSession from seats" feature \
"Snapshot seats into players and create GameSession; return sessionId and initial state."

create_and_link "Session: deadlineAt, auto-submit barrier, human+AI advance" feature \
"Add per-round deadlineAt; auto-submit [] on timeout; include AI seat actions in advance barrier."

create_and_link "Server LLM: run AI seats via generateAITurn on ACTION entry" feature \
"On entering ACTION, compute AI seat options/choices server-side and store as submitted actions."

create_and_link "Client: services/roomClient.ts + Lobby UI (MULTIPLAYER)" feature \
"Add client room API and a minimal lobby: join via code, claim/release seats, AI toggles, start when ready."

create_and_link "Client: invite code route /r/:code and rejoin via playerToken" feature \
"Deep link to room by code; remember member via HttpOnly cookie token; handle rejoin flows."

create_and_link "Tests: room store + routes (200/400/403/404/409)" task \
"Unit tests for RoomStore and handler tests for all room routes including error paths."

create_and_link "Tests: jsdom lobby flows (claim/release/start/rejoin)" task \
"Render lobby, simulate seat interactions and start; verify session handoff; cover rejoin with saved token."

create_and_link "Observability: ETag/x-revision/x-req-id + (optional) SSE stream stub" chore \
"Return tracing headers on room routes; add stream stub behind flag with basic events."

create_and_link "Docs: update session-backend.md and README (Rooms)" chore \
"Incorporate room routes, data model, lifecycle, flags; link from README."

create_and_link "Rollout: enable MULTIPLAYER in preview and soak" chore \
"Add env flag MULTIPLAYER=1 in preview; monitor logs/feedback and gate on metrics."

echo "[bd-rooms] Snapshot:"
bd ready || true
bd stats || true
