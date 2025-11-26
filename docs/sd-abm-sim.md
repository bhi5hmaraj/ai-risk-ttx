# Simulacra × `scottfr/simulation` — Design Doc (MVP, generalizable)

**Goal.** Replace ad-hoc LLM “consequences” with a tiny, trustworthy simulator we can step **exactly *K* ticks per round** in a stateless Next.js backend—while staying flexible across domains (AI governance, cyber, public health, climate). We’ll use [`scottfr/simulation`](https://github.com/scottfr/simulation), a JS/TS library that runs in Node **and** the browser, supports **System Dynamics** (stocks/flows) **and** **Agent-Based** models (or hybrids), and can **import ModelJSON** and **Insight Maker** models. ([GitHub][1])

---

## 1) Why this runtime

* **Multi-method**: differential-equation/System Dynamics + ABM (or mix). ([GitHub][1])
* **Clean step control**: choose solver (**Euler or RK4**) and `timeStep`; we execute chunks with `timeLength = K * timeStep`. For interactive/pause cases, use `model.simulateAsync({ onStep })` which calls `onStep` **at the end of each time step** (we can stop at *K*). ([GitHub][1])
* **Portable authoring**: load **ModelJSON** or **Insight Maker** exports (`loadModelJSON`, `loadInsightMaker`). ([GitHub][1])
* **UI-ready outputs**: `results.times()` + `results.series(primitive)`—easy to plot (the README’s Quickstart uses Chart.js in a few lines). ([GitHub][1])
* **License**: **AGPL-3.0** (fine as a dependency; modifications deployed over a network must be offered back). ([GitHub][1])

---

## 2) MVP architecture (stateless Next.js)

**High-level flow per round**

1. Client submits chosen **role actions**.
2. API handler loads latest **snapshot** (stocks/flows/variables + `currentTime`).
3. Translate actions → bounded **parameter deltas** (e.g., increase moderation effectiveness; shorten detection delay).
4. Build a `Model` with:

   * `algorithm: 'RK4' | 'Euler'`, `timeStep: dt`, `timeStart: currentTime`, `timeLength: K*dt`. ([GitHub][1])
   * Initialize stocks from snapshot; set variables (with any temporary modifiers).
5. Run `model.simulate()` (or `simulateAsync` if you want per-tick hooks) → obtain `results`. ([GitHub][1])
6. Persist: final state, mini time-series (for sparklines), event log.
7. Return numbers to UI; call LLM **only** to narrate the numeric deltas (never the other way around).

> **Storage:** simple append-only **Events** + **Snapshots** per session (round, *K*) so we can replay/debrief. (Keeps us consistent with your existing history/logging approach.)

---

## 3) Model layer (domain-agnostic)

We use a small **System Dynamics backbone** (fast, interpretable) and optionally add light ABM later.

**Stocks (examples that generalize):**

* `PublicTrust`, `MisinformationLoad` (or `IncidentLoad`), `MitigationCapacity`, `OperationalRisk`, `Attention`.

**Flows (patterns):**

* **Reinforcing spread** (e.g., `Spread` → `IncidentLoad`), **balancing removal** (e.g., `Takedown`), **trust erosion/rebuild**, **capacity build/decay**.
* Flows reference other primitives with the library’s `[Name]` equation DSL, linked via `Model.Link(...)`. ([GitHub][1])

**Variables (policy levers):**

* `PolicyStrictness`, `TransparencyLevel`, `CoordinationIndex`, `MediaAmplification`, `DetectionLag`, `Funding`, etc.

**Solver configuration:**

* Start with **RK4** and `dt = 1` “tick” (e.g., 1 hour); if sharp step functions cause artifacts, switch to **Euler** for that model (the README explains the trade-off). ([GitHub][1])

> **Alternate authoring:** store models as **ModelJSON** (and optionally allow importing Insight Maker files via `loadInsightMaker`). ([GitHub][1])

---

## 4) Actions → parameter deltas (mechanical, safe)

Each action is a small, typed “intervention”:

```json
{
  "id": "emergency_labeling",
  "role": "Platform Lead",
  "effects": [
    { "var": "PolicyStrictness", "op": "+", "value": 0.15, "durationSteps": 12 },
    { "var": "PerceivedCensorship", "op": "+", "value": 0.05, "durationSteps": 12 }
  ],
  "cost": 2
}
```

* Engine clamps variables to safe ranges; duration counters auto-expire.
* LLM proposes actions **and** their effect stubs; Simulacra applies them (LLM never edits equations directly).

---

## 5) LLM responsibilities (and boundaries)

* **Scenario authoring (pre-game):** emit **ModelJSON** scaffold (names, equations, defaults) or propose a parameterized template we validate; then `loadModelJSON(...)`. ([GitHub][1])
* **Action generation (per round):** given a structured state summary, propose role-appropriate actions with **bounded deltas**.
* **Narration/analysis (post-run):** describe **what the numbers did** over the last *K* ticks (3–5 beats, risks, trade-offs).
* **Never** adjudicate numeric outcomes; the simulator is the source of truth.

---

## 6) API contracts (sketch)

* `POST /api/session` → `{sessionId, modelSpec, seed}`
* `POST /api/turn` → `{sessionId, chosenActionIds}`

  * Server: apply deltas → run `simulate()` for `K*dt` → persist snapshot `{t, stocks, variables, series}` → return `{metrics, sparkline[], narrative}`
* `GET /api/session/:id` → returns last snapshot + small history for UI.

---

## 7) UI & visualization

`simulation` returns arrays we can feed to any chart lib:

* `results.times()` + `results.series(stockOrFlow)` → line charts for Trust, Risk, Capacity. (Quickstart uses Chart.js with exactly this shape.) ([GitHub][1])
* Live stepping (optional): `simulateAsync({ onStep })` lets us refresh sparklines each tick or stop exactly at *K*. ([GitHub][1])
* Multi-region or multi-stakeholder views: use **vectors** (see README example with per-country populations) and plot multiple series. ([GitHub][1])

---

## 8) Generalizing beyond AI safety (same engine, new parameters)

Because stocks/flows/levers are abstract, we can retheme quickly:

* **Cyber incident:** `IncidentLoad` (malware spread), `MitigationCapacity` (IR + patching), levers like `IsolationPolicy`, `ThreatIntel`, `UserComms`.
* **Public health:** `Infected`, `Recovered`, `HealthcareCapacity`, levers like `TestingRate`, `Compliance`, `VaccinationRate` (ABM optional for contact networks).
* **Climate/disaster:** `ResourceNeed`, `ReliefCapacity`, `Damage`, levers like `LogisticsCoordination`, `BudgetRelease`, `PublicAdvisory`.

Swap variable names & equations; reuse the **same round loop** (apply deltas → run K ticks → debrief).

If an educator already has an **Insight Maker** model, import it via `loadInsightMaker(...)` and map your actions to that model’s variables. ([GitHub][1])

---

## 9) Data model (DB)

* **sessions**: id, modelSpec (ModelJSON), currentTime, seed.
* **events**: append-only (round, actions applied, parameter deltas).
* **snapshots**: (round, tick=K, stocks, variables, mini series).
  This supports replays, counterfactuals, and classroom debriefs.

---

## 10) Risks & mitigations

* **License (AGPL-3.0):** ok as a dependency; if we modify the lib and serve it, we must provide modified source to users. Keep a **shim layer** in our app to avoid forking unless necessary. ([GitHub][2])
* **Numerics vs. narrative drift:** lock the LLM behind numeric outputs; add unit tests for core equations.
* **Calibration:** start pedagogic (relative deltas); add scenario constants once SMEs engage.

---

## 11) MVP milestones (4–6 weeks)

1. **Week 1:** Base SD model in `simulation` (Trust/Risk/Capacity/Load), RK4, `dt=1`; ModelJSON loader; minimal Next.js API. ([GitHub][1])
2. **Week 2:** Action-to-delta compiler + clamping; persist snapshots; Chart.js line charts wired to `times()/series()`. ([GitHub][1])
3. **Week 3:** LLM prompts (actions, narration); guardrails; round UI.
4. **Week 4:** Import Insight Maker path; classroom debrief page (compare baseline vs. played run). ([GitHub][1])
5. **Weeks 5–6:** Add optional ABM micro-actors (Agents/Population) if needed; measureability hooks.

---

## 12) Attribution Layer: Shapley Values & Counterfactual Analysis

**Goal:** Add interpretable action attribution on top of SD-ABM simulation to answer "How much did each player's actions contribute to the outcome?"

### Background & Research Foundation

Based on recent research (2024-2025), we can combine three complementary attribution methods:

1. **Leave-One-Out (LOO)** – fast, stable first-order attribution
2. **Monte Carlo Shapley approximation** – fair multi-action credit allocation
3. **Sobol indices** (optional) – variance decomposition for sensitivity analysis

These methods are grounded in:
- **Counterfactual analysis in ABMs** (Formalizing the Role of Agent-Based Modeling in Causal Inference and Epidemiology, Am J Epidemiol 2015)
- **Intervention-based causal analysis** (Detecting Causal Relationships in Simulation Models, ACM TIST 2019)
- **Bayesian-Monte Carlo Shapley computation** (Computers & Operations Research 2020)

### 12.1) Leave-One-Out (LOO) Attribution

**Concept:** For each action taken, compare the outcome with vs. without that action.

**Implementation:**
```typescript
async function computeLOO(
  baseline: SimState,
  actions: Action[]
): Promise<Attribution[]> {
  const results: Attribution[] = [];

  // Run baseline (all actions)
  const fullOutcome = await runSimulation(baseline, actions);
  const baselineTrust = fullOutcome.series('PublicTrust').at(-1);

  // Run N simulations, each excluding one action
  for (let i = 0; i < actions.length; i++) {
    const actionsWithoutI = actions.filter((_, idx) => idx !== i);
    const outcomeWithoutI = await runSimulation(baseline, actionsWithoutI);
    const trustWithoutI = outcomeWithoutI.series('PublicTrust').at(-1);

    results.push({
      action: actions[i],
      contribution: baselineTrust - trustWithoutI,  // Marginal contribution
      method: 'LOO'
    });
  }

  return results;
}
```

**Cost:** N simulations (where N = number of actions, typically 3-6 per round)
**Runtime:** ~50-200ms total with RK4 and K=12 ticks

**Advantages:**
- Simple, interpretable
- Stable (deterministic)
- Captures first-order effects

**Limitations:**
- Doesn't account for interactions between actions
- Order-dependent (if actions have synergies)

### 12.2) Shapley Value Approximation via Monte Carlo

**Concept:** Fair credit allocation that accounts for all possible orderings of actions.

The Shapley value for action *i* is:
```
φᵢ = Σ_{S⊆N\{i}} |S|!(|N|-|S|-1)! / |N|! × [v(S∪{i}) - v(S)]
```

Where:
- N = set of all actions
- S = subset (coalition) of actions
- v(S) = outcome value with action set S

**Challenge:** Exact computation requires 2^N simulations (exponential).

**Solution:** Monte Carlo sampling approximation:

```typescript
async function computeShapleyMC(
  baseline: SimState,
  actions: Action[],
  samples: number = 100
): Promise<Attribution[]> {
  const N = actions.length;
  const contributions = Array(N).fill(0);

  // Sample random permutations
  for (let s = 0; s < samples; s++) {
    const perm = shuffle([...actions]);
    let prevValue = (await runSimulation(baseline, [])).finalMetric;

    for (let i = 0; i < N; i++) {
      const coalition = perm.slice(0, i + 1);
      const value = (await runSimulation(baseline, coalition)).finalMetric;
      const marginal = value - prevValue;

      const actionIdx = actions.indexOf(perm[i]);
      contributions[actionIdx] += marginal;
      prevValue = value;
    }
  }

  // Average over samples
  return actions.map((action, i) => ({
    action,
    contribution: contributions[i] / samples,
    method: 'Shapley-MC',
    confidence: computeCI(contributions[i], samples)  // Optional: confidence interval
  }));
}
```

**Cost:** `samples × N` simulations (e.g., 100 × 5 = 500 runs)
**Runtime:** ~5-20 seconds for 100 samples (background computation)

**Optimization: Mini-Shapley** (ADA proposal strategy)
- Apply full Shapley only to top 2-3 actions (where interactions matter)
- Use LOO for remaining actions
- Reduces cost to ~50-100 runs

```typescript
async function computeMiniShapley(
  baseline: SimState,
  actions: Action[]
): Promise<Attribution[]> {
  const loo = await computeLOO(baseline, actions);

  // Identify top-3 by LOO magnitude
  const top3 = loo
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 3)
    .map(a => a.action);

  // Full Shapley for top-3 (to capture interactions)
  const shapleyTop3 = await computeShapleyMC(baseline, top3, 50);

  // Return combined results
  return actions.map(action => {
    if (top3.includes(action)) {
      return shapleyTop3.find(s => s.action === action)!;
    }
    return loo.find(l => l.action === action)!;
  });
}
```

**Cost:** ~150 simulations (manageable)

### 12.3) Sobol Indices for Variance Decomposition (Optional)

**Concept:** Decompose output variance into parts attributable to each parameter/action.

**Use case:** Sensitivity analysis — "Which parameters have the most influence on Trust variance?"

**Implementation:**
```typescript
async function computeSobolIndices(
  baseline: SimState,
  parameters: string[],  // e.g., ['PolicyStrictness', 'TransparencyLevel']
  samples: number = 1000
): Promise<SobolIndex[]> {
  // Saltelli sampling scheme
  const A = generateSampleMatrix(parameters, samples);
  const B = generateSampleMatrix(parameters, samples);

  const Y_A = await Promise.all(A.map(params => runSimWithParams(baseline, params)));
  const Y_B = await Promise.all(B.map(params => runSimWithParams(baseline, params)));

  const indices = parameters.map((param, i) => {
    const C_i = swapColumn(A, B, i);  // Swap i-th column
    const Y_C = await Promise.all(C_i.map(params => runSimWithParams(baseline, params)));

    const V = variance(Y_A);
    const V_i = meanProduct(Y_B, Y_C.map((y, j) => y - Y_A[j])) / samples;

    return {
      parameter: param,
      firstOrder: V_i / V,  // S_i (main effect)
      total: 1 - (meanProduct(Y_A, Y_C.map((y, j) => y - Y_B[j])) / samples) / V  // S_Ti (main + interactions)
    };
  });

  return indices;
}
```

**Cost:** `samples × (2 + N)` simulations (expensive, ~3000-5000 runs)
**Use:** Post-game analysis, calibration, not per-round

### 12.4) Integration with SD-ABM Pipeline

**Proposed workflow:**

```typescript
// Round execution
async function executeTurn(
  sessionId: string,
  chosenActions: Action[]
): Promise<TurnResult> {
  const snapshot = await loadSnapshot(sessionId);

  // 1. Run primary simulation (with all actions)
  const outcome = await runSimulation(snapshot.state, chosenActions);
  await persistSnapshot(sessionId, outcome);

  // 2. Attribution (async, non-blocking)
  const attributionPromise = computeMiniShapley(snapshot.state, chosenActions);

  // 3. Return immediate results + attribution when ready
  return {
    metrics: extractMetrics(outcome),
    sparklines: extractSeries(outcome, ['PublicTrust', 'MisinformationLoad']),
    narrative: await narrateOutcome(outcome),
    attribution: await attributionPromise  // Resolves in background
  };
}
```

**UI rendering:**
- Show outcome metrics immediately
- Display attribution as "Loading..." → populate when ready (1-3s later)
- Operator sheet shows:
  ```
  Action: "Emergency content labeling"
  Contribution: +12 Trust (±2)
  Method: Shapley
  Breakdown:
    - Direct effect: +8
    - Synergy with "Transparency report": +4
  ```

### 12.5) Computational Constraints & Trade-offs

| Method | Simulations | Runtime | Use Case |
|--------|-------------|---------|----------|
| **LOO** | N | ~100ms | Real-time per-round |
| **Mini-Shapley** | ~150 | ~1-3s | Real-time per-round |
| **Full Shapley-MC** | 100×N | ~5-20s | Background/debrief |
| **Sobol** | 1000×(2+N) | ~30-60s | Post-game analysis |

**Recommendation:** Use **Mini-Shapley** for per-round attribution (strikes balance between accuracy and speed).

### 12.6) API Extensions

Add two new endpoints:

```typescript
// POST /api/turn/attribution
{
  sessionId: string,
  round: number,
  method: 'loo' | 'mini-shapley' | 'shapley-mc' | 'sobol'
}
→ {
  attributions: Array<{
    action: Action,
    contribution: number,
    confidence?: [number, number],
    breakdown?: { direct: number, synergy: number }
  }>
}

// POST /api/debrief/sensitivity
{
  sessionId: string,
  parameters: string[],  // e.g., ['PolicyStrictness', 'MediaAmplification']
  samples?: number
}
→ {
  sobolIndices: Array<{
    parameter: string,
    firstOrder: number,  // Main effect
    total: number        // Main + interactions
  }>
}
```

### 12.7) Updated Milestones (with attribution)

Extend Week 5-6 to include attribution layer:

**Week 5: LOO + Mini-Shapley**
- Implement LOO attribution (1 day)
- Implement Monte Carlo Shapley sampling (2 days)
- Add `/api/turn/attribution` endpoint (1 day)
- Wire attribution pills to action cards in UI (1 day)

**Week 6: Operator Sheet & Debrief**
- Build "Operator Sheet" modal with factor breakdown (2 days)
- Waterfall chart: baseline → +action1 → +action2 → final (2 days)
- Add Sobol indices for post-game sensitivity analysis (1 day)

**Week 7: Calibration & Testing**
- Unit tests for attribution methods (2 days)
- Validate against known scenarios (interactions should be detected) (2 days)
- Performance profiling (ensure <3s for Mini-Shapley) (1 day)

### 12.8) Alternative: Hybrid with ADA Factor Space

If we want the best of both worlds (SD-ABM physics + ADA interpretability):

1. **SD-ABM** runs the simulation (stocks/flows/equations)
2. Extract **ADA-style factors** from SD state:
   ```typescript
   function extractADAFactors(sdState: SimState): ADAState {
     return {
       public_trust: sdState.stocks['PublicTrust'] / 100,  // Normalize to [0,1]
       misinfo_pressure: sdState.stocks['MisinformationLoad'] / 50,
       media_clarity: sdState.vars['MediaAmplification'],
       platform_reliability: sdState.vars['PolicyStrictness'],
       // ... map SD primitives to ADA factors
     };
   }
   ```
3. **Attribution operates on ADA factors**, not raw SD stocks
4. UI shows both:
   - Stock charts (SD): "Trust fell from 75 → 60"
   - Factor pills (ADA): "Driven by misinfo_pressure (+0.3), media_clarity (−0.1)"

This gives us:
- ✅ Authentic SD dynamics
- ✅ Uniform ADA-style UI across scenarios
- ✅ Shapley values on interpretable factors

---

### Appendix — Feature references

* Supports **SD + ABM**, Node + browser; Quickstart shows **Chart.js** wiring with `times()`/`series()`. ([GitHub][1])
* **Interactive stepping** via `simulateAsync({ onStep, setValue })`. ([GitHub][1])
* **Solvers & step size:** configure `algorithm: 'RK4'|'Euler'` and `timeStep`. ([GitHub][1])
* **Import/export:** `loadModelJSON`, `toModelJSON`; **Insight Maker** import via `loadInsightMaker`. ([GitHub][1])
* **License:** **AGPL-3.0**. ([GitHub][2])

If you want, I can drop in the first `ModelJSON` scaffold (stocks/flows/equations) and the `/api/turn` handler stub next.

[1]: https://github.com/scottfr/simulation "GitHub - scottfr/simulation: Node and browser JavaScript library to run simulations. Supports System Dynamics modeling, Differential Equation mathematical modeling, and Agent Based Modeling."
[2]: https://github.com/scottfr/simulation/blob/main/LICENSE?utm_source=chatgpt.com "simulation/LICENSE at main · scottfr/simulation · GitHub"


