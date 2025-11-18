# AI-2027 Modeling Playground – MVP Implementation Plan

**Status**: Draft
**Owner**: TBD
**Last updated**: 2025-11-18

---

## Overview

This document combines the **tech architecture** ([tech_design.md](tech_design.md)) and **formal model scope** ([model_design.md](model_design.md)) into a concrete implementation roadmap.

**Goal**: Build an internal modeling playground for AI-2027 scenarios with visual state machines, trajectory exploration, and (eventually) formal verification.

**Strategy**: Start simple, validate architecture, add complexity progressively.

---

## Implementation Phases

### Phase 1: Deterministic LTS (Week 1)

**Model**: Labeled Transition System - deterministic state machine
**Tech**: Next.js + React Flow + local JS modeling logic

#### Deliverables

1. **Next.js App Setup**
   - [ ] Initialize Next.js project with TypeScript
   - [ ] Configure file structure (`/app`, `/lib`, `/components`)
   - [ ] Set up basic routing

2. **Canonical Contract (TypeScript)**
   - [ ] Define `GraphResponse` interface (see [tech_design.md §3](tech_design.md#3-canonical-graph-contract-frontend-backend))
   - [ ] Define `NodeAP`, `EdgeAP`, `VariableDef`, `ModelMeta` types
   - [ ] Create `LocalModelProvider` abstraction

3. **Sample Model: AI-2027 Race Scenario**
   - [ ] Define 10-15 key states (see [model_design.md §6](model_design.md#6-example-ai-2027-race-to-agi-model))
   - [ ] Implement deterministic transitions
   - [ ] Add atomic propositions (`{deployed, scaled, racing, ...}`)
   - [ ] Export as `GraphResponse` object

4. **React Flow Visualization**
   - [ ] Install React Flow (`npm install reactflow`)
   - [ ] Create custom node components
   - [ ] Implement Dagre auto-layout
   - [ ] Highlight current state
   - [ ] Show trajectory (past edges emphasized)

5. **Simulation Logic**
   - [ ] Implement `getAvailableActions(state)`
   - [ ] Implement `stepDeterministic(state, action)`
   - [ ] Maintain state: `{ currentNode, variables, timeStep }`
   - [ ] Update UI on each step

6. **UI Components**
   - [ ] Action picker panel (left)
   - [ ] React Flow canvas (right)
   - [ ] Variable graphs (bottom) - compute, risk, trust
   - [ ] Timeline display

7. **Property Checking (Basic)**
   - [ ] Implement `checkGlobally(predicate)` - G φ
   - [ ] Implement `checkEventually(predicate)` - F φ
   - [ ] Define 5-10 sample properties (see [model_design.md §5](model_design.md#5-property-specification-library))
   - [ ] Display property status in UI

**Success criteria**:
- ✅ Can visualize AI-2027 scenario as state graph
- ✅ Can step through deterministic choices
- ✅ Variables update correctly
- ✅ Can check G φ, F φ properties
- ✅ Graph contract validated

**Timeline**: 1 week (5-7 days)

---

### Phase 2: Time Guards (Week 2)

**Model**: Time-Indexed Kripke Structure - add temporal constraints
**Tech**: Extend Phase 1 types and logic

#### Deliverables

1. **Extend State Representation**
   - [ ] Add explicit `time: number` to state
   - [ ] Update `GraphResponse` to include time windows
   - [ ] Define `TimeIndexedState = { world: string, time: number, variables }`

2. **Add Time Guards to Edges**
   - [ ] Extend `EdgeAP` with `timeWindow?: { min, max }`
   - [ ] Update sample model with time constraints:
     - Theft window: `t ∈ [6, 16]`
     - Deploy deadline: `t ∈ [0, 8]`
     - Regulation window: `t ∈ [8, 14]`

3. **Update Simulation Logic**
   - [ ] Implement `stepWithTimeGuard(state, action)`
   - [ ] Validate time guards before transitions
   - [ ] Reject invalid actions (outside time window)

4. **UI Enhancements**
   - [ ] Add timeline/clock visualization
   - [ ] Show "decision window closing" warnings
   - [ ] Display time window on edge hover
   - [ ] Filter available actions by time validity

5. **Property Checking (Bounded)**
   - [ ] Implement bounded operators: `G_{t≤k}`, `F_{t≤k}`
   - [ ] Define bounded temporal properties:
     - `G_{t≤12} ¬catastrophe`
     - `F_{t≤8} regulation`

**Success criteria**:
- ✅ State includes explicit time component
- ✅ Edges have time windows
- ✅ Invalid actions rejected based on time
- ✅ Can check bounded temporal properties
- ✅ UI shows temporal constraints clearly

**Timeline**: 3-5 days

---

### Phase 3: Matrix Backend + MDP (Weeks 3-5)

**Model**: Markov Decision Process - add probabilities
**Tech**: FastAPI backend, Python libraries, HTTP integration

#### Part 3a: Matrix Service Setup (Week 3)

1. **FastAPI Scaffolding**
   - [ ] Initialize FastAPI project (`matrix/`)
   - [ ] Set up project structure (`/models`, `/adapters`, `/api`)
   - [ ] Configure CORS for Next.js origin

2. **Define Matrix API** (see [tech_design.md §5.2](tech_design.md#52-matrix-api-initial))
   - [ ] `GET /models` - list available models
   - [ ] `GET /models/{id}/graph` - return `GraphResponse`
   - [ ] `POST /simulate/step` - single transition
   - [ ] `POST /simulate/trajectory` - multi-step simulation

3. **Adapter Pattern**
   - [ ] Create `BaseModelAdapter` interface:
     - `toGraphResponse()`
     - `initialState()`
     - `step(state, action, rng?)`
   - [ ] Implement `TransitionsAdapter` (using `transitions` library)
   - [ ] Implement `CustomKripkeAdapter` (hand-written models)

4. **Python Libraries**
   - [ ] Install `transitions` for FSM
   - [ ] Install `networkx` for graph algorithms
   - [ ] Install `pyModelChecking` for LTL/CTL

5. **Frontend Integration**
   - [ ] Create `MatrixModelProvider` class
   - [ ] Implement HTTP client for Matrix API
   - [ ] Add model source toggle: Local ↔ Matrix
   - [ ] Verify same UI works with both backends

**Success criteria**:
- ✅ Matrix service running locally
- ✅ Can fetch graph from Matrix
- ✅ Can simulate steps via HTTP
- ✅ Frontend unchanged (contract preserved)

#### Part 3b: Add Probabilities (MDP) (Weeks 4-5)

1. **Extend Model with Probabilities**
   - [ ] Add `probability: number` to `EdgeAP`
   - [ ] Define MDP model format (see [model_design.md §3.3](model_design.md#33-phase-3-future-markov-decision-process-mdp))
   - [ ] Create probabilistic AI-2027 model:
     - `P(S2 → S3 | NO_OP) = 0.20` (race)
     - `P(S2 → S5 | NO_OP) = 0.15` (theft)
     - etc.

2. **Stochastic Simulation**
   - [ ] Implement `stepStochastic(state, action, rng)`
   - [ ] Add RNG seed parameter to `/simulate/step`
   - [ ] Implement `/simulate/trajectory` for Monte Carlo runs

3. **UI Updates**
   - [ ] Display probabilities on edges
   - [ ] Show multiple trajectory runs
   - [ ] Add "Run 100 simulations" button
   - [ ] Display statistics (mean, std dev of outcomes)

4. **PCTL Model Checking** (optional for MVP)
   - [ ] Integrate PRISM or stormpy
   - [ ] Implement `/models/{id}/check` endpoint
   - [ ] Add PCTL property checker:
     - `P≤0.05[F catastrophe]`
     - `P=?[F aligned]`
   - [ ] Display risk bounds in UI

**Success criteria**:
- ✅ Edges have probabilities
- ✅ Can run stochastic trajectories
- ✅ Can compute P(F catastrophe)
- ✅ UI shows risk analysis

**Timeline**: 2-3 weeks total

---

## Technical Tasks Breakdown

### Week 1: Deterministic LTS

| Day | Tasks | Owner |
|-----|-------|-------|
| 1 | Next.js setup, TypeScript config, contract types | TBD |
| 2 | Sample AI-2027 model (10-15 states), atomic props | TBD |
| 3 | React Flow integration, custom nodes, Dagre layout | TBD |
| 4 | Simulation logic, action picker, state management | TBD |
| 5 | Variable graphs, basic property checking (G, F) | TBD |
| 6-7 | Polish, testing, documentation | TBD |

### Week 2: Time Guards

| Day | Tasks | Owner |
|-----|-------|-------|
| 1 | Extend state with time, update types | TBD |
| 2 | Add time guards to sample model | TBD |
| 3 | Implement time guard validation, update simulation | TBD |
| 4 | UI: timeline, decision windows, warnings | TBD |
| 5 | Bounded property checking (G_{t≤k}, F_{t≤k}) | TBD |

### Weeks 3-5: Matrix + MDP

**Week 3**: Matrix setup
- FastAPI scaffolding, API endpoints
- Adapter pattern implementation
- Frontend HTTP integration
- Local testing

**Weeks 4-5**: Probabilities
- MDP model definition
- Stochastic simulation
- UI for probability display
- (Optional) PCTL integration

---

## Milestones

### M1: Deterministic Visualization (End of Week 1)

**Demo**: Show AI-2027 race scenario, step through deterministic choices, check safety property

**Validation**: Graph contract works, React Flow handles custom nodes, simulation logic correct

### M2: Temporal Constraints (End of Week 2)

**Demo**: Show decision windows, time-based warnings, bounded property checking

**Validation**: Time guards enforced, UI communicates temporal aspects clearly

### M3: Backend Integration (End of Week 3)

**Demo**: Toggle between local and Matrix backends, same UI works for both

**Validation**: HTTP contract stable, adapter pattern successful

### M4: Stochastic Analysis (End of Week 5)

**Demo**: Run Monte Carlo simulations, show risk distributions, check PCTL properties

**Validation**: Probabilistic reasoning works, risk quantification accurate

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

### Key Libraries (Python - Phase 3)

```txt
fastapi==0.110.0
uvicorn[standard]==0.27.0
pydantic==2.6.0
transitions==0.9.0
networkx==3.2
pyModelChecking==1.3.3  # Optional for Phase 3b
stormpy==1.8.0          # Optional for Phase 3b
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

### MVP (Phase 1-2) Success

✅ **Functional**:
1. Can model AI-2027 as 10-15 state FSM with time guards
2. Can visualize with React Flow
3. Can check 5-10 safety/liveness properties
4. Can display property violations

✅ **Performance**:
- Page load < 2 seconds
- Property checking < 500ms
- Smooth graph interactions

✅ **Usability**:
- Clear state labels
- Intuitive navigation
- Property status in plain English

### Full Success (Phase 3)

✅ **Capabilities**:
1. Can answer: "What's P(catastrophe)?" → PCTL checking
2. Can answer: "Must decide by 2027?" → Time guards
3. Can answer: "What if theft early?" → Counterfactual simulation
4. Can synthesize: "Safest policy?" → (Future: MDP policy optimization)

✅ **Integration**:
- Frontend ↔ Matrix integration seamless
- Multiple models supported (via adapters)
- Property checking fast enough for interactive use

---

## Future Enhancements (Post-MVP)

### Phase 4: Advanced Features

- POMDP support (partial observability)
- Multi-agent game theory (strategic interactions)
- Continuous-time models (CTMDP)
- Policy synthesis and optimization
- Counterfactual analysis UI

### Integration with Simulacra TTX

- Trajectory recording during gameplay
- Real-time property monitoring
- Post-game analysis reports
- See [SIMULACRA_INTEGRATION.md](../SIMULACRA_INTEGRATION.md)

### Visualization Enhancements

- 3D graph layouts
- Animation of state transitions
- Variable correlation plots
- Risk heatmaps

---

## Related Documentation

- **Tech Architecture**: [tech_design.md](tech_design.md)
- **Model Scope**: [model_design.md](model_design.md)
- **Tools Survey**: [../TOOLS_LITERATURE_SURVEY.md](../TOOLS_LITERATURE_SURVEY.md)
- **Formal Models**: [../formal_models/README.md](../formal_models/README.md)
- **Temporal Logics**: [../logics/README.md](../logics/README.md)
- **Summary**: [../FORMAL_MODELING_SUMMARY.md](../FORMAL_MODELING_SUMMARY.md)

---

## Get Started

**Immediate next steps**:

1. Review and approve this plan
2. Set up Next.js project (`npx create-next-app@latest ai2027-playground --typescript`)
3. Create GitHub repo and branch (`mvp/phase-1`)
4. Start Week 1, Day 1 tasks
5. Schedule daily standups for progress tracking

**First commit**: Contract types + empty model scaffold
