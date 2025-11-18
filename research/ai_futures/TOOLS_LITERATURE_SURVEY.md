# AI-2027 Formal Modeling: Tools & Libraries Literature Survey

**Purpose**: Comprehensive survey of available tools and libraries for formal modeling, model checking, and temporal logic in JavaScript/TypeScript and Python ecosystems.

**Note**: This is a **reference document** for library options and capabilities. For actual MVP implementation plans, see [mvp_docs/](mvp_docs/).

## TL;DR

**JavaScript/TypeScript Libraries**:
- FSM: JSSM/FSL, XState, robot3
- Visualization: React Flow, Cytoscape.js, vis.js
- Logic: logic-solver, tau-prolog

**Python Libraries**:
- FSM: transitions, Sismic, automata-lib, python-statemachine
- Temporal Logic: pyModelChecking, stormpy, spot
- Model Checking: PRISM (via CLI), Storm (via stormpy), NuSMV

**Progressive Complexity Approach**:
- **Phase 1**: Deterministic LTS (JavaScript SPA) - 1 week
- **Phase 2**: Add time guards - 3-5 days
- **Phase 3**: Add stochasticity (MDP) - 2-3 weeks
- **Phase 4** (Optional): Continuous time (CTMDP) - 3-4 weeks

**See [mvp_docs/impl_plan.md](mvp_docs/impl_plan.md) for actual implementation roadmap.**

---

## Library Capabilities by Phase

### Phase 1: Deterministic LTS (✅ Maximum Simplicity)

**Timeline**: 1 week to working prototype

#### What

Plain **Labeled Transition System** - no probabilities, no complex time.

**State representation**:
```javascript
State: s = world_scenario
       = S4  "Agents scaled to 1M+ employees"
```

**Edges**:
```javascript
S4 → S5 (user chooses "allow theft scenario")
S4 → S6 (user chooses "invest security")
S4 → S7 (user chooses "government partnership")
```

#### Why Start Here

- ✅ **Dead simple**: Just states + labeled edges
- ✅ **Immediate visualization**: Works with any graph library
- ✅ **Clear semantics**: Deterministic choices, easy to understand
- ✅ **Fast iteration**: Change model, reload page
- ✅ **LTL/CTL ready**: Standard temporal logics work out of the box

#### JavaScript Implementation (SPA Quick Win)

**FSM Library Options**:

1. **JSSM/FSL** (Recommended for quick start)
   - Domain-specific language for FSMs
   - Visual diagram generation
   - Built-in validation
   - Lightweight (no React dependency)

   ```javascript
   import jssm from 'jssm';

   const fsm = jssm(`
     initial -> deployed 'deploy';
     deployed -> scaled 'scale';
     scaled -> theft_scenario 'theft';
     scaled -> secure 'invest_security';
   `);
   ```

2. **XState** (Recommended for complex logic)
   - Full hierarchical state machines
   - TypeScript support
   - React integration
   - Visual editor available

   ```javascript
   import { createMachine } from 'xstate';

   const aiMachine = createMachine({
     id: 'ai2027',
     initial: 'initial',
     states: {
       initial: {
         on: { DEPLOY: 'deployed' }
       },
       deployed: {
         on: { SCALE: 'scaled' }
       }
     }
   });
   ```

**Visualization**:
- **React Flow** (already in project) + **Dagre** for auto-layout
- Real-time state highlighting
- Interactive node selection

**Logic Checking**:
- **logic-solver** npm package for simple LTL evaluation
- Or custom evaluator for G φ, F φ patterns

**Stack**:
```
React + TypeScript
├── JSSM/FSL or XState (FSM)
├── React Flow + Dagre (Visualization)
└── logic-solver (Temporal properties)
```

#### Deliverables (Week 1)

1. **AI2027 deterministic state machine** (10-15 states)
2. **Interactive SPA** with React Flow visualization
3. **5-10 LTL/CTL properties** defined (e.g., `G ¬catastrophe`)
4. **Basic property checker** (G φ, F φ evaluation)

---

### Phase 2: Add Time Guards (📅 Temporal Constraints)

**Timeline**: 3-5 days

#### What

Make time explicit, add temporal constraints to edges.

**State representation**:
```javascript
State: s = (world_scenario, time_step)
       = (S4, 8)  "Scaled agents at quarter 8 (2026-Q1)"
```

