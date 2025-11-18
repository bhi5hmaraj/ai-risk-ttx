# The Architect: Power User Simulation Builder

**"The Matrix is everywhere. It is all around us."** - Build and explore simulation realities

**Purpose**: Power-user interface for designing, configuring, and testing formal models - **all knobs and whistles exposed**

---

## Philosophy

**The Architect is NOT for end-users**. It's for:
- Researchers building models
- Developers testing Matrix components
- Us (the team) experimenting with approaches

**Analogy**: If Simulacra is the iPhone (polished, constrained, intuitive), The Architect is the development kit (powerful, complex, flexible)

**Design principle**: **Show everything, hide nothing**. If it exists in Matrix, you can tweak it in The Architect.

---

## Features

### 1. Model Builder

**Visual construction** of simulation models

**Modes**:
- Drag nodes onto canvas (= modes/states)
- Draw edges (= transitions/guards)
- Double-click to configure

**Configuration panels**:
```
Node (Mode) Properties:
├─ ID: "race"
├─ Label: "Race to AGI"
├─ Atomic Props: ["racing", "high_risk"]
├─ Flow Equations: (if HA)
│  ├─ dC/dt = 1.5 * C + I_investment
│  ├─ dA/dt = 0.05 * (1 - A) - 0.1 * (C - 10*A)
│  └─ dT/dt = -0.05 * T
├─ Invariant: "trust >= 0.3"  (must hold while in mode)
└─ Data: { ... custom fields ... }

Edge (Transition) Properties:
├─ ID: "race_trigger"
├─ From: "baseline"
├─ To: "race"
├─ Guard: "compute > 26.5 && evidence < 3"
├─ Probability: null  (deterministic)
├─ Reset: { evidenceCount: 0 }  (on transition)
└─ Label: "Race Starts"
```

**Smart defaults**:
- New mode → copy flow from selected template
- New edge → suggest guards based on variable ranges
- Auto-layout → Dagre algorithm

**Validation**:
- Real-time syntax check (ODEs, guards)
- Type checking (compute must be float)
- Reachability warnings ("Mode X is unreachable")

---

### 2. Formalism Switcher

**Switch between modeling formalisms seamlessly**

**Workflow**:
1. Start simple: Build FSM (just modes + transitions)
2. Add complexity: Upgrade to HA (add flow equations)
3. Add uncertainty: Upgrade to SHA (add probabilities)
4. Compare: Run same scenario with all three

**UI**:
```
Formalism: [FSM ▼]  →  [HA ▼]  →  [SHA ▼]

When upgrading FSM → HA:
- "Your 5 modes are preserved"
- "Add flow equations for each mode"
- [Auto-generate flows...] button (suggests ODEs based on variables)

When upgrading HA → SHA:
- "Your modes and flows are preserved"
- "Add probabilities to edges"
- [Uniform probs] or [Expert elicitation] options
```

**Downgrade warnings**:
```
HA → FSM: ⚠️ Continuous variables (compute, alignment) will be discretized.
          Choose discretization: [Coarse (3 bins)] [Fine (10 bins)] [Custom]

SHA → HA: ⚠️ Probabilistic transitions will become deterministic.
          Choose: [Most likely branch] [Weighted average] [Keep all, nondeterministic]
```

---

### 3. Parameter Tuner

**Interactive control of all parameters**

**Layout**:
```
┌─ Parameters ─────────────────────────────────────┐
│                                                  │
│  Initial Conditions                              │
│  ├─ compute:     [●─────────] 26.0  [24-30]     │
│  ├─ alignment:   [●─────────] 0.15  [0-1]       │
│  └─ trust:       [●─────────] 0.70  [0-1]       │
│                                                  │
│  Flow Parameters (Race mode)                     │
│  ├─ growth_rate: [●─────────] 0.15  [0-0.3]     │
│  ├─ align_lag:   [●─────────] 0.05  [0-0.1]     │
│  └─ trust_decay: [●─────────] 0.05  [0-0.1]     │
│                                                  │
│  Guard Thresholds                                │
│  ├─ race_trigger: [●─────────] 26.5 [24-28]     │
│  ├─ crisis_trust: [●─────────] 0.3  [0-1]       │
│  └─ pause_evidence: [●─────────] 3  [1-5]       │
│                                                  │
│  [Reset to defaults] [Save preset] [Load preset] │
│                                                  │
│  Auto-update: [✓] Simulate on slider change      │
│                   (debounced 500ms)              │
└──────────────────────────────────────────────────┘
```

