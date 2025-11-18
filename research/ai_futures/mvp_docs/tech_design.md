# AI-2027 Modeling Playground – MVP Tech Design

**Status**: Draft
**Owner**: TBD
**Last updated**: 2025-11-18

---

## 1. Context & Goals

We want an internal "modeling playground" for AI-2027-style scenarios:

- Visual, explorable **hybrid automata** (discrete modes + continuous dynamics).
- State machines / DAGs showing governance regimes (race, slowdown, pause, etc.).
- Continuous variables (compute, alignment, trust) with flow equations (ODEs) per mode.
- Ability to see trajectories combining discrete transitions and continuous evolution.
- Eventually: backend-powered reasoning (temporal logics, ODE solvers, Python libraries) via a service called **Matrix**.

We'll build this in **two phases**:

1. **Phase 1 (MVP)**
   - Start with discrete-only FSM/Kripke (validate architecture).
   - Add continuous dynamics (flow equations, ODE integration).
   - Visualization via **React Flow** (modes as nodes, guards as edges, continuous state in charts).
   - Define the **canonical graph contract** supporting hybrid automata.

2. **Phase 2**
   - Introduce **Matrix** as a FastAPI service.
   - Use Python libraries: FSM/statechart, ODE solvers (scipy), model-checking tools.
   - Support stochastic hybrid automata (probabilistic mode transitions).
   - Keep the front-end unchanged by adhering to the contract defined in Phase 1.

This doc covers:

- MVP architecture (JS FSM + React Flow).
- The contract React Flow needs from any backend.
- Phase 2: where Matrix slots in.
- Alternatives considered (XState, other graph libs).
- Frontend stack choice: static SPA vs **Next.js**.

---

## 2. High-level Architecture (Phases)

### 2.1 Phase 1 – MVP (JS-only)

**Frontend**:
- **Next.js** (TypeScript) as the app shell and routing.
- **React Flow** for graph visualization / interaction.
- "Local" modeling logic in JS/TS (FSM logic, transitions, stochasticity).

**Backend**:
- None required beyond static hosting for MVP.
- All simulation runs in the browser.

**Core concept**:
- Define a **canonical graph + state contract**; React Flow and local JS logic implement this.
- In Phase 2, Matrix will simply provide the same contract over HTTP.

### 2.2 Phase 2 – Matrix (FastAPI + Python)

**Matrix** (FastAPI):

- Hosts Python models (e.g., `transitions`, `Sismic`, `automata-lib`, plus temporal-logics tools).
- Exposes a small HTTP API:
  - `GET /models` – list models.
  - `GET /models/{id}/graph` – graph definition in canonical format.
  - `POST /simulate/step` – one transition.
  - `POST /simulate/trajectory` – generate runs.
  - `POST /models/{id}/check` – logical property checks (later).

**Frontend**:

- Same Next.js + React Flow app.
- Swap "LocalModelProvider" with "MatrixModelProvider" that speaks HTTP.
- No change to visualization or UI contracts.

---

## 3. Canonical Graph Contract (Frontend–Backend)

This contract is what **React Flow** (and any UI component) expects from *any* backend: local JS or Matrix.

### 3.1 Entities

#### 3.1.1 Node (Mode)

In hybrid automata, nodes represent **modes** (discrete locations).

```ts
type NodeId = string;

interface NodeAP {
  id: NodeId;
  label: string;              // human-readable name e.g. "Race", "Pause"
  description?: string;       // for tooltips / side panels
  atomicProps?: string[];     // e.g. ["race", "aligned", "catastrophe"]
  kind?: "normal" | "initial" | "final" | "choice" | "history" | "aggregated";

  // Hybrid automaton extensions
  flow?: FlowEquation;        // ODE system active in this mode
  invariant?: string;         // Staying condition (e.g., "trust >= 0.3")

  data?: Record<string, any>; // backend-specific extra info
}
```

#### 3.1.2 Edge (Transition)

In hybrid automata, edges represent **discrete transitions** between modes.

