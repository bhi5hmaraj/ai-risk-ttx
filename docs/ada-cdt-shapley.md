# The Construct: ADA + CDT + Shapley (Design Doc)

Status: draft · Owners: TTX team · Last updated: 2025‑11‑02

## Purpose

Introduce an "advanced" game mode that exposes the numbers behind the narrative while keeping costs predictable and UX mobile‑first. We combine:

- ADA (Analytic Domain): a small, scenario‑agnostic numeric state space
- CDT (Causal Decision Theory): evaluate actions as interventions that maximize expected utility
- Lightweight attribution: leave‑one‑out and mini‑Shapley for fair debrief
- LLM only as a compiler/polisher (no rollouts)

## Goals & Constraints

- Scalable: A handful of small LLM calls per round (not per rollout)
- Generalizes: No per‑scenario custom code; reuse a fixed numeric domain
- Mobile‑first: one‑screen decision flow; numbers + short explanations
- Consistent: Text always matches numbers; numeric tables are source of truth

## Analytic Domain (ADA)

- Fixed factors (example 8–12):
  - public_trust (T), misinfo_pressure (M), media_clarity (C), platform_reliability (R),
    backlash (B), economic_stability (Econ), capability, vulnerability, coordination.
- Normalization: [0, 100] or [−1, +1].
- Dynamics (simple, fast):
  - S' = clip(A·S + B·Σ actions + noise)
  - ΔT ≈ wᵀ·Δfactors (linear/piecewise‑linear with clamps)

## CDT framing

- Actions are soft interventions on factors: do(a): add Δ per factor for 1–2 rounds with confidence.
- Objective per turn (scalarized): maximize E[ΔT] (or w1·U1 + w2·U2) subject to constraints (e.g., Pr[T'<τ] ≤ δ).
- Planning: horizon H=1–2; no LLM rollouts. Complexity: O(A · H · D²), microseconds for D≈10.

## Attribution (Debrief)

- Leave‑one‑out (LOO) per selected action in the round: cheap and stable
- Mini‑Shapley (optional) among top 2–3 actions to capture interactions
- Present Δ and Δ% per action/actor; waterfall baseline → contributions → final

## Generalization across scenarios

- Scenario compiler (LLM, 1 call on round 1):
  - Input: scenario title/description + roles
  - Output: initial ADA state S₀, optional A/B hints, baseline drift (“no one acts”)
- Action compiler (LLM, 1 call/round bundling all options):
  - Input: the 5 option texts + summary
  - Output: per‑option Δ per factor, duration, confidence, tags
- Everything else (evaluate, plan, attribute) is pure ADA math — reusable for all scenarios.

## Text ↔ Numbers

- Numbers → text: deterministic templates + factor lexicon (labels, thresholds). Optional LLM polish under strict constraints (no invented facts).
- Text → numbers: the compilers above (Zod‑validated; clamps & monotone invariants).

## Complexity & Cost

- Per decision: O(A · H · D²) — fast; no LLM.
- LLM calls per round: ~1 (action compiler) + 0–1 (narration polish). First round adds 1 (scenario compiler). End adds 1 (debrief polish).
- Debrief math/attribution: ADA only (fast). Optional mini‑Shapley on a tiny subset.

## Advanced Mode UX ("The Construct")

- Lobby: new card “The Construct (Advanced)” — “See the code behind the crisis.”
- In‑round: action cards show ΔT pill (+/−) and confidence; “Why” opens Operator sheet with top factor drivers.
- End screen: Numeric tables (Δ and Δ%) + actor column + factor breakdown; brief polished paragraph.

## API sketch

- POST /api/ada/compile/actions
  - → [{ id, effects: [{ factor, delta, duration, confidence }], tags }]
- POST /api/ada/evaluate
  - → per option: { deltaT, conf, drivers: [{ factor, contribution }] }
- POST /api/llm/narrate (optional polish)

## Shapley notes

- Full Shapley is exponential; we avoid it. Use:
  - LOO for all selected actions (cheap)
  - Mini‑Shapley only among top 2–3 actions when interaction is suspected
- Present uncertainty (if sampled) as small CI bands.

## Rollout plan

1) ADA types + evaluator (pure math) + Δ pill on action cards
2) Action compiler endpoint (bundle 5 options) + clamps/validation
3) Operator sheet & Construct tab in debrief
4) Scenario compiler (first round only) + optional narration polish
5) Preview flag; collect telemetry; calibrate thresholds

## Open questions

- Factor set D: settle on 8–12 for readability vs coverage
- Confidence handling: shrink effects at low confidence or show wider CIs
- Opponent modeling: keep stochastic policies or give opponents ADA too
- Multi‑objective exposure: slider or tabs for public vs hidden goals

