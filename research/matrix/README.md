# Matrix: The Modeling Test Bed

**"Welcome to the real world"** - A playground for experimenting with formal modeling approaches

**Purpose**: Matrix is the backend simulation engine and experimentation platform where we test, compare, and evaluate different modeling formalisms before integrating them into Simulacra.

---

## Vision

Matrix is **not** the end-user product. It's the **laboratory** where we:

1. **Experiment** with different formalisms (SD, ABM, HA, SHA, MDP, Kripke)
2. **Evaluate** approaches against real problems (see [../simulacra_integration/evals/](../simulacra_integration/evals/))
3. **Build** adapters that can plug into Simulacra or standalone tools
4. **Provide** power-user interfaces for researchers and modelers

**End products**:
- Simulacra TTX game (narrative-driven, LLM-enhanced)
- Standalone analysis tools (policy scenarios, risk assessment)
- Research prototypes (verification, optimization)

**Matrix role**: The engine room where all simulation logic lives, testable independently

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     THE ARCHITECT                       │
│  (Power User Interface: Configure, Test, Explore)       │
│                                                         │
│  - Choose formalism (SD, ABM, HA, etc.)                │
│  - Configure parameters, equations, agents              │
│  - Run simulations, view trajectories                   │
│  - Export models, save configurations                   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    MATRIX CORE                          │
│  (Simulation Engine + Adapters + Evaluation)            │
│                                                         │
│  Adapters:                                              │
│  - SystemDynamicsAdapter (Vensim-compatible)            │
│  - HybridAutomatonAdapter (scipy ODEs + guards)         │
│  - ABMAdapter (Mesa-compatible)                         │
│  - KripkeAdapter (model checking)                       │
│  - MDPAdapter (PRISM export)                            │
│                                                         │
│  Evaluation:                                            │
│  - Monte Carlo runner (1000s of trajectories)           │
│  - Sensitivity analysis                                 │
│  - Comparison across formalisms                         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                     VIEW SYSTEM                         │
│  (Package Models for Different Audiences)               │
│                                                         │
│  Views:                                                 │
│  - Simulacra View: LLM narrative + formal state        │
│  - Policy View: Scenarios, distributions, levers       │
│  - Research View: Full formal model, verification      │
│  - Education View: Interactive explainer               │
└─────────────────────────────────────────────────────────┘
```

---

## Components

### 1. The Architect ([the_architect/](the_architect/))

**Power user simulation builder** - all knobs and whistles

**Target users**: Researchers, modelers, us (the developers)

**Features**:
- **Model Builder**: Drag-drop modes, define flows, set guards
- **Formalism Switcher**: Start with SD, upgrade to HA, compare ABM
- **Parameter Tuner**: Sliders for all params, instant re-simulation
- **Trajectory Viewer**: Time-series, phase portraits, mode transitions
- **Export**: JSON configs, PRISM models, Python code

**Why "The Architect"**: This is where you **design the Matrix** - the simulation reality that others will experience through Views

---

### 2. Matrix Core ([adapters/](adapters/))

**Simulation engine** with pluggable adapters for different formalisms

**Key principle**: **Canonical contract** (same API for all adapters)

```python
class ModelAdapter(ABC):
    @abstractmethod
    def get_graph(self) -> GraphResponse:
        """Return nodes, edges, variables"""

    @abstractmethod
    def step(self, state: State, action: Action) -> State:
        """Advance simulation one step"""

    @abstractmethod
    def simulate(self, initial: State, horizon: int) -> Trajectory:
        """Run full trajectory"""

    # Optional (for HA, SHA)
    def evolve(self, mode: str, state: ContinuousState, duration: float) -> ContinuousState:
        """Integrate ODEs (continuous evolution)"""

    def check_guards(self, mode: str, state: State) -> List[Transition]:
        """Find enabled transitions"""