```ts
type EdgeId = string;

interface EdgeAP {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  label?: string;              // e.g. "RACE", "SLOWDOWN", "evidence_threshold"
  actionType?: "decision" | "event" | "time" | "stochastic";
  probability?: number | null; // for stochastic branching (SHA)

  // Hybrid automaton extensions
  guard?: string | null;       // Guard condition (e.g., "trust < 0.4 && evidence >= 3")
  reset?: ResetMap;            // Discrete update to continuous state on transition

  outputLabels?: string[];     // Mealy-style outputs / events
  data?: Record<string, any>;  // extra (e.g. evidence, assumptions)
}
```

#### 3.1.3 Variables

Hybrid automata have both **discrete** and **continuous** variables.

```ts
interface VariableDef {
  name: string;                        // "compute", "alignment", "trust", "evidenceCount"
  variableKind: "continuous" | "discrete";  // NEW: distinguish variable types

  // For continuous variables (evolve via ODEs)
  type?: "float";
  min?: number;
  max?: number;

  // For discrete variables (updated on transitions)
  discreteType?: "int" | "enum";
  enumValues?: string[];

  description?: string;
}
```

#### 3.1.4 Flow Equations

Flow equations define continuous dynamics (ODEs) in each mode.

```ts
interface FlowEquation {
  // Human-readable ODE system (for display)
  equations: string[];  // e.g., ["dC/dt = 1.5*C + I_race", "dA/dt = 0.05*(1-A)"]

  // Executable: function mapping current continuous state to derivatives
  compute?: (vars: Record<string, number>) => Record<string, number>;

  // Example:
  // compute: (x) => ({
  //   compute: 1.5 * x.compute + 2.0,
  //   alignment: 0.05 * (1 - x.alignment),
  //   trust: -0.05 * x.trust
  // })
}
```

#### 3.1.5 Reset Maps

Reset maps define discrete updates to continuous state on transitions.

```ts
interface ResetMap {
  // Human-readable (for display)
  description: string;  // e.g., "Reset evidence count to 0"

  // Executable: function mapping old state to new state
  apply?: (vars: Record<string, number>) => Record<string, number>;

  // Example:
  // apply: (x) => ({ ...x, evidenceCount: 0 })
  // Most transitions: identity (no discrete jump)
}
```

#### 3.1.6 Model Metadata

```ts
interface ModelMeta {
  id: string;
  name: string;
  version?: string;
  description?: string;

  // Model type: hybrid automaton subsumes all discrete models
  modelType: "fsm" | "statechart" | "mdp" | "kripke" | "hybrid_automaton" | "stochastic_hybrid_automaton" | "custom";

  // Time model
  timeModel: "discrete" | "continuous" | "hybrid";
  // - discrete: FSM, Kripke (no continuous dynamics)
  // - continuous: Pure ODE (no discrete transitions)
  // - hybrid: Hybrid automaton (both discrete and continuous)

  variables: VariableDef[];
}
```

### 3.2 Graph Response Shape

Every backend must be able to produce something like:

```ts
interface GraphResponse {
  meta: ModelMeta;
  nodes: NodeAP[];
  edges: EdgeAP[];
}
```

For MVP, this is just a JS object in the frontend.
For Matrix, `GET /models/{id}/graph` will return JSON of this shape.

---

## 4. Phase 1 – MVP Design

### 4.1 Frontend Stack

* **Framework:** **Next.js** (TypeScript)

  * Good file-based routing and incremental growth path.
  * Can start effectively as a client-heavy SPA but still have SSR/SSG available.
  * Easier to evolve into documentation + interactive pages without a migration later.

* **Graph Canvas:** **React Flow**

  * Purpose-built for interactive node/edge UIs, with pan/zoom, custom nodes/edges, and efficient rendering.
  * Supports custom components, overlays, minimap, and is widely used for node-based editors.

* **State Management:**

  * Local React state / Context for MVP.
  * Potentially zustand / jotai later if we need more structure.