**Edges with time guards**:
```javascript
S4 → S5 with guard t ∈ [6, 16]
       "Theft only possible quarters 6-16 (2025-2028)"

S0 → S1 with guard t ∈ [0, 8]
       "Deploy only before 2026"
```

#### Why

- ✅ Calendar deadlines ("must decide by 2027")
- ✅ Time windows ("vulnerability period")
- ✅ Still deterministic (no probabilities yet)
- ✅ Standard Kripke semantics (no timed automata complexity)

#### Implementation

**Extend FSM state**:
```javascript
// Using XState with context
const aiMachine = createMachine({
  context: { t: 0 },
  states: {
    scaled: {
      on: {
        THEFT: {
          target: 'theft_scenario',
          cond: (context) => context.t >= 6 && context.t <= 16
        }
      }
    }
  }
});
```

**UI enhancements**:
- Timeline visualization
- "Decision window closing" warnings
- Clock/counter display

#### Deliverables

1. Add time to state representation (t = round number)
2. Implement time guards on all edges
3. Show "decision window closing" warnings in UI
4. Update temporal properties to include time bounds

---

### Phase 3: Add Stochasticity (MDP) (📈 Realism)

**Timeline**: 2-3 weeks (includes calibration)

#### What

Extend deterministic model with probabilities.

**Transition probabilities**:
```javascript
P(S4 → S5 | NO_OP) = 0.15  // 15% theft per quarter
P(S4 → S6 | NO_OP) = 0.10  // 10% controls
P(S4 → S4 | NO_OP) = 0.75  // 75% nothing happens
```

**Actions**:
```javascript
Actions: {INVEST_SECURITY, NO_OP, GOVERNMENT_PARTNERSHIP, ...}

P(S4 → S5 | INVEST_SECURITY) = 0.05  // Reduced theft risk
P(S4 → S6 | INVEST_SECURITY) = 0.30  // Increased controls
```

#### Why

- ✅ Realistic uncertainty modeling
- ✅ Risk quantification ("5% catastrophe risk")
- ✅ PCTL properties (`P≤0.05[F catastrophe]`)
- ✅ Policy optimization possible (max reward, min risk)

#### Implementation Options

**Option 1: Stay in JavaScript**
- Extend XState with probability sampling
- Custom MDP evaluator
- Monte Carlo simulation for property checking

**Option 2: Python "Matrix" Service** (Recommended)
- FastAPI backend service
- Python formal methods libraries
- Clear contract with JS frontend

#### Deliverables

1. **Calibrate transition probabilities** (expert elicitation)
2. **Add PCTL specifications** (`P≤0.05[F catastrophe]`)
3. **Compute P(F catastrophe)** via model checking
4. **Sensitivity analysis** (vary probabilities, measure impact)

---

### Phase 4 (Optional): Continuous Time (CTMDP) (🔬 High Fidelity)

**Timeline**: 3-4 weeks

**Only if** temporal dynamics are critical:
- Hazard rates (exponential waiting times)
- "What happens if we wait 6 months?"
- Competing risks modeling

**Implementation**: Python matrix service (complex math, Gillespie algorithm)

**Effort**: High - requires numerical solvers, CSL logic, Storm model checker

---

## Architecture: JavaScript SPA + Python Matrix Service

### Design Philosophy

**JavaScript SPA**: Quick wins, immediate visualization, user interaction

**Python Matrix Service**: Formal methods experimentation, model checking, complex analysis

**Clear contract**: REST API between frontend and backend

### Component Diagram

```
┌─────────────────────────────────────────────────────┐
│ JavaScript SPA (Frontend)                           │
│ - React + TypeScript                                │
│ - JSSM/XState (deterministic FSM)                   │
│ - React Flow (visualization)                        │
│ - User interaction                                  │
└─────────────────────────────────────────────────────┘
                       ↓↑ REST API
┌─────────────────────────────────────────────────────┐
│ Python "Matrix" Service (Backend)                   │
│ - FastAPI                                           │
│ - Formal methods libraries                          │
│ - Model checking (PRISM/Storm integration)          │
│ - Policy synthesis                                  │
└─────────────────────────────────────────────────────┘
```

### Python Matrix Service Design

#### FastAPI Endpoints

```python
POST /api/verify
  Body: {model: FSM, property: LTL}
  Returns: {satisfied: bool, counterexample?: Trace}

POST /api/synthesize
  Body: {mdp: MDP, objective: Objective}
  Returns: {policy: Policy, expectedReward: float}

POST /api/simulate
  Body: {mdp: MDP, policy: Policy, runs: int}
  Returns: {traces: Trace[], statistics: Stats}

GET /api/properties
  Returns: {library: TemporalProperty[]}
```

