# AI-2027 Modeling Playground – MVP Implementation Plan

**Status**: Draft
**Owner**: TBD
**Last updated**: 2025-11-18

---

## Overview

This document combines the **tech architecture** ([tech_design.md](tech_design.md)) and **formal model scope** ([model_design.md](model_design.md)) into a concrete implementation roadmap.

**Goal**: Build an internal modeling playground for AI-2027 scenarios using **hybrid automata** - combining discrete modes (governance regimes) with continuous dynamics (compute, alignment, trust).

**Core Model**: Hybrid Automaton (HA) - subsumes FSM, Kripke, MDP while adding continuous state and flow equations.

**Strategy**: Progressive implementation - start discrete-only, add continuous dynamics, then time and stochasticity.

---

## Implementation Phases

### Phase 1: Discrete-Only Hybrid Automaton (Week 1-2)

**Model**: Hybrid automaton with trivial continuous state (validate architecture)
**Goal**: Establish modes, guards, graph contract, visualization
**Tech**: Next.js + React Flow + local JS modeling logic

#### Deliverables

1. **Next.js App Setup**
   - [ ] Initialize Next.js project with TypeScript
   - [ ] Configure file structure (`/app`, `/lib`, `/components`)
   - [ ] Set up basic routing

2. **Canonical Contract - HA Support** (see [tech_design.md §3](tech_design.md#3-canonical-graph-contract-frontend-backend))
   - [ ] Define `GraphResponse`, `NodeAP`, `EdgeAP` types
   - [ ] Add `FlowEquation`, `ResetMap` types (stub for now)
   - [ ] Extend `VariableDef` with `variableKind: "continuous" | "discrete"`
   - [ ] Add `ModelMeta` with `timeModel: "discrete" | "continuous" | "hybrid"`
   - [ ] Create `LocalHAProvider` abstraction

3. **Sample Model: AI-2027 Simplified** (discrete modes only)
   - [ ] Define 5-8 modes: {Baseline, Race, Slowdown, Pause, Catastrophe, Aligned}
   - [ ] Discrete state variables only: `evidenceCount: number`, `roundNumber: number`
   - [ ] Define guards (conditions on discrete vars): `evidenceCount >= 3 → Misalignment_Evidence`
   - [ ] No flow equations yet (Flow(q) = 0 for all modes)
   - [ ] Export as `GraphResponse`

4. **React Flow Visualization**
   - [ ] Install React Flow (`npm install reactflow`)
   - [ ] Custom node components (show mode name, discrete vars)
   - [ ] Dagre auto-layout
   - [ ] Highlight current mode
   - [ ] Show guard conditions on edge hover

5. **Simulation Logic (Discrete)**
   - [ ] Implement `getEnabledTransitions(mode, discreteState)` - check guards
   - [ ] Implement `stepDiscrete(mode, discreteState, transition)` - apply reset (if any)
   - [ ] Maintain state: `{ mode: string, discrete: {...}, time: 0 }`
   - [ ] Update UI on each transition

6. **UI Components**
   - [ ] Mode inspector panel (left): current mode, discrete vars, enabled transitions
   - [ ] React Flow canvas (right): mode graph
   - [ ] Simple timeline (bottom): mode history
   - [ ] Transition log

7. **Property Checking (Basic)**
   - [ ] Implement `checkGlobally(modePredicate)` - AG (mode = "Catastrophe" → false)
   - [ ] Implement `checkEventually(modePredicate)` - AF (mode = "Aligned")
   - [ ] Define 3-5 sample properties on modes only
   - [ ] Display property status

**Success criteria**:
- ✅ Can visualize AI-2027 as mode graph (discrete HA)
- ✅ Can transition between modes based on discrete guards
- ✅ Graph contract supports HA concepts (modes, guards)
- ✅ Can check simple temporal properties on modes
- ✅ Architecture ready for continuous extension

**Timeline**: 1-2 weeks

---

### Phase 2: Add Continuous Dynamics (Week 3-4)

**Model**: Full hybrid automaton - continuous state + flow equations
**Goal**: Add (compute, alignment, trust) variables with ODE dynamics
**Tech**: Extend Phase 1 with ODE integration (simple Euler method in JS)

#### Deliverables

1. **Extend State Representation**
   - [ ] Add continuous state: `{ compute: 26.0, alignment: 0.15, trust: 0.70 }`
   - [ ] Full HA state: `{ mode, continuous: {...}, discrete: {...}, time: 0 }`
   - [ ] Update `GraphResponse` to include flow equations per mode

2. **Define Flow Equations** (see [model_design.md §3.2](model_design.md))
   - [ ] Implement flow functions for each mode:
     ```typescript
     flow_race(x) {
       return {
         compute: 1.5 * x.compute,
         alignment: 0.05 * (1 - x.alignment),
         trust: -0.05 * x.trust
       };
     }
     ```
   - [ ] Add flows to node definitions (FlowEquation type)
   - [ ] Display flow equations on node hover/inspector

3. **ODE Integration (Simple Euler)**
   - [ ] Implement `evolve(mode, x0, dt)`:
     ```typescript
     const dx = flow[mode](x0);
     const x1 = {
       compute: x0.compute + dx.compute * dt,
       alignment: x0.alignment + dx.alignment * dt,
       trust: x0.trust + dx.trust * dt
     };
     ```
   - [ ] Add time-elapse step: `evolveContinuous(state, duration)`

4. **Extend Guards (Continuous State)**
   - [ ] Update guards to reference continuous vars:
     - `trust < 0.4 && evidenceCount >= 3 → Regulation_Window`
     - `alignment_gap = compute - 10*alignment > 5 → Misalignment_Evidence`
   - [ ] Implement guard evaluation on continuous state

5. **Hybrid Simulation Loop**
   - [ ] Implement `stepHybrid(state, dt)`:
     1. Evolve continuous state for time dt
     2. Check guards after evolution
     3. If guard satisfied, take transition + apply reset
     4. Else, stay in mode
   - [ ] Add "Auto-step" mode (continuous evolution + transition detection)

6. **UI Enhancements**
   - [ ] **Time-series charts** (compute, alignment, trust vs time)
     - Use Chart.js or Recharts
     - Different colors per mode
     - Vertical lines at mode transitions
   - [ ] **State inspector**: Show continuous variable values
   - [ ] **Control panel**:
     - Time-elapse button (evolve for Δt = 0.1, 0.5, 1.0)
     - Auto-step toggle
     - Speed control

7. **Property Checking (Continuous)**
   - [ ] Extend properties to continuous state:
     - `AG (alignment_gap < 10)` - alignment gap safety
     - `AG (trust > 0.3)` - trust floor
   - [ ] Sample continuous state at each time step, check predicate

**Success criteria**:
- ✅ Continuous variables (compute, alignment, trust) evolve via ODEs
- ✅ Different flow equations per mode
- ✅ Guards reference continuous state
- ✅ Can visualize continuous trajectories with charts
- ✅ Properties checked on continuous+discrete state
- ✅ Hybrid simulation loop works (continuous + discrete)

**Timeline**: 1-2 weeks

---

### Phase 3: Add Time Guards (Week 5)

**Model**: Hybrid automaton with time-windowed transitions
**Goal**: Model temporal constraints (e.g., "race can start in 2032-2040")
**Tech**: Extend guards to include time predicates

#### Deliverables

1. **Extend Guard Language**
   - [ ] Add time variable to state: `state.time`
   - [ ] Extend guard syntax to include time predicates:
     - `guard = "(time >= 8 && time <= 16) && trust < 0.4"`
   - [ ] Parse and evaluate time-based guards

2. **Add Time Windows to Edges**
   - [ ] Extend `EdgeAP` with optional `timeWindow?: { min, max }`
   - [ ] Update AI-2027 model with time constraints:
     - Baseline → Race: `t ∈ [8, 16]` (race can start 2032-2040)
     - Race → Pause: no time constraint (can pause anytime if evidence strong)

3. **Update Simulation**
   - [ ] Check time guards in `stepHybrid()`
   - [ ] Filter enabled transitions by time validity
   - [ ] Display time windows on edge labels/tooltips

4. **UI Enhancements**
   - [ ] Show clock/timeline prominently
   - [ ] Highlight "decision windows closing soon"
   - [ ] Color-code edges by time validity (available now / future / past)

5. **Property Checking (Bounded Time)**
   - [ ] Implement bounded temporal operators:
     - `G_{t≤k} φ` - globally up to time k
     - `F_{t≤k} φ` - eventually within time k
   - [ ] Example: `G_{t≤20} (mode != "Catastrophe")` - no catastrophe in first 20 years

**Success criteria**:
- ✅ Guards can reference time variable
- ✅ Transitions respect time windows
- ✅ UI clearly shows temporal constraints
- ✅ Can check bounded temporal properties

**Timeline**: 3-5 days

---

### Phase 4: Add Stochastic Transitions (Week 6-7)

**Model**: Stochastic Hybrid Automaton (SHA) - probabilistic mode transitions
**Goal**: Model uncertain outcomes (e.g., pause → aligned with 70% probability)
**Tech**: Add RNG to simulation, probabilistic guards

#### Deliverables

1. **Extend Model with Probabilities**
   - [ ] Add `probability: number` to `EdgeAP` (for stochastic edges)
   - [ ] Define probabilistic transitions in AI-2027:
     - Pause → Aligned: `P = 0.7 + 0.3 * (alignment - 0.85) / 0.15`
     - Pause → Misalignment_Evidence: `P = 1 - P(aligned)`
   - [ ] Distinguish deterministic vs stochastic edges in UI

2. **Stochastic Simulation**
   - [ ] Implement `sampleTransition(enabledEdges, rng)`:
     - For stochastic edges, sample based on probabilities
     - For deterministic edges, take if guard satisfied
   - [ ] Add RNG seed parameter to simulation
   - [ ] Ensure reproducibility (same seed → same trajectory)

3. **Monte Carlo Exploration**
   - [ ] Implement `runTrajectories(model, N, horizon)` - run N simulations
   - [ ] Collect statistics:
     - P(reach catastrophe)
     - P(reach aligned)
     - Expected time to alignment
   - [ ] Display distribution of outcomes

4. **UI Updates**
   - [ ] Show probabilities on stochastic edges
   - [ ] "Run 100 simulations" button
   - [ ] Histogram of outcomes (% catastrophe, % aligned, % ongoing)
   - [ ] Confidence intervals

5. **Abstraction to MDP (Optional)**
   - [ ] Discretize continuous state (alignment → {low, med, high})
   - [ ] Build finite MDP: states = (mode, continuous_region)
   - [ ] Export to PRISM format
   - [ ] Enable exact probabilistic model checking

**Success criteria**:
- ✅ Can model probabilistic transitions (SHA)
- ✅ Monte Carlo simulation gives P(outcomes)
- ✅ UI shows risk distributions
- ✅ (Optional) Can export to PRISM for exact verification

**Timeline**: 1-2 weeks

---

### Phase 5: Matrix Backend (Week 8-10, Optional)

**Model**: All HA features supported in Python backend
**Goal**: Offload simulation + verification to server (scalability, advanced tools)
**Tech**: FastAPI + scipy.integrate + PRISM integration

#### Part 5a: Matrix Service Setup (Week 8)

1. **FastAPI Scaffolding**
   - [ ] Initialize FastAPI project (`matrix/`)
   - [ ] Set up project structure (`/models`, `/adapters`, `/api`)
   - [ ] Configure CORS for Next.js origin

2. **Define Matrix API** (see [tech_design.md §5.2](tech_design.md))
   - [ ] `GET /models` - list available models
   - [ ] `GET /models/{id}/graph` - return `GraphResponse`
   - [ ] `GET /models/{id}/modes/{mode_id}/flow` - flow equations
   - [ ] `POST /simulate/evolve` - ODE integration (continuous evolution)
   - [ ] `POST /simulate/transition` - discrete transition
   - [ ] `POST /simulate/step` - hybrid step
   - [ ] `POST /simulate/trajectory` - multi-step simulation

3. **Hybrid Automaton Adapter**
   - [ ] Create `HybridAutomatonAdapter` interface:
     - `toGraphResponse()`
     - `getFlow(mode)` - return ODE function
     - `evolve(mode, x0, duration)` - integrate with scipy
     - `checkGuards(mode, state)` - find enabled transitions
     - `applyReset(edge, state)` - discrete jump
   - [ ] Implement using scipy.integrate.solve_ivp (RK45 method)

4. **Python Libraries**
   - [ ] Install `scipy` for ODE integration
   - [ ] Install `numpy` for state vectors
   - [ ] Install `networkx` for graph algorithms
   - [ ] (Optional) Install `stormpy` or run PRISM externally

5. **Frontend Integration**
   - [ ] Create `MatrixHAProvider` class
   - [ ] Implement HTTP client for Matrix HA API
   - [ ] Add backend toggle: Local ↔ Matrix
   - [ ] Verify same UI works with both backends

**Success criteria**:
- ✅ Matrix service running locally
- ✅ Can fetch HA graph from Matrix
- ✅ Can simulate hybrid trajectories via HTTP (continuous + discrete)
- ✅ Frontend unchanged (contract preserved)

#### Part 5b: Verification Tools (Week 9-10, Optional)

1. **MDP Abstraction Service**
   - [ ] Implement `/models/{id}/abstract` endpoint
   - [ ] Discretize continuous state → finite MDP
   - [ ] Export to PRISM format
   - [ ] Return PRISM model file

2. **PRISM Integration**
   - [ ] Implement `/models/{id}/check` endpoint
   - [ ] Accept PCTL property string
   - [ ] Call PRISM CLI (or stormpy)
   - [ ] Return probabilistic bounds:
     - `P_min(F catastrophe)`, `P_max(F catastrophe)`
     - `P(F aligned)`
     - `E[time to aligned]`

3. **UI Updates**
   - [ ] "Verify Properties" button
   - [ ] Display PCTL results with confidence
   - [ ] Explanation of abstraction (e.g., "3 regions per variable")

**Success criteria**:
- ✅ Can abstract HA to finite MDP
- ✅ Can verify PCTL properties exactly (via PRISM)
- ✅ UI shows formal verification results

**Timeline**: 2-3 weeks total

---

## Technical Tasks Breakdown

### Weeks 1-2: Discrete-Only Hybrid Automaton

| Week | Tasks | Owner |
|------|-------|-------|
| 1 | Next.js setup, HA contract types (modes, guards, flows-stub) | TBD |
| 1 | AI-2027 discrete model (5-8 modes, discrete guards) | TBD |
| 1 | React Flow integration, mode visualization | TBD |
| 1-2 | Discrete simulation loop, mode transitions | TBD |
| 2 | Basic property checking on modes (AG, AF) | TBD |
| 2 | Polish, testing, documentation | TBD |

### Weeks 3-4: Add Continuous Dynamics

| Week | Tasks | Owner |
|------|-------|-------|
| 3 | Add continuous state (compute, alignment, trust) | TBD |
| 3 | Define flow equations per mode | TBD |
| 3 | Implement Euler ODE integration | TBD |
| 3-4 | Extend guards to reference continuous state | TBD |
| 4 | Hybrid simulation loop (continuous + discrete) | TBD |
| 4 | Time-series charts (Chart.js/Recharts) | TBD |
| 4 | Properties on continuous+discrete state | TBD |

### Week 5: Add Time Guards

| Day | Tasks | Owner |
|-----|-------|-------|
| 1-2 | Extend guards with time predicates | TBD |
| 2-3 | Add time windows to edges, UI display | TBD |
| 4 | Bounded temporal operators (G_{t≤k}, F_{t≤k}) | TBD |
| 5 | Testing, polish | TBD |

### Weeks 6-7: Add Stochastic Transitions (SHA)

| Week | Tasks | Owner |
|------|-------|-------|
| 6 | Add probabilities to edges, stochastic guard sampling | TBD |
| 6 | Monte Carlo trajectory simulation (N runs) | TBD |
| 7 | UI: histograms, risk distributions, statistics | TBD |
| 7 | (Optional) MDP abstraction, PRISM export | TBD |

### Weeks 8-10: Matrix Backend (Optional)

**Week 8**: Matrix setup
- FastAPI scaffolding, HA API endpoints
- HybridAutomatonAdapter with scipy.integrate
- Frontend HTTP integration

**Weeks 9-10**: Verification tools
- MDP abstraction service
- PRISM integration
- UI for formal verification results

---

## Milestones

### M1: Discrete HA Working (End of Week 2)

**Demo**: Show AI-2027 as mode graph, transition between modes based on discrete guards

**Validation**:
- HA contract working (modes, guards, stub flows)
- React Flow visualizes modes correctly
- Discrete simulation loop functional
- Architecture ready for continuous extension

### M2: Continuous Dynamics Working (End of Week 4)

**Demo**: Show hybrid trajectories with continuous state evolution, mode transitions triggered by continuous state

**Validation**:
- Continuous variables (compute, alignment, trust) evolve via ODEs
- Guards reference continuous state
- Time-series charts working
- Hybrid simulation loop (continuous + discrete) functional

### M3: Time Guards + Stochastic Transitions (End of Week 7)

**Demo**: Show time-windowed transitions, run Monte Carlo simulations with probabilistic outcomes

**Validation**:
- Time guards enforced correctly
- Stochastic transitions sample from probability distributions
- Risk distributions displayed (P(catastrophe), P(aligned))
- Core HA+SHA implementation complete

### M4: Backend Integration (End of Week 10, Optional)

**Demo**: Toggle between local and Matrix backends, verify PCTL properties with PRISM

**Validation**:
- Matrix API working for HA simulation
- scipy.integrate handles continuous dynamics
- PRISM integration provides exact probabilistic bounds
- Contract preserved across local/remote backends

---

## Dependencies & Prerequisites

### Development Environment

- Node.js 20+
- npm 10+
- Python 3.11+
- Git

### Key Libraries (JavaScript)

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "reactflow": "^11.x",
    "dagre": "^0.8.5",
    "typescript": "^5.x"
  }
}
```

### Key Libraries (JavaScript - Phases 1-4)

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^19.x",
    "react-dom": "^19.x",
    "reactflow": "^11.x",
    "dagre": "^0.8.5",
    "chart.js": "^4.x",              // For time-series plots
    "react-chartjs-2": "^5.x",       // React wrapper
    "typescript": "^5.x"
  }
}
```