### 4.2 JS Modeling Layer (MVP)

For Phase 1, we can model dynamics entirely in JS/TS:

* Option A: simple in-house model representation (a pure function `step(state, action, rng) → nextState`).
* Option B: thin wrapper over a simple JS FSM library (e.g. a lightweight Mealy/Moore-like library).

Either way, we:

1. Represent the world state as:

   * `currentNodeId: string`
   * `variableValues: Record<string, number|string>`
   * `timeStep: number`

2. Implement simulation primitives:

   * `getAvailableActions(state)`
   * `step(state, action)` → `nextState` + events

3. Export the corresponding `GraphResponse` for React Flow.

For MVP, we can hardcode one or two models (e.g., a toy "coffee machine" and a small AI-2027 slice) as JS modules that export both:

* Their `GraphResponse`.
* Their `step()` function.

### 4.3 UI Features in MVP

**Main page:**

* Layout:

  * Row 1:

    * Left: State inspector
      * Current mode (discrete state)
      * Continuous variables with current values
      * Available transitions (guards enabled/disabled)
    * Right: **React Flow canvas**
      * Modes as nodes (with flow equations on hover)
      * Guards as edge labels
      * Current mode highlighted
      * Past trajectory emphasized

  * Row 2:

    * **Time-series charts** (continuous state over time)
      * Compute, alignment, trust vs time
      * Different colors per mode
      * Vertical lines mark mode transitions

    * **Phase portrait** (optional, for 2-3 variables)
      * Plot alignment vs compute
      * Show trajectory trace
      * Mode regions highlighted

**Behaviors:**

* Load a model (hybrid automaton or discrete)
* Show current mode and continuous state
* **For hybrid automata**:
  * **Time-elapse button**: Evolve continuous state for Δt (integrate ODEs)
  * **Transition button**: Take a discrete transition (if guard satisfied)
  * **Auto-step**: Combine evolution + transition detection
* **For discrete models**: Classic step-through (same as before)
* Update charts in real-time as simulation progresses

This validates both discrete logic and continuous dynamics.

---

## 5. Phase 2 – Matrix (FastAPI + Python)

### 5.1 Role of Matrix

Matrix becomes the **backend of record** for models:

* Hosts richer modeling libraries:

  * e.g., `transitions` (FSM/statechart with diagram export), `python-statemachine`, `Sismic` (full UML statecharts), `automata-lib` (DFAs/NFAs/TMs), etc.
* May also host temporal logic / model-checking tools later:

  * e.g., `pyModelChecking` (CTL/LTL/CTL*), `stormpy` (probabilistic model checking), etc.

The frontend doesn't change conceptually. It just swaps where it gets `GraphResponse` and `step()` behavior from.

### 5.2 Matrix API (Hybrid Automaton Support)

1. **List models**

   * `GET /models`
   * Returns: array of `{ id, name, description, tags, modelType, timeModel }`.

2. **Fetch graph**

   * `GET /models/{id}/graph`
   * Returns: `GraphResponse` (nodes with flows, edges with guards/resets, meta).

3. **Get flow equations for a mode**

   * `GET /models/{id}/modes/{mode_id}/flow`
   * Returns: `FlowEquation` (ODE system for that mode)

4. **Simulate continuous evolution** (time-elapse in a mode)

   * `POST /simulate/evolve`
   * Body:
     * `model_id`
     * `mode` (current discrete mode)
     * `state` (current continuous state)
     * `duration` (time to integrate)
   * Returns:
     * `next_state` (continuous state after integration)
     * `trajectory` (optional: sampled points along ODE solution)

5. **Simulate a discrete transition**

   * `POST /simulate/transition`
   * Body:
     * `model_id`
     * `edge_id` (which transition to take)
     * `state` (current continuous state)
   * Returns:
     * `next_mode` (target mode)
     * `next_state` (continuous state after reset)
     * `guard_satisfied` (boolean: was guard actually satisfied?)

