#!/usr/bin/env bash
set -euo pipefail

# Adds a task breakdown to Beads (bd) for the "Compiled Prompt from Form" work
# Usage: bash scripts/bd_add_compiled_prompt_plan.sh
# Requires: bd (https://github.com/steveyegge/beads), jq

require() { command -v "$1" >/dev/null 2>&1 || { echo "Error: missing dependency: $1" >&2; exit 1; }; }
require bd
require jq

say() { echo "[bd-compiled] $*"; }

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
  echo "$id"
}

ensure_dep() {
  local child="$1"; shift
  local parent="$1"; shift
  local rel="${1:-parent-child}"
  bd dep add "$child" "$parent" -t "$rel" >/dev/null || true
}

# Epic anchor (reuse existing Custom Scenario epic if present)
EPIC_TITLE="Custom Scenario Refinement & Library (Phase 1)"
EPIC_DESC="Copilot-assisted custom scenario builder. This sub-epic tracks the compiled LLM prompt built from the form + comments, and its integration into the finalize chain."
EPIC_ID=$(get_id_by_title "$EPIC_TITLE")
if [[ -z "$EPIC_ID" ]]; then
  EPIC_ID=$(ensure_issue "$EPIC_TITLE" epic "$EPIC_DESC")
fi
say "Epic: $EPIC_ID ($EPIC_TITLE)"

# Core tasks for compiled prompt
PROMPT_ID=$(ensure_issue "Compiled Prompt: schema-to-prompt builder" task \
  "Build a deterministic compiler that turns the form (GameSetup + per-field comments) into an LLM-ready prompt. Include character notes per stakeholder; omit publicObjective; enforce 70–100 for coreMetric.value. Output is a plain string with clear sections.")
ensure_dep "$PROMPT_ID" "$EPIC_ID" parent-child

RHF_ID=$(ensure_issue "Refactor form with React Hook Form + useFieldArray" task \
  "Switch /custom-scenario to react-hook-form with useFieldArray for stakeholders and a comments map by path. Enables granular updates and easier compiled prompt generation.")
ensure_dep "$RHF_ID" "$PROMPT_ID" blocks
ensure_dep "$RHF_ID" "$EPIC_ID" parent-child

TYPES_ID=$(ensure_issue "Types/Prompts: remove publicObjective, add character" chore \
  "Propagate schema change across shared types (server/types/core.ts, types/core.ts) and prompts; migrate seed/presets/constants. Keep API compatibility notes.")
ensure_dep "$TYPES_ID" "$PROMPT_ID" blocks
ensure_dep "$TYPES_ID" "$EPIC_ID" parent-child

TESTS_ID=$(ensure_issue "Tests: compiled prompt snapshots (golden)" task \
  "Add unit tests to snapshot compiled prompts from mock forms (debug prefill). Cover stakeholder counts, missing comments, and value clamping.")
ensure_dep "$TESTS_ID" "$PROMPT_ID" blocks
ensure_dep "$TESTS_ID" "$EPIC_ID" parent-child

SEC_ID=$(ensure_issue "Security: prompt-injection guardrails for compiled prompt" task \
  "Harden the compiler against comment-based injections. Normalize whitespace, strip control tokens, and constrain sections to safe templates. Document refusal patterns.")
ensure_dep "$SEC_ID" "$PROMPT_ID" blocks
ensure_dep "$SEC_ID" "$EPIC_ID" parent-child

DOCS_ID=$(ensure_issue "Docs: compiled prompt spec + examples" task \
  "Write a short spec describing the compiled prompt sections, mapping from form fields, and examples. Include guidance for writers.")
ensure_dep "$DOCS_ID" "$PROMPT_ID" blocks
ensure_dep "$DOCS_ID" "$EPIC_ID" parent-child

say "Added/updated tasks under epic $EPIC_ID. Run 'bd ready' or 'bd stats' to verify."