### Key Libraries (Python - Phase 5, Optional)

```txt
fastapi==0.110.0
uvicorn[standard]==0.27.0
pydantic==2.6.0
scipy==1.11.0           # ODE integration (solve_ivp)
numpy==1.26.0           # State vectors, arrays
networkx==3.2           # Graph algorithms
stormpy==1.8.0          # Optional: PRISM integration
pyModelChecking==1.3.3  # Optional: LTL/CTL checking
```

### External Tools (Optional)

- PRISM model checker (for PCTL verification)
- Storm model checker (alternative to PRISM)
- Docker (for Matrix deployment)

---

## Risk Mitigation

### Risk 1: React Flow Performance (>50 nodes)

**Mitigation**:
- Use viewport culling (React Flow default)
- Implement node aggregation for large graphs
- Consider hierarchical layouts

### Risk 2: Time Complexity (Bounded Model Checking)

**Mitigation**:
- Start with small state spaces (10-15 states)
- Use BFS/DFS for reachability (efficient for small graphs)
- Defer to PRISM/Storm for complex properties

### Risk 3: Matrix Integration Complexity

**Mitigation**:
- Define stable contract in Phase 1
- Keep frontend provider-agnostic
- Test with mock HTTP backend before building Matrix

### Risk 4: PCTL Tool Integration (stormpy/PRISM)

