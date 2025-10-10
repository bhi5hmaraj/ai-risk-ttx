# UI & UX Polish
- [ ] Replace lobby intro copy with a concise hero plus modal/"Learn more" panel so role cards remain above the fold on mobile.
- [ ] Restyle experience selection buttons as descriptive cards with icons and short blurbs.
- [ ] Extract game-screen components (`GameStatusPanel`, `RoundSnapshotCard`, `EventLog`, `ActionSelection`, `PlayerInfoPanel`, `ActionTreeModal`) into `components/game/` for reuse and smaller `App.tsx`.
- [ ] Introduce a `useGameController` hook (or similar) that centralizes state and handlers, keeping `App.tsx` declarative.

# Game Mechanics Enhancements
- [ ] Expand the single public score into multiple metrics (e.g., Public Trust, Operational Capacity, Global Stability) with independent thresholds and visual indicators.
- [ ] Ensure every action carries explicit resource costs (action points, funds, political capital) and define how those costs limit play each round.
- [ ] Map actions to predictable effect templates so similar moves have consistent directional impact on metrics.
- [ ] Track stakeholder relationship scores; adjust AI behavior and narrative based on alliances/conflicts.
- [ ] Formalize the round loop as an MDP/POMDP: define resource/state vectors, stochastic transition functions, and reward structure for both public and hidden objectives.

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