```

**Adapters**:
- `SystemDynamicsAdapter` - Discrete-time difference equations
- `HybridAutomatonAdapter` - Modes + ODEs + guards
- `StochasticHAAdapter` - HA + probabilistic transitions
- `ABMAdapter` - Heterogeneous agents
- `KripkeAdapter` - Pure discrete, for model checking
- `MDPAdapter` - Discrete + stochastic, PRISM export

**Evaluation harness**:
- Monte Carlo runner (parallel, cached)
- Sensitivity analysis (Sobol, Morris)
- Cross-formalism comparison (run same scenario with SD vs HA vs ABM)

---

### 3. View System ([views/](views/))

**Package Matrix models for different use cases**

**Key principle**: Same simulation engine, different **presentation layer**

#### View 1: Simulacra View
**Target**: TTX game players (policymakers, strategists)

**What they see**:
- Natural language scenario (LLM-generated)
- Action choices (cards, narrative)
- Outcomes (story + scores)

**What Matrix provides**:
- Formal state tracking (compute, trust, alignment)
- Mode detection (Baseline → Race → Crisis)
- Outcome generation (state → narrative via LLM)
- Property checking (did we violate safety constraints?)

**Integration**: Simulacra calls Matrix API for state updates, Matrix returns formal state + suggestions for LLM prompts

---

#### View 2: Policy View
**Target**: Policy analysts, decision-makers

**What they see**:
- Scenario dashboard (levers: funding, regulation, coordination)
- Distributions (P(catastrophe), P(aligned), expected time)
- Sensitivities (which levers matter most?)
- Comparison (Policy A vs Policy B outcomes)

**What Matrix provides**:
- Monte Carlo simulation (1000 runs per scenario)
- Aggregated statistics
- Confidence intervals
- Counterfactuals

---

#### View 3: Research View
**Target**: AI safety researchers, formal methods folks

**What they see**:
- Full formal model (modes, flows, guards, properties)
- Verification results (PRISM output, reachability bounds)
- Abstraction details (how continuous → discrete)
- Code/equations (export model to paper-ready format)

**What Matrix provides**:
- HA → MDP abstraction
- PRISM model export
- SpaceEx reachability (if implemented)
- LaTeX equation export

---

#### View 4: Education View
**Target**: Students, public, explainers

**What they see**:
- Interactive explainer (step through scenarios)
- Simplified visuals (stock-flow diagrams, agent animations)
- "What if" playground (tweak params, see outcomes)
- Guided tours (preset scenarios with explanations)

**What Matrix provides**:
- Simplified models (fewer modes, fewer vars)
- Preset scenarios (canonical examples)
- Slow-motion simulation (step-by-step control)

---

## Evaluation as First-Class

**Matrix treats evaluation like production code** - not an afterthought

### Evaluation Infrastructure

**Comparison harness**:
```python
class ComparisonRunner:
    def compare_formalisms(
        self,
        scenario: Scenario,
        formalisms: List[Formalism]  # [SD, HA, ABM, ...]
    ) -> ComparisonResults:
        """
        Run same scenario with different formalisms
        Return: execution time, outcome distributions, insights
        """
```

**Example usage**:
```python
scenario = AIRaceScenario(initial_compute=26.0, initial_trust=0.7)

results = compare_formalisms(
    scenario,
    formalisms=[
        SystemDynamics(dt=1_month),
        HybridAutomaton(dt=1_month, ode_method="euler"),
        AgentBasedModel(num_labs=20)
    ]
)

