# UI & UX Polish
- [ ] Replace lobby intro copy with a concise hero plus modal/"Learn more" panel so role cards remain above the fold on mobile.
- [ ] Restyle experience selection buttons as descriptive cards with icons and short blurbs.
- [ ] Keep game-screen components (`GameStatusPanel`, `RoundSnapshotCard`, `EventLog`, `ActionSelection`, `ActionTreeModal`) lean and reusable; centralize shared timeline/action summaries to avoid duplication.
- [ ] Validate the new round summary timeline on multiple scenarios; tweak prompt wording if the model drifts from the 3–5 beat format.
- [ ] Add mobile-specific styling for the timeline and counterfactual banners so they collapse cleanly on narrow viewports.
- [ ] Introduce a `useGameController` hook (or similar) that centralizes state and handlers, keeping `App.tsx` declarative.

# Game Mechanics Enhancements
- [ ] Expand the single public score into multiple metrics (e.g., Public Trust, Operational Capacity, Global Stability) with independent thresholds and visual indicators.
- [ ] Ensure every action carries explicit resource costs (action points, funds, political capital) and define how those costs limit play each round.
- [ ] Map actions to predictable effect templates so similar moves have consistent directional impact on metrics.
- [ ] Track stakeholder relationship scores; adjust AI behavior and narrative based on alliances/conflicts.
- [ ] Formalize the round loop as an MDP/POMDP: define resource/state vectors, stochastic transition functions, and reward structure for both public and hidden objectives.
- [ ] Capture historical round summaries (timeline + counterfactual) in exportable format for after-action review handoffs.

# Player Forecast & Calibration
- [ ] Prompt players to predict score changes before submitting actions; display calibration feedback against actual outcomes.
- [ ] Surface AI rationale for consequences, referencing player expectations to reinforce plausibility.
- [ ] Offer optional confidence bands or uncertainty ranges for AI predictions to teach risk assessment.

# Narrative & Feedback Depth
- [ ] Persist explicit cause→effect chains in the event log so outcomes reference previous decisions.
- [ ] Add external event pulses (news shocks, leaks) to create reactive decision points.
- [ ] Provide per-round analytics (waterfall or breakdown) showing how each action contributed to metric deltas.
- [ ] Introduce optional mini-objectives/bonus conditions to diversify strategy.
- [ ] Default event log to collapsed mode; keep history minimized unless the player explicitly expands it.

# Technical Follow-ups
- [ ] Share `ACTION_TREE_STYLESHEET` and other helpers via a utilities module (`services/gameHelpers.ts`).
- [ ] Create a barrel export for `components/game/` to simplify imports once components are split out.
- [ ] Re-run smoke tests after refactor: start game, complete round, open history/action tree, verify build.
- [ ] Replace Cytoscape-based action tree with React Flow (`reactflow`), including new component, layout helper, and simplified styling.
- [ ] Ensure `reactflow` package is installed (`npm install reactflow`) and customize mobile node styles/detail drawer.

---

## Custom Scenario — Compiled Prompt Builder
- [ ] Build a compiler that turns the form (GameSetup + per-field `comments`) into a single LLM-ready prompt string.
  - Includes stakeholder `character` notes; drops `publicObjective`.
  - Enforce `coreMetric.value` ∈ [70, 100].
  - Deterministic sections: Title, Overview, Core Metric, Stakeholders (character + hidden), Optional: Max Rounds.
- [ ] Refactor `/custom-scenario` to `react-hook-form` + `useFieldArray` for stakeholders; store comments by field path.
- [ ] Propagate schema: remove `publicObjective`, add `character` across shared types and prompt generators.
- [ ] Tests: snapshot compiled prompt outputs using debug prefill as golden samples.
- [ ] Security: sanitize comments, strip control tokens, and add anti-injection guards in the compiler.
- [ ] Docs: write a short spec and examples for the compiled prompt format.

### New: Copilot pre-fill for stakeholders (Phase 1.5)
- [ ] Before compiling and sending to `/api/llm/generate/custom-scenario`, call Copilot to fill any missing stakeholder fields (name, character, hiddenObjective, icon) based on title/overview/core metric.
  - Inputs: current form state + per-field comments
  - Output: patched form with empty fields populated; user remains in control (show a diff or soft preview)
  - Relax validation: roles/character/hiddenObjective optional; allow Copilot to backfill
- [x] UI: make `character` a multi-line textarea to encourage richer notes

### TODO: Evaluate JSON Forms (jsonforms.io)
- Decision status: Investigate later; continue with Zod-driven renderer for now.

- Why consider JSON Forms
  - Declarative UI from JSON Schema + UISchema; reduces hand-written form code
  - Pluggable renderers (Material/Vanilla), accessibility, i18n, layout system
  - AJV validation and error mapping out of the box
  - Ecosystem of custom renderers for arrays, tables, enums, etc.

- Why keep Zod for now
  - We already use Zod across runtime parsing and types; single source for compile/prompt and Copilot actions
  - Tight TypeScript integration and safeParse ergonomics in app code
  - Lower migration risk; no additional theming layer or UISchema to maintain

- Bridge option (if we adopt JSON Forms later)
  - Generate JSON Schema from Zod using `zod-to-json-schema` and feed it to JSON Forms
  - Author a small UISchema to control layout/labels; keep Zod as the domain source of truth
  - Keep AJV in sync with Zod rules; rely on server-side Zod for final validation

- Risks / cons
  - Extra dependency + bundle size; theming to Tailwind requires work
  - Zod→JSON Schema conversion is lossy for some refinements/custom checks
  - Mapping our per-field `comments` UX into JSON Forms requires custom renderer slots

- Rough migration plan (if we greenlight)
  1) Add `zod-to-json-schema` and a build step that exports Schema + UISchema
  2) Render `<JsonForms schema uiSchema data onChange>` for `/custom-scenario`
  3) Write custom renderers for stakeholder arrays and comments alongside fields
  4) Keep Zod validation at the edges (API + compile), AJV for UI feedback

Beads (bd) plan script: `bash scripts/bd_add_compiled_prompt_plan.sh` to create tasks and dependencies under the existing epic.