#### Implementation Stack

**Python Libraries**:

1. **FSM/Automata** (Phase 1-2):
   - `transitions` - Lightweight FSM library
   - `Sismic` - Statechart interpreter with Python DSL
   - `automata-lib` - Formal automata theory

2. **Temporal Logic** (Phase 1-3):
   - `pyModelChecking` - CTL/LTL model checking
   - `stormpy` - Python bindings for Storm model checker
   - `spot` - LTL/ω-automata library

3. **MDPs/Probabilistic** (Phase 3-4):
   - `stormpy` - MDP/DTMC/CTMC verification
   - Native PRISM integration (via CLI or parsing)
   - `networkx` - Graph algorithms for state spaces

**Framework**:
```python
# FastAPI service structure
from fastapi import FastAPI
from pydantic import BaseModel
from transitions import Machine  # or Sismic
import pyModelChecking as pmc

app = FastAPI()

class VerifyRequest(BaseModel):
    model: dict  # FSM definition
    property: str  # LTL formula

@app.post("/api/verify")
def verify_property(req: VerifyRequest):
    # Build Kripke structure from FSM
    kripke = build_kripke(req.model)

    # Check property
    formula = pmc.LTL(req.property)
    result = formula.check(kripke)

    return {
        "satisfied": result.satisfied,
        "counterexample": result.witness if not result.satisfied else None
    }
```

#### Deployment

**Local Development**:
```bash
# Backend
cd matrix-service
uvicorn main:app --reload

# Frontend (from project root)
npm run dev
```

**Production**:
- Frontend: Vercel (existing deployment)
- Backend: Fly.io, Railway, or Vercel serverless functions

---

## Library Recommendations

### JavaScript/TypeScript (Frontend)

| Library | Purpose | Phase | Priority |
|---------|---------|-------|----------|
| **JSSM/FSL** | Deterministic FSM | 1 | High |
| **XState** | Complex state machines | 1-2 | High |
| **React Flow** | Visualization | 1-4 | High (already in use) |
| **Dagre** | Graph layout | 1-4 | High |
| **logic-solver** | Simple logic evaluation | 1-2 | Medium |
| **d3** | Custom visualizations | 1-4 | Low (React Flow sufficient) |

**Recommended Phase 1 Stack**:
```json
{
  "dependencies": {
    "xstate": "^5.x",
    "react-flow-renderer": "^10.x",
    "dagre": "^0.8.5",
    "logic-solver": "^2.x"
  }
}
```

### Python (Backend Matrix Service)

| Library | Purpose | Phase | Priority |
|---------|---------|-------|----------|
| **transitions** | Lightweight FSM | 1-2 | High |
| **Sismic** | Statechart DSL | 1-2 | Medium |
| **automata-lib** | Formal automata | 2 | Medium |
| **pyModelChecking** | CTL/LTL checking | 1-3 | High |
| **stormpy** | Probabilistic checking | 3-4 | High |
| **spot** | LTL/ω-automata | 2-3 | Medium |
| **networkx** | Graph algorithms | 1-4 | High |
| **FastAPI** | Web service | 1-4 | High |
| **Pydantic** | Data validation | 1-4 | High |

**Recommended Matrix Service Stack**:
```python
# requirements.txt
fastapi==0.110.0
uvicorn[standard]==0.27.0
pydantic==2.6.0
transitions==0.9.0
pyModelChecking==1.3.3
stormpy==1.8.0
networkx==3.2
```

---

## Success Metrics

### MVP Success (Phase 1-2)

✅ **Functional**:
1. Can model AI2027 as deterministic FSM with 10-15 states
2. Can visualize state graph with React Flow
3. Can check 5-10 safety/liveness properties
4. Can display property violations to user

✅ **Performance**:
- Page load < 2 seconds
- Property checking < 500ms for 15-state model
- Interactive visualization (smooth transitions)

✅ **Usability**:
- Clear state labels
- Intuitive navigation
- Property status displayed in plain English

### Full Success (Phase 3-4)

✅ **Capabilities**:
1. Can answer: "What's probability of catastrophe?" → PCTL: `P(F catastrophe)`
2. Can answer: "Must we decide by 2027?" → Time guard: `t ∈ [0, 12]`
3. Can answer: "What if theft occurs early?" → MDP simulation
4. Can synthesize: "What's the safest policy?" → Optimal policy