**Mitigation**:
- Make PCTL checking optional for MVP
- Start with Monte Carlo approximation
- Add exact model checking in Phase 3b only if needed

---

## Testing Strategy

### Phase 1: Unit + Integration

- [ ] Unit tests for simulation functions (`stepDeterministic`, `checkGlobally`)
- [ ] Integration tests for React Flow rendering
- [ ] Property checking correctness tests

### Phase 2: Regression + Temporal

- [ ] Regression: Phase 1 features still work
- [ ] Time guard validation tests
- [ ] Bounded property checking tests

### Phase 3: API + End-to-End

- [ ] Matrix API tests (FastAPI TestClient)
- [ ] End-to-end: frontend → Matrix → response
- [ ] Stochastic simulation correctness (seed reproducibility)

---

## Documentation Requirements

1. **User Guide**
   - How to load a model
   - How to step through simulation
   - How to interpret properties

2. **Developer Guide**
   - How to add new models
   - How to define custom properties
   - How to extend Matrix with new adapters

3. **API Reference**
   - Matrix REST API documentation (OpenAPI/Swagger)
   - TypeScript contract reference

4. **Model Library**
   - Documented example models (AI-2027, coffee machine, etc.)
   - Property library with descriptions

---

## Success Metrics

### MVP Success (Phases 1-3)

