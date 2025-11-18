# AI-2027 Modeling Playground – MVP Tech Design

**Status**: Draft
**Owner**: TBD
**Last updated**: 2025-11-18

---

## 1. Context & Goals

We want an internal "modeling playground" for AI-2027-style scenarios:

- Visual, explorable state machines / DAGs (e.g., race vs slowdown, theft, governance).
- Ability to attach world variables (compute, risk, etc.) and see trajectories.
- Eventually: backend-powered reasoning (temporal logics, Python libraries) via a service called **Matrix**.

We'll build this in **two phases**:

1. **Phase 1 (MVP)**
   - All logic and state evolution in JS/TS (simple FSM library / custom model code).
   - Visualization via **React Flow**.
   - Define the **canonical graph contract** that future backends must satisfy.

2. **Phase 2**
   - Introduce **Matrix** as a FastAPI service.
   - Use Python FSM / statechart / model-checking libraries behind Matrix.
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

#### 3.1.1 Node

```ts
type NodeId = string;

interface NodeAP {
  id: NodeId;
  label: string;              // human-readable name e.g. "S8 – Fork: Race vs Slowdown"
  description?: string;       // for tooltips / side panels
  atomicProps?: string[];     // e.g. ["race", "aligned", "catastrophe"]
  kind?: "normal" | "initial" | "final" | "choice" | "history" | "aggregated";
  data?: Record<string, any>; // backend-specific extra info
}
```

#### 3.1.2 Edge

```ts
type EdgeId = string;

interface EdgeAP {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
  label?: string;              // e.g. "RACE", "SLOWDOWN", "WEIGHT_THEFT"
  actionType?: "decision" | "event" | "time" | "stochastic";
  probability?: number | null; // for stochastic branching (MDP-ish)
  guard?: string | null;       // optional human-readable predicate string
  outputLabels?: string[];     // Mealy-style outputs / events
  data?: Record<string, any>;  // extra (e.g. evidence, assumptions)
}
```

#### 3.1.3 Variables

```ts
interface VariableDef {
  name: string;                        // "compute", "alignmentRisk", ...
  type: "float" | "int" | "enum";
  min?: number;
  max?: number;
  enumValues?: string[];
  description?: string;
}
```

#### 3.1.4 Model Metadata

```ts
interface ModelMeta {
  id: string;
  name: string;
  version?: string;
  description?: string;
  modelType: "fsm" | "statechart" | "mdp" | "kripke" | "custom";
  timeModel: "discrete";
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

    * Left: action picker / state inspector.
    * Right: React Flow canvas showing the current machine; current node highlighted; past trajectory edges emphasized.
  * Row 2:

    * Variable graphs (compute, risk, etc.) and maybe a timeline.

**Behaviors:**

* Load a model (hardcoded choice list).
* Show current state on graph.
* Show available actions from that state.
* Step through actions:

  * Update `currentNodeId`, variables, and time.
  * Update charts.
  * Optionally hide future nodes until decisions are made.

This is enough to demonstrate "state machine thinking" and validate the graph contract.

---

## 5. Phase 2 – Matrix (FastAPI + Python)

### 5.1 Role of Matrix

Matrix becomes the **backend of record** for models:

* Hosts richer modeling libraries:

  * e.g., `transitions` (FSM/statechart with diagram export), `python-statemachine`, `Sismic` (full UML statecharts), `automata-lib` (DFAs/NFAs/TMs), etc.
* May also host temporal logic / model-checking tools later:

  * e.g., `pyModelChecking` (CTL/LTL/CTL*), `stormpy` (probabilistic model checking), etc.

The frontend doesn't change conceptually. It just swaps where it gets `GraphResponse` and `step()` behavior from.

### 5.2 Matrix API (initial)

1. **List models**

   * `GET /models`
   * Returns: array of `{ id, name, description, tags, modelType }`.

2. **Fetch graph**

   * `GET /models/{id}/graph`
   * Returns: `GraphResponse` (nodes, edges, meta).

3. **Simulate a step**

   * `POST /simulate/step`
   * Body:

     * `model_id`
     * `current_state` (`NodeId` and variables)
     * `action`
     * Optional `rng_seed`
   * Returns:

     * `next_state` (`NodeId`, variables, time)
     * `events` (edge outputs / logs)

4. **Simulate a trajectory** (optional early, useful soon)

   * `POST /simulate/trajectory`
   * Body:

     * `model_id`
     * initial state
     * `policy` or fixed action sequence
     * `horizon`
   * Returns:

     * sequence of `state, variables, t, events`.

Later we can add:

* `/models/{id}/check` for logical property checks.
* `/models/{id}/traces` for precomputed example runs.

### 5.3 Server-side Modeling

Matrix internally uses **adapters**:

* `TransitionsAdapter` – wraps `transitions` machines.
* `SismicAdapter` – wraps Sismic statecharts.
* `AutomataAdapter` – wraps `automata-lib` automata.
* Custom "KripkeAdapter" for hand-written Kripke/MDP models.

Each adapter must implement:

* `toGraphResponse()`
* `initialState()`
* `step(state, action, rng?)`

Matrix orchestrates these and exposes the unified API above.

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
  * React Flow as the primary graph canvas
  * Canonical **GraphResponse** contract (nodes, edges, variables, meta).

* **Phase 1:**

  * All modeling done in JS/TS.
  * One or two demo models (toy + small AI-2027 slice).
  * Simulation functions in browser.

* **Phase 2:**

  * Introduce **Matrix** (FastAPI + Python).
  * Python FSM/statechart/logic libraries behind Matrix.
  * Matrix exposes `/models`, `/graph`, `/simulate`, `/check`.
  * Frontend swaps to HTTP-backed `ModelProvider` but keeps the same UI.

* **Alternatives:**

  * XState used only as a secondary/debug/teaching tool, not the core.
  * React Flow preferred over other JS graph libs for node-based editors.

This keeps the **MVP small**, aligns with your long-term goal of serious modeling with Python, and minimizes future migration pain by picking Next.js and a stable front-end contract from day one.

---

## Related Documentation

- **Model Design**: [model_design.md](model_design.md) - Which formal models are supported in MVP
- **Implementation Plan**: [impl_plan.md](impl_plan.md) - Combined tech + model implementation roadmap
- **Tools Literature Survey**: [../TOOLS_LITERATURE_SURVEY.md](../TOOLS_LITERATURE_SURVEY.md) - Comprehensive library research