print(f"SD: P(catastrophe) = {results['SD'].p_catastrophe}")
print(f"HA: P(catastrophe) = {results['HA'].p_catastrophe}")
print(f"ABM: P(catastrophe) = {results['ABM'].p_catastrophe}")
# Expected: Similar results, validating abstraction
```

**Metrics library**:
- Time to catastrophe/alignment
- Mode transition probabilities
- Variable distributions (trust, alignment gap)
- Sensitivity indices (which params matter most)
- Execution time (speed benchmarks)

**Continuous evaluation**:
- Every commit runs benchmark suite
- Track performance regressions
- Validate that HA abstraction matches ABM emergent behavior

---

## Why "Matrix"?

**The Matrix movie metaphor works perfectly**:

1. **The Matrix (simulation)**: The formal model running behind the scenes
   - "What is real? How do you define real?" → What is the true state (formal vs narrative)?
   - Simulacra players see narrative, Matrix tracks formal state

2. **The Architect**: The power-user interface
   - "I am the Architect. I created the Matrix." → Build simulation worlds
   - Full control, all parameters exposed

3. **The Oracle**: Policy View
   - "You've already made the choice, you're here to understand why" → Scenario analysis
   - Shows possible futures, probabilities

4. **Neo's Training**: Education View
   - "I know kung fu" → Learn by doing in simplified sim
   - Step through scenarios, build intuition

5. **Agent Smith**: Evaluation Harness
   - "Never send a human to do a machine's job" → Automated testing
   - Relentlessly tests every scenario, finds failures

---

## Example Workflow

### Researcher Using The Architect

**Goal**: Test if hybrid automaton captures ABM dynamics

**Steps**:
1. Open The Architect
2. Load ABM model (20 AI labs, strategic decisions)
3. Run 1000 simulations → observe emergent modes (Race, Coordination, Fragmentation)
4. Build HA abstraction (3 modes, guards based on aggregate lab state)
5. Run 1000 simulations with HA → compare distributions
6. Evaluate: P(catastrophe | ABM) ≈ 35%, P(catastrophe | HA) ≈ 33% → Good match!
7. Export HA → use in Simulacra (lighter weight than full ABM)

---

### Policy Analyst Using Policy View

**Goal**: Compare export control policies

**Steps**:
1. Open Policy View
2. Select scenario: "US-China AI Race"
3. Configure Policy A: No export controls, free trade
4. Configure Policy B: Strict H100 chip export controls
5. Run comparison (1000 scenarios each)
6. View results:
   - Policy A: P(catastrophe) = 42%, P(aligned) = 35%
   - Policy B: P(catastrophe) = 28%, P(aligned) = 48%
7. Conclusion: Export controls reduce catastrophe risk by 14 percentage points

---

### Game Designer Using Simulacra View

**Goal**: Integrate formal state tracking into TTX

**Steps**:
1. Simulacra game starts: players select roles
2. Matrix initializes: `state = { mode: "Baseline", compute: 26.0, trust: 0.7 }`
3. Each round:
   - Players choose actions (via Simulacra UI)
   - Simulacra calls Matrix: `matrix.step(state, actions)`
   - Matrix returns: `new_state, mode_transition, property_violations`
   - Simulacra uses new_state to prompt LLM for narrative
   - LLM generates consequences (grounded in formal state)
4. End of game:
   - Matrix provides: trajectory, mode history, property status
   - Simulacra shows: "You violated trust floor in Round 3 → led to crisis"

---

## Tech Stack

**Language**: Python 3.11+ (type hints, dataclasses, async)

**Core Libraries**:
- `scipy` - ODE integration (solve_ivp)
- `numpy` - State vectors, arrays
- `networkx` - Graph structures (modes, transitions)
- `pydantic` - Data validation, serialization
- `fastapi` - REST API (for Simulacra, Policy View, etc.)

**Optional (Verification)**:
- `stormpy` - PRISM interface (probabilistic model checking)
- `z3-solver` - SMT solving (for guard synthesis, reachability)

**Frontend** (The Architect):
- Next.js + React
- React Flow (graph visualization)
- Recharts (time-series, distributions)
- Monaco Editor (code/equation editing)

**Deployment**:
- Docker (Matrix + The Architect)
- Kubernetes (if scaling needed)
- Vercel (for public-facing views)

---

## Roadmap

### Phase 1: Core Engine (Weeks 1-4)
- [ ] Canonical adapter interface
- [ ] SystemDynamicsAdapter (discrete-time)
- [ ] HybridAutomatonAdapter (Euler integration)
- [ ] Basic simulation API (step, simulate)
- [ ] JSON model serialization

### Phase 2: The Architect (Weeks 5-8)
- [ ] Model builder UI (drag-drop modes)
- [ ] Parameter tuning (sliders, instant re-sim)
- [ ] Trajectory visualization (charts)
- [ ] Export (JSON, Python, PRISM)

### Phase 3: Evaluation (Weeks 9-10)
- [ ] Monte Carlo runner (parallel)
- [ ] Sensitivity analysis (Sobol)
- [ ] Cross-formalism comparison
- [ ] Benchmark suite

### Phase 4: Views (Weeks 11-14)
- [ ] Simulacra View (API for TTX)
- [ ] Policy View (scenario dashboard)
- [ ] Research View (verification exports)
- [ ] Education View (interactive explainer)

### Phase 5: Advanced (Weeks 15+)
- [ ] ABMAdapter (Mesa integration)
- [ ] StochasticHAAdapter (probabilistic guards)
- [ ] PRISM integration (exact model checking)
- [ ] SpaceEx integration (reachability analysis)

---

## Related Documentation

### Evaluation Framework
- [../simulacra_integration/evals/](../simulacra_integration/evals/) - Comprehensive comparison of modeling approaches
  - `README.md` - Overview, three-tier architecture
  - `comparison_matrix.md` - Quantitative scoring (15 formalisms)
  - `qualitative_analysis.md` - Strengths, weaknesses, synthesis
  - `macro_alternatives.md` - SD vs ABM vs HA vs DEVS for macro
  - `discrete_time_modeling.md` - Pragmatic discrete-time simulation
  - `use_case_portability.md` - Extending to climate, pandemic, finance

### Simulacra Integration
- [../simulacra_integration/](../simulacra_integration/) - How Matrix integrates with Simulacra TTX
  - Formal state tracking during gameplay
  - Mode detection (detect when race starts)
  - Property monitoring (safety violations)
  - LLM guidance (use formal state to constrain narrative)

### MVP Documentation
- [../ai_futures/mvp_docs/](../ai_futures/mvp_docs/) - Original MVP design
  - `model_design.md` - Hybrid automaton approach
  - `tech_design.md` - Canonical contract, API design
  - `impl_plan.md` - Week-by-week roadmap

### Hybrid Automata Framework
- [../ai_futures/hybrid_automata/](../ai_futures/hybrid_automata/) - Formal foundations
  - `framework.md` - HA definitions, semantics
  - `integration.md` - SD+ABM+HA coupling
  - `tools_and_verification.md` - PRISM workflows
  - `examples/` - Fisheries, epidemic, AI governance specs

---

## Get Started

### For Researchers
```bash
cd research/matrix
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run example
python examples/ai_race_ha.py
```

### For Developers
```bash
# Run Matrix API
cd research/matrix
uvicorn matrix.api:app --reload

# Open The Architect
cd the_architect
npm install
npm run dev
# Visit http://localhost:3000
```

### For Evaluators
```python
from matrix.evaluation import ComparisonRunner
from matrix.scenarios import AIRaceScenario

runner = ComparisonRunner()
results = runner.compare_formalisms(
    AIRaceScenario(),
    ["SD", "HA", "ABM"]
)
results.plot()  # Side-by-side comparison
```

---

**Status**: Design phase → Implementation starting

**Next**: Build core adapters (SD, HA), validate with AI-2027 scenario, deploy first version of The Architect

**Philosophy**: Matrix is the **laboratory**, Simulacra is the **product**. We build everything in Matrix first, test exhaustively, then package for specific audiences via Views.