✅ **Functional**:
1. Can model AI-2027 as hybrid automaton (5-8 modes, 3 continuous vars)
2. Can visualize modes with React Flow, continuous state with charts
3. Can simulate hybrid trajectories (continuous evolution + discrete transitions)
4. Can check temporal properties on hybrid traces

✅ **Performance**:
- Page load < 2 seconds
- ODE integration < 50ms per step (Euler, dt=0.1)
- Property checking < 500ms
- Smooth React Flow + chart updates

✅ **Usability**:
- Clear mode labels, guard conditions visible
- Continuous state evolution intuitive (time-series charts)
- Property status explained in plain English
- Time guards displayed clearly

### Full Success (Phases 1-4)

✅ **Capabilities**:
1. Can answer: "How does compute scale in race mode?" → Flow equations, ODE visualization
2. Can answer: "When does alignment fall behind?" → Continuous state guards
3. Can answer: "What's P(catastrophe)?" → Stochastic simulation, risk histograms
4. Can answer: "Can we stay safe until 2040?" → Bounded temporal properties (G_{t≤k})

✅ **Model Fidelity**:
- Discrete modes match governance regimes (Race, Slowdown, Pause)
- Continuous dynamics match qualitative expectations
- Guards trigger at reasonable thresholds
- Probabilities reflect uncertainty appropriately