✅ **Integration**:
- Simulacra TTX integration (trajectory recording)
- Post-game analysis (property violations)
- Policy recommendations

---

## Next Steps

### Immediate (This Week)

1. **Set up JavaScript project**:
   ```bash
   npm install xstate react-flow-renderer dagre
   ```

2. **Define AI2027 FSM** in XState or JSSM/FSL:
   - 10-15 key states
   - Deterministic transitions
   - State labels (atomic propositions)

3. **Implement React Flow visualization**:
   - Node components for states
   - Edge components for transitions
   - Auto-layout with Dagre

4. **Write 5-10 core properties**:
   - Safety: `G ¬catastrophe`
   - Liveness: `F aligned`
   - Response: `G (signal → F slowdown)`

### Short-term (Week 2-3)

5. **Add time to state** (Phase 2):
   - Extend state to `(world, t)`
   - Implement time guards
   - Update visualization to show time

6. **Basic property checker**:
   - Implement `G` (globally) and `F` (eventually)
   - Display results in UI
   - Show counterexamples

### Medium-term (Month 2)

7. **Set up Python matrix service**:
   - FastAPI scaffolding
   - Install transitions, pyModelChecking
   - Define REST API contracts

8. **Migrate to MDP** (Phase 3):
   - Add probabilities to transitions
   - Integrate stormpy or PRISM
   - Implement PCTL checking

9. **Property library**:
   - 20+ pre-built properties
   - Natural language descriptions
   - Categorization (safety, liveness, etc.)

---

## Migration Path: Simulacra Integration

See [SIMULACRA_INTEGRATION.md](SIMULACRA_INTEGRATION.md) for full integration design.

**Quick summary**:

1. **Trajectory Recorder**: Hook into `useGameController` to capture state transitions as Kripke trace
2. **Property Checker**: Real-time LTL/CTL checking during gameplay
3. **Property Monitor UI**: Sidebar panel showing property status
4. **Post-Game Analysis**: Property violation report, counterfactual analysis

**Non-invasive**: No core game changes, pure observation layer.

---

## Effort Estimates

| Phase | Timeline | Complexity | Dependencies |
|-------|----------|------------|--------------|
| **Phase 1**: Deterministic LTS | 1 week | Low | React, XState, React Flow |
| **Phase 2**: Time Guards | 3-5 days | Low | Phase 1 |
| **Phase 3**: Stochasticity (MDP) | 2-3 weeks | Medium | Phase 2, Python service |
| **Phase 4**: Continuous Time | 3-4 weeks | High | Phase 3, Storm/PRISM |
| **Simulacra Integration** | 1-2 weeks | Medium | Phase 1-2 |

**Total MVP (Phase 1-2)**: ~2 weeks

**Total with Probabilities (Phase 1-3)**: ~1.5 months

---

## References

### MVP Documentation
- **Implementation Plan**: [mvp_docs/impl_plan.md](mvp_docs/impl_plan.md) 👈 **Start here for implementation**
- **Tech Design**: [mvp_docs/tech_design.md](mvp_docs/tech_design.md)
- **Model Design**: [mvp_docs/model_design.md](mvp_docs/model_design.md)

### Formal Methods Background
- **Summary**: [FORMAL_MODELING_SUMMARY.md](FORMAL_MODELING_SUMMARY.md)
- **Formal Models**: [formal_models/README.md](formal_models/README.md)
- **Temporal Logics**: [logics/README.md](logics/README.md)
- **Kripke Structures**: [kripke_models/README.md](kripke_models/README.md)

### Integration
- **Simulacra Integration**: [SIMULACRA_INTEGRATION.md](SIMULACRA_INTEGRATION.md)
- **Current Visualizer**: [visualizer_canvas_simple/DESIGN.md](visualizer_canvas_simple/DESIGN.md)

---

## Questions?

For implementation questions:
- **Getting started**: See [mvp_docs/impl_plan.md](mvp_docs/impl_plan.md)
- **Tech stack choices**: See [mvp_docs/tech_design.md](mvp_docs/tech_design.md)
- **Model scope**: See [mvp_docs/model_design.md](mvp_docs/model_design.md)
- **Library options**: This document
- **Formal Methods**: See formal_models/ and logics/ documentation
- **AI2027 Scenarios**: https://ai-2027.com
