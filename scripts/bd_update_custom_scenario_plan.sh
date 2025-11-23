#!/usr/bin/env bash
set -euo pipefail

# Temp helper to update Beads epic+tasks for Custom Scenario + CopilotKit plan
# - Updates epic description
# - Ensures/updates tasks, statuses, and dependencies
# - Aligns finalize chain (3 endpoints)
# - Self-deletes on success

require() { command -v "$1" >/dev/null 2>&1 || { echo "Error: missing dependency: $1" >&2; exit 1; }; }
require bd
require jq

say() { echo "[bd-update] $*" >&2; }

get_id_by_title() {
  local title="$1"
  bd list --json | jq -r --arg t "$title" '.[] | select(.title==$t) | .id' | tail -n1
}

ensure_issue() {
  local title="$1"; shift
  local type="$1"; shift
  local desc="$1"; shift
  local id
  id=$(get_id_by_title "$title")
  if [[ -z "$id" ]]; then
    say "create $type: $title"
    bd create "$title" -t "$type" -d "$desc" >/dev/null
    id=$(get_id_by_title "$title")
  else
    bd update "$id" --description "$desc" >/dev/null || true
    say "update $type: $title ($id)"
  fi
  # Ensure only the bare ID is echoed on stdout for callers capturing it
  printf "%s\n" "$id"
}

ensure_child_of() {
  local child_id="$1"; shift
  local parent_id="$1"; shift
  bd dep add "$child_id" "$parent_id" -t parent-child >/dev/null || true
}

ensure_blocks() {
  local child_id="$1"; shift
  local parent_id="$1"; shift
  bd dep add "$child_id" "$parent_id" -t blocks >/dev/null || true
}

set_status() {
  local id="$1"; shift
  local st="$1"; shift
  [[ -n "$id" ]] && bd update "$id" --status "$st" >/dev/null || true
}

EPIC_TITLE="Custom Scenario Refinement & Library (Phase 1)"
EPIC_DESC="CopilotKit-based Custom Scenario Builder: Phase 1 form-filling UI that mirrors GameSetup; Phase 2 chat-assisted refinement (≤5 turns) via /api/custom-scenario; Phase 3 finalize & persist using 3 endpoints: generate/custom-scenario → generate/scenario → POST /api/scenarios. Contracts via TS+Zod; private by default; rate limiting TODO."
EPIC_ID=$(ensure_issue "$EPIC_TITLE" epic "$EPIC_DESC")

# Phase 1
FORM_ID=$(ensure_issue "UI: CopilotKit form builder for GameSetup" task "Implement /custom-scenario page with fields matching GameSetup and Copilot actions to bulk-fill form values. Phase 1 does not persist; Phase 3 finalizes via existing generators and POST /api/scenarios.")
ensure_child_of "$FORM_ID" "$EPIC_ID"
set_status "$FORM_ID" in_progress

COPILOT_WIRE_ID=$(ensure_issue "Install & wire CopilotKit provider" task "Add copilotkit packages, configure provider to route model calls via server (LiteLLM), remove temporary type stubs.")
ensure_child_of "$COPILOT_WIRE_ID" "$EPIC_ID"

CONTRACTS_ID=$(ensure_issue "Contracts: Zod schemas for GameSetup & finalize" task "Add shared Zod schemas in contracts/ for GameSetup and FinalizeRefinement payloads; use on server to validate.")
ensure_child_of "$CONTRACTS_ID" "$EPIC_ID"

# Phase 2
API_ID=$(get_id_by_title "API: custom-scenario start/turn/get/finalize")
if [[ -n "$API_ID" ]]; then
  bd update "$API_ID" --description "Phase 2: Implement start/turn/get/finalize endpoints with Redis drafts (≤5 turns). Copilot chat backs these actions; server validates with Zod; private scope by author." >/dev/null || true
  ensure_child_of "$API_ID" "$EPIC_ID"
  ensure_blocks "$API_ID" "$FORM_ID"
  ensure_blocks "$API_ID" "$CONTRACTS_ID"
fi

CHAT_ID=$(get_id_by_title "UI: refinement chat (Accept/Use Scenario)")
if [[ -n "$CHAT_ID" ]]; then
  bd update "$CHAT_ID" --description "Phase 2: Copilot chat sidebar asks one question at a time (≤5 turns) and calls start/turn/get; Accept triggers finalize chain." >/dev/null || true
  ensure_child_of "$CHAT_ID" "$EPIC_ID"
  [[ -n "$API_ID" ]] && ensure_blocks "$CHAT_ID" "$API_ID"
fi

# Phase 3
FINAL_ID=$(get_id_by_title "Finalize: call /api/llm/generate/custom-scenario + DB persist")
if [[ -n "$FINAL_ID" ]]; then
  bd update "$FINAL_ID" --description "Compile scenarioDescription → POST /api/llm/generate/custom-scenario (GameSetup with coreMetric.value) → POST /api/llm/generate/scenario (initialEvent from nextEvent) → POST /api/scenarios { customPrompt, gameSetup, initialEvent }." >/dev/null || true
  ensure_child_of "$FINAL_ID" "$EPIC_ID"
  [[ -n "$CHAT_ID" ]] && ensure_blocks "$FINAL_ID" "$CHAT_ID"
fi

LIB_ID=$(get_id_by_title "Library API: GET /api/scenarios/library?author=me|all")
[[ -n "$LIB_ID" ]] && ensure_child_of "$LIB_ID" "$EPIC_ID" && [[ -n "$FINAL_ID" ]] && ensure_blocks "$LIB_ID" "$FINAL_ID"

# Cross-cutting
VALUE_ID=$(get_id_by_title "Prompts: standardize coreMetric.value (replace initialValue)")
[[ -n "$VALUE_ID" ]] && ensure_child_of "$VALUE_ID" "$EPIC_ID" && set_status "$VALUE_ID" in_progress

RL_ID=$(get_id_by_title "Rate limiting (TODO)")
[[ -n "$RL_ID" ]] && ensure_child_of "$RL_ID" "$EPIC_ID" && set_status "$RL_ID" open

DOCS_ID=$(get_id_by_title "Docs: API reference + examples")
[[ -n "$DOCS_ID" ]] && bd update "$DOCS_ID" --description "Document custom-scenario finalize chain (3 endpoints), CopilotKit phases, and role prompts; update examples for GameSetup with coreMetric.value." >/dev/null || true

say "All updates applied under epic: $EPIC_ID ($EPIC_TITLE)"

# Self-delete
SCRIPT_PATH="$0"
if [[ -f "$SCRIPT_PATH" ]]; then
  say "Self-deleting $SCRIPT_PATH"
  rm -f -- "$SCRIPT_PATH" || true
fi