### Extended Success (Phase 5, Optional)

✅ **Backend Integration**:
- Matrix API working for HA simulation
- scipy.integrate provides accurate ODE solutions
- PRISM integration gives exact probabilistic bounds
- Frontend ↔ Matrix seamless (same UI, swappable backends)

---

## Future Enhancements (Post-MVP)

### Advanced Hybrid Automaton Features

- **Higher-order ODE integration**: RK45, adaptive stepping (beyond Euler)
- **Invariant checking**: Ensure continuous state stays within mode invariants
- **Zeno behavior detection**: Detect infinite discrete transitions in finite time
- **Reset maps**: Non-trivial discrete jumps in continuous state on transitions
- **Multi-agent composition**: H_US ∥ H_China (parallel composition of HAs)

### Integration with Simulacra TTX

- Trajectory recording during Simulacra gameplay
- Real-time property monitoring (show violations during game)
- Post-game HA analysis: "Your trajectory violated trust floor at round 3"
- Export game trace → hybrid automaton model
- See [../../simulacra_integration/](../../simulacra_integration/)

### Visualization Enhancements

- **Phase portraits**: 2D plots (alignment vs compute), show trajectory and mode regions
- **Animation**: Smooth interpolation of continuous state evolution
- **3D state space**: For 3+ continuous variables
- **Risk heatmaps**: P(catastrophe) over initial state regions