6. **Simulate a hybrid step** (continuous evolution + check guards)

   * `POST /simulate/step`
   * Body:
     * `model_id`
     * `current_state` (mode + continuous state + discrete vars)
     * `max_duration` (time budget for continuous evolution)
   * Returns:
     * `next_state` (mode, continuous state, time)
     * `transition_fired` (boolean: did a discrete transition occur?)
     * `events` (edge outputs / logs)

7. **Simulate a trajectory**

   * `POST /simulate/trajectory`
   * Body:
     * `model_id`
     * initial state (mode + continuous state)
     * `horizon` (time or steps)
     * `policy` (optional: agent decision rule)
   * Returns:
     * sequence of `(mode, continuous_state, time, events)`

Later we can add:

* `/models/{id}/check` for logical property checks.
* `/models/{id}/traces` for precomputed example runs.

### 5.3 Server-side Modeling

Matrix internally uses **adapters** for different model types:

**Discrete model adapters**:
* `TransitionsAdapter` – wraps `transitions` machines (FSM/statechart)
* `SismicAdapter` – wraps Sismic statecharts
* `AutomataAdapter` – wraps `automata-lib` automata
* `KripkeAdapter` – hand-written Kripke/MDP models

**Hybrid automaton adapter**:
* `HybridAutomatonAdapter` – general hybrid automaton engine
  * Uses **scipy.integrate** for ODE integration
  * Supports guards, resets, invariants
  * Optional: stochastic transitions (SHA)

**Each adapter must implement**:

* `toGraphResponse()` - export to canonical format
* `initialState()` - return starting state
* `step(state, action, rng?)` - one simulation step
* **For HA adapters**:
  * `getFlow(mode)` - return ODE system for a mode
  * `evolve(mode, state, duration)` - integrate ODEs
  * `checkGuards(mode, state)` - find enabled transitions
  * `applyReset(edge, state)` - discrete jump

**ODE Integration**:
Matrix uses **scipy.integrate.solve_ivp** with adaptive stepping:
```python
from scipy.integrate import solve_ivp

def evolve(mode, x0, duration):
    flow = self.flows[mode]  # ODE function: f(t, x) -> dx/dt
    result = solve_ivp(flow, [0, duration], x0, method='RK45')
    return result.y[:, -1]  # Final state
```

Matrix orchestrates these adapters and exposes the unified API above.

---

## 6. Alternatives Considered

### 6.1 XState as main visualization / runtime

**What we considered**

* Use **XState** (JS/TS statecharts) and either:

  * Its legacy visualizer (deprecated), or
  * **Stately Studio** (hosted) as our main visual UI.

**Pros**

* Strong statechart semantics (hierarchy, parallelism, history).
* Good TypeScript support and runtime for event-driven logic.
* Great for small educational examples and UI state.

**Cons**

* Official visualizer is deprecated in favor of Stately Studio; Studio is a separate hosted product, not a lightweight embeddable canvas.
* Core AI-2027 models may be MDP-ish, probabilistic, or Kripke-like; forcing them into XState config is awkward, especially for probabilities and time.
* Tight coupling: front-end semantics would be bound to one specific library's model, making it harder to plug in Python backends or non-statechart models.

**Decision**

* Use XState **only for**:

  * Tiny pedagogical machines,
  * Possibly UI state in the app,
  * Optional "debug view" for small projections.
* Do **not** use XState as the canonical world-model format or the primary visualization surface.

### 6.2 Other JS graph libs instead of React Flow

**Candidates**

* `vis.js`, `Cytoscape.js`, low-level `d3` + custom SVG, etc.

**Why React Flow**

* Designed specifically for **node-based editors and UIs**, not just generic graphs.
* Handles performance + DOM concerns (only renders nodes in viewport, etc.).
* Flexible custom node/edge types and rich extensions (minimap, background, controls).
* Clean integration with React/Next.js.

Other libs either push more work onto us (e.g., d3) or are less suited to building rich state-machine editors.

**Decision**

* Use **React Flow** as the main graph canvas.