**Features**:
- **Live updates**: Change slider → simulation re-runs → charts update
- **Presets**: Save/load parameter sets ("Optimistic", "Pessimistic", "Base case")
- **Bounds**: Enforce realistic ranges (can't set trust > 1.0)
- **Sensitivity mode**: Lock all but one param, sweep to see impact

---

### 4. Trajectory Viewer

**Rich visualization** of simulation outputs

**Views**:

#### Time Series
```
┌─ Time Series ────────────────────────────────────┐
│                                                  │
│   1.0 ┤                                          │
│       │     ╭─Alignment                          │
│   0.8 ┤   ╭─╯                                    │
│       │  ╭╯   ╲                                  │
│   0.6 ┤─╯      ╲ Trust                           │
│       │         ╲                                 │
│   0.4 ┤          ╲                                │
│       │           ╲                               │
│   0.2 ┤            ╲                              │
│       │             ╰─────                        │
│   0.0 ┤                                          │
│       └┬────┬────┬────┬────┬────┬────┬───→ time │
│        0    20   40   60   80  100  120 months  │
│                                                  │
│   Mode: [Baseline][Race      ][Crisis ]         │
│         └─ 0-24 ─┴─ 24-89 ──┴─ 89-120           │
│                                                  │
│   Variables: [✓] Compute [✓] Alignment [✓] Trust│
│   Show: [✓] Mode transitions (vertical lines)    │
└──────────────────────────────────────────────────┘
```

#### Phase Portrait (2D)
```
┌─ Phase Portrait: Alignment vs Compute ───────────┐
│                                                  │
│ Alignment                                        │
│   1.0 ┤         ◉ Final state                    │
│       │        ╱                                  │
│   0.8 ┤       ╱   ← trajectory                   │
│       │      ╱                                    │
│   0.6 ┤     ╱                                     │
│       │    ╱                                      │
│   0.4 ┤   ╱                                       │
│       │  ╱                                        │
│   0.2 ┤ ╱   ◯ Initial state                      │
│       │╱                                          │
│   0.0 ┤                                           │
│       └┬────┬────┬────┬────┬────┬────┬───→       │
│       24   25   26   27   28   29   30  Compute  │
│                                                  │
│   Color by: [Mode ▼] (Baseline=blue, Race=red)  │
│   Show: [✓] Nullclines (dX/dt=0, dY/dt=0)       │
└──────────────────────────────────────────────────┘
```

#### Mode Timeline
```
┌─ Mode Timeline ──────────────────────────────────┐
│                                                  │
│   Baseline ████████▓▓▓▓                          │
│   Race            ▓▓▓▓████████████████▓▓▓▓        │
│   Slowdown                               ▓▓▓▓     │
│   Pause                                      ████ │
│   Crisis                                          │
│   Catastrophe                                     │
│   Aligned                                         │
│            ├────┬────┬────┬────┬────┬────┬───→   │
│            0    20   40   60   80  100  120 months│
│                                                  │
│   ▓▓▓▓ Transition period  ████ Stable in mode    │
└──────────────────────────────────────────────────┘
```

#### Distribution View (Monte Carlo)
```
┌─ Outcome Distribution (N=1000 runs) ─────────────┐
│                                                  │
│   Catastrophe   ████████████ 35%                 │
│   Aligned       ████████████████ 45%             │
│   Ongoing       ████ 12%                         │
│   Crisis        ██ 8%                            │
│                                                  │
│   Time to Alignment (for successful runs):       │
│      Median: 78 months                           │
│      Q1-Q3: [52, 95] months                      │
│      Mean: 74 ± 23 months (95% CI)               │
│                                                  │
│   [Export CSV] [Show histogram] [Compare runs]   │
└──────────────────────────────────────────────────┘
```

---

### 5. Comparison Mode

**Side-by-side formalism comparison**

**Workflow**:
1. Define scenario (initial state, parameters)
2. Select formalisms: [SD] [HA] [ABM]
3. Run all (parallel execution)
4. View comparison

**Output**:
```
┌─ Comparison: SD vs HA vs ABM ────────────────────┐
│                                                  │
│  Metric           │ SD      │ HA      │ ABM      │
│  ─────────────────┼─────────┼─────────┼──────────│
│  P(Catastrophe)   │ 35%     │ 33%     │ 38%      │ ✓ Agreement
│  P(Aligned)       │ 45%     │ 48%     │ 42%      │ ✓ Close
│  Median time      │ 78 mo   │ 76 mo   │ 82 mo    │ ✓ Close
│  Exec time        │ 0.2s    │ 1.3s    │ 45s      │ SD fastest
│  ─────────────────┼─────────┼─────────┼──────────│
│  Fidelity         │ Low     │ Medium  │ High     │ (heterogeneity)
│  Verification     │ No      │ Yes     │ No       │ (HA only)
│                                                  │
│  ✓ All approaches agree on macro outcomes        │
│  → HA is sweet spot (verification + speed)       │
│                                                  │
│  [Export report] [Save comparison]               │
└──────────────────────────────────────────────────┘
```

**Use case**: Validate that HA abstraction captures ABM emergent behavior

---

### 6. Code View

**Inspect and edit raw model definition**

**Tabs**:
```
[Visual] [JSON] [Python] [PRISM] [LaTeX]

JSON Tab:
───────────────────────────────────────────
{
  "meta": {
    "id": "ai-2027-race",
    "name": "AI-2027: Race to AGI",
    "modelType": "hybrid_automaton",
    "timeModel": "hybrid"
  },
  "modes": [
    {
      "id": "race",
      "label": "Race",
      "flow": {
        "equations": [
          "dC/dt = 1.5 * C + 2.0",
          "dA/dt = 0.05 * (1 - A)",
          "dT/dt = -0.05 * T"
        ]
      },
      "invariant": "T >= 0.3"
    }
  ],
  "guards": [
    {
      "from": "baseline",
      "to": "race",
      "condition": "C > 26.5 && evidence < 3"
    }
  ]
}
───────────────────────────────────────────

Python Tab:
───────────────────────────────────────────
from matrix.adapters import HybridAutomatonAdapter

ha = HybridAutomatonAdapter.from_json("ai-2027-race.json")

# Or define programmatically
ha = HybridAutomatonAdapter(
    modes=["baseline", "race", "pause"],
    flows={
        "race": lambda x: {
            "compute": 1.5 * x["compute"],
            "alignment": 0.05 * (1 - x["alignment"]),
            "trust": -0.05 * x["trust"]
        }
    },
    guards=[
        Guard("baseline", "race", lambda x: x["compute"] > 26.5)
    ]
)

trajectory = ha.simulate(initial_state, horizon=120)
───────────────────────────────────────────
```

**Features**:
- **Live sync**: Edit JSON → Visual updates, Visual → JSON updates
- **Export**: Copy Python code, download JSON, export PRISM
- **Import**: Load JSON, paste Python (if well-formed)

---

### 7. Evaluation Suite

**Built-in analysis tools**

#### Sensitivity Analysis
```
┌─ Sensitivity Analysis ───────────────────────────┐
│                                                  │
│  Output: P(Catastrophe)                          │
│  Method: [Sobol indices ▼]                       │
│  Samples: [10000 ▼]                              │
│                                                  │
│  First-order indices (direct effect):            │
│  ┌────────────────────────┐                      │
│  │ trust_threshold  ████████████████████ 0.45    │
│  │ growth_rate      ████████████ 0.28            │
│  │ alignment_lag    ██████ 0.15                  │
│  │ initial_trust    ███ 0.08                     │
│  │ initial_compute  █ 0.04                       │
│  └────────────────────────┘                      │
│                                                  │
│  Total-order indices (incl. interactions):       │
│  ┌────────────────────────┐                      │
│  │ trust_threshold  ████████████████████ 0.52    │
│  │ growth_rate      █████████████████ 0.38       │
│  │ alignment_lag    ████████ 0.19                │
│  └────────────────────────┘                      │
│                                                  │
│  → trust_threshold is the most influential       │
│  → Growth rate + trust interact strongly         │
│                                                  │
│  [Export CSV] [Plot scatter]                     │
└──────────────────────────────────────────────────┘
```

#### Property Checker
```
┌─ Property Checker ───────────────────────────────┐
│                                                  │
│  Properties:                                     │
│  [✓] P1: AG (trust > 0.3)                        │
│       "Always maintain trust above 30%"          │
│       Status: ❌ Violated in 23% of runs         │
│       First violation: t=67 months, trust=0.28   │
│                                                  │
│  [✓] P2: P_≤0.05 [F catastrophe]                 │
│       "Catastrophe risk below 5%"                │
│       Status: ❌ Violated: P = 0.35              │
│       Counterexample: [Show trajectory...]       │
│                                                  │
│  [✓] P3: F (mode = aligned)                      │
│       "Eventually reach aligned state"           │
│       Status: ✓ Satisfied in 45% of runs         │
│       Mean time: 78 months                       │
│                                                  │
│  [Add property...] [Run verification]            │
└──────────────────────────────────────────────────┘
```

---

## User Workflows

### Workflow 1: Build HA from Scratch

1. **Create project**: "AI-2027 Race"
2. **Add modes**: Baseline, Race, Pause, Catastrophe, Aligned
3. **Define variables**: compute (26.0), alignment (0.15), trust (0.70)
4. **Add flows** (per mode):
   - Race: fast compute growth, slow alignment, trust decay
   - Pause: no compute growth, fast alignment, trust depends on legitimacy
5. **Add guards**:
   - Baseline → Race: compute > 26.5
   - Race → Pause: evidence >= 3 && trust > 0.4
   - Race → Catastrophe: trust < 0.3
6. **Set parameters**: growth rates, thresholds
7. **Run simulation**: 120 ticks (10 years)
8. **View trajectory**: See mode transitions, trust decay
9. **Iterate**: Tweak guards, re-run
10. **Export**: Save JSON, copy Python code

---

### Workflow 2: Compare SD vs HA

1. **Load scenario**: "AI-2027 Race"
2. **Switch to SD**: Formalism → System Dynamics
   - Modes become IF-THEN branches
   - Flows become difference equations
3. **Switch to HA**: Formalism → Hybrid Automaton
   - IF-THEN branches become guards
   - Difference equations become ODEs (or stay discrete if dt > 0)
4. **Run comparison**: [Compare] button
5. **View results**:
   - SD: P(catastrophe) = 35%, runtime = 0.2s
   - HA: P(catastrophe) = 33%, runtime = 1.3s
6. **Conclusion**: Both agree, HA adds formal structure for verification

---

### Workflow 3: Sensitivity Analysis

1. **Load model**: "AI-2027 Race"
2. **Open Evaluation**: Sensitivity tab
3. **Select output**: P(Catastrophe)
4. **Select method**: Sobol indices
5. **Set ranges**: All parameters ±20% from defaults
6. **Run**: 10,000 samples (takes ~2 minutes)
7. **View results**: Trust threshold = 0.45 (most important), growth rate = 0.28
8. **Iterate**: Tighten trust threshold, re-run
9. **Export**: CSV for paper, plots for presentation

---

## Technical Architecture

### Frontend Stack

**Framework**: Next.js 14 (App Router)

**Key libraries**:
- `reactflow` - Graph visualization (modes as nodes)
- `recharts` - Time series, distributions
- `monaco-editor` - Code editing (JSON, Python)
- `zustand` - State management
- `tanstack-query` - Data fetching, caching

**State structure**:
```typescript
interface ArchitectState {
  project: {
    id: string;
    name: string;
    formalism: "FSM" | "HA" | "SHA" | "SD" | "ABM";
  };
  model: {
    modes: Mode[];
    edges: Edge[];
    variables: Variable[];
    parameters: Parameter[];
  };
  simulation: {
    state: State;
    trajectory: Trajectory;
    running: boolean;
  };
  ui: {
    selectedNode: NodeId | null;
    selectedEdge: EdgeId | null;
    view: "graph" | "params" | "trajectory" | "code";
  };
}
```

---

### Backend Integration

**Matrix API**:
```typescript
// The Architect calls Matrix via REST

// Get model graph
GET /models/{model_id}/graph
→ GraphResponse

// Update model
PUT /models/{model_id}
← ModelDefinition

// Run simulation
POST /simulate/trajectory
{
  model_id: "ai-2027-race",
  initial_state: {...},
  horizon: 120
}
→ Trajectory

// Compare formalisms
POST /evaluate/compare
{
  scenario_id: "ai-race",
  formalisms: ["SD", "HA", "ABM"]
}
→ ComparisonResults
```

**Real-time updates** (WebSocket):
```typescript
// Long-running simulations (Monte Carlo)
ws://matrix/simulate/stream

Client → Server:
{
  "type": "start",
  "model_id": "ai-2027",
  "runs": 1000
}

Server → Client (streaming):
{
  "type": "progress",
  "completed": 250,
  "total": 1000
}

Server → Client (final):
{
  "type": "complete",
  "results": {...}
}
```

---

## Installation & Setup

### Prerequisites
- Node.js 20+
- Python 3.11+ (for Matrix backend)
- Docker (optional, for isolated setup)

### Quick Start

```bash
# Clone repo
cd research/matrix/the_architect

# Install dependencies
npm install

# Configure API endpoint
echo "NEXT_PUBLIC_MATRIX_API=http://localhost:8000" > .env.local

# Start Matrix backend (in separate terminal)
cd ../
python -m matrix.api

# Start The Architect
npm run dev

# Open http://localhost:3000
```

---

## Roadmap

### MVP (Week 1-4)
- [ ] Graph editor (drag modes, draw edges)
- [ ] Parameter panel (sliders)
- [ ] Basic simulation (step, run)
- [ ] Time series viewer
- [ ] JSON import/export

### V1 (Week 5-8)
- [ ] Formalism switcher (FSM ↔ HA)
- [ ] Code view (JSON, Python)
- [ ] Monte Carlo mode (1000 runs)
- [ ] Distribution viewer
- [ ] Presets (save/load configs)

### V2 (Week 9-12)
- [ ] Comparison mode (SD vs HA vs ABM)
- [ ] Sensitivity analysis (Sobol)
- [ ] Property checker (temporal logic)
- [ ] Phase portrait viewer
- [ ] PRISM export

### V3 (Future)
- [ ] Collaborative editing (multi-user)
- [ ] Version control (model history)
- [ ] AI assistant (suggest flows, guards)
- [ ] Gallery (community models)

---

## Related Documentation

- [../README.md](../README.md) - Matrix overview
- [../views/](../views/) - View system (Simulacra, Policy, Research, Education)
- [../adapters/](../adapters/) - Adapter implementations
- [../../simulacra_integration/evals/](../../simulacra_integration/evals/) - Evaluation framework

---

**Status**: Design phase → MVP implementation starting

**Next Steps**:
1. Implement graph editor (React Flow)
2. Connect to Matrix API
3. Build parameter panel
4. Deploy first prototype

**Vision**: The Architect is where researchers **build the Matrix**. Once built, different **Views** package it for different audiences (game players, policy analysts, students). Power and flexibility in The Architect, polish and constraints in the Views.