### Policy Synthesis (Long-term)

- **MDP policy optimization**: Compute optimal actions to maximize P(aligned)
- **Reachability analysis**: "Can we reach aligned mode from here?"
- **Barrier certificates**: Prove certain states unreachable without exhaustive search

---

## Related Documentation

### MVP Documentation
- **Tech Architecture**: [tech_design.md](tech_design.md) - HA-enabled contract, Matrix API
- **Model Scope**: [model_design.md](model_design.md) - Progressive HA phases, formal definitions

### Hybrid Automata Framework
- **Framework**: [../hybrid_automata/framework.md](../hybrid_automata/framework.md) - Formal HA definitions and semantics
- **Integration**: [../hybrid_automata/integration.md](../hybrid_automata/integration.md) - SD+ABM+HA coupling patterns
- **Tools**: [../hybrid_automata/tools_and_verification.md](../hybrid_automata/tools_and_verification.md) - Verification workflows with PRISM
- **Examples**:
  - [Fisheries](../hybrid_automata/examples/01_ses_fisheries.md) - Social-ecological systems HA
  - [Epidemics](../hybrid_automata/examples/02_epidemic_control.md) - Multi-phase epidemic response
  - [AI-2027](../hybrid_automata/examples/04_ai_governance.md) - Full AI governance spec as SHA

### Simulacra Integration
- **Simulacra + HA**: [../../simulacra_integration/](../../simulacra_integration/) - How to integrate HA into Simulacra TTX game

### Other Resources
- **Tools Survey**: [../TOOLS_LITERATURE_SURVEY.md](../TOOLS_LITERATURE_SURVEY.md) - Comprehensive library research

---

## Get Started

**Immediate next steps**:

1. Review and approve this plan
2. Set up Next.js project (`npx create-next-app@latest ai2027-playground --typescript`)
3. Create GitHub repo and branch (`mvp/phase-1`)
4. Start Week 1, Day 1 tasks
5. Schedule daily standups for progress tracking

**First commit**: Contract types + empty model scaffold