---

## 7. Frontend Framework Choice: Static SPA vs Next.js

We need:

* A documentation-ish site with explainer content.
* Interactive canvases and sandboxes.
* Room to grow into more pages, maybe server-rendered content, and auth in the future.

**Options**

1. **Pure SPA (Vite + React, CRA, etc.)**

   * Simpler initial setup.
   * Migration to SSR / multi-page later is painful (you've already seen this movie).

2. **Next.js (App Router)**

   * Can act like an SPA for client-heavy sections.
   * Built-in routing, data fetching patterns, and static generation.
   * Easy to mix doc pages (MDX) and interactive React Flow canvases.
   * Smooth path to:

     * Auth,
     * API routes (if needed),
     * Incremental static regeneration / SSR if we ever want SEO or dynamic content.

Given your experience ("I always grow out of SPA, migration is painful"), and the fact that Next.js overhead for a simple app is now small, it's sensible to **start with Next.js**.

**Decision**

* Start with **Next.js + React Flow + TS**.
* Treat it as a "SPA within a framework" for now (mostly client components where needed).
* Gain an easy path to:

  * static export for internal hosting,
  * or SSR/ISR later.

---

## 8. Summary of Decisions

* **Core front-end:**

  * Next.js (TypeScript)
  * React Flow as the primary graph canvas (modes as nodes, guards as edges)
  * Canonical **GraphResponse** contract extended for **hybrid automata**:
    * Nodes with flow equations
    * Edges with guards and resets
    * Continuous and discrete variables
    * Time models: discrete, continuous, hybrid

* **Phase 1: Progressive Implementation**

  1. **Discrete-only** (FSM/Kripke): Validate architecture, UI, graph contract
  2. **Add continuous dynamics**: Flow equations, ODE integration in browser (simple Euler method)
  3. **Add time guards**: Model time-windowed transitions
  4. **Add stochastic transitions**: Probabilistic mode switches (SHA)

  Demo models:
  * Toy: 2-mode thermostat (simple HA)
  * AI-2027: Small slice (Baseline → Race → Pause)

* **Phase 2: Matrix Backend**

  * Introduce **Matrix** (FastAPI + Python)
  * **Hybrid automaton engine** using:
    * scipy.integrate for ODE solving
    * Custom guard/reset logic
    * Stochastic transitions (numpy.random)
  * Python model-checking libraries for verification
  * Matrix API: `/models`, `/graph`, `/flow`, `/evolve`, `/simulate`, `/check`
  * Frontend unchanged (same contract)

* **Alternatives:**

  * XState used only as a secondary/debug/teaching tool, not the core
  * React Flow preferred over other JS graph libs for node-based editors
  * **Hybrid automata subsume all discrete models** (FSM, Kripke, MDP), so no need for separate engines

This keeps the **MVP tractable** (start discrete, add continuous incrementally), aligns with serious modeling goals (Python + verification tools), and provides a **unified framework** (HA) instead of separate discrete and continuous stacks.

---

## Related Documentation

### MVP Documentation
- **Model Design**: [model_design.md](model_design.md) - Hybrid automaton approach, progressive phases
- **Implementation Plan**: [impl_plan.md](impl_plan.md) - Week-by-week roadmap for HA implementation

### Hybrid Automata Framework
- **Framework**: [../hybrid_automata/framework.md](../hybrid_automata/framework.md) - Formal HA definitions and semantics
- **Integration**: [../hybrid_automata/integration.md](../hybrid_automata/integration.md) - SD+ABM+HA coupling patterns
- **Tools**: [../hybrid_automata/tools_and_verification.md](../hybrid_automata/tools_and_verification.md) - Verification workflows
- **Examples**: [../hybrid_automata/examples/](../hybrid_automata/examples/) - Domain-specific HA models

### Other Resources
- **Tools Literature Survey**: [../TOOLS_LITERATURE_SURVEY.md](../TOOLS_LITERATURE_SURVEY.md) - Comprehensive library research
