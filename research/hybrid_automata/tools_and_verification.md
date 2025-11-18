# Tools and Verification Workflows

**Practical guide to verifying hybrid automata with existing tools**

---

## 1. Overview

Verifying hybrid automata requires:

1. **ODE integration** (continuous evolution in modes)
2. **Discrete-event simulation** (mode transitions)
3. **Abstraction** (continuous → finite state)
4. **Model checking** (temporal logic verification)

This doc covers:
- Tools for each step
- Complete workflows for different verification goals
- AI-2027 specific examples

---

## 2. Tool Landscape

### 2.1 Hybrid System Simulators

| Tool | Language | Strengths | Use Case |
|------|----------|-----------|----------|
| **SpaceEx** | C++ | Reachability analysis, supports linear HA | Formal bounds on reachable sets |
| **Flow*** | C++ | Nonlinear ODEs, Taylor models | High-precision reachability |
| **PHAVer** | C++ | Polyhedral abstractions | Linear hybrid automata verification |
| **HyCreate** | Matlab | GUI-based HA construction | Rapid prototyping |
| **scipy.integrate** (Python) | Python | General ODE solver | Custom HA simulation |

### 2.2 Model Checkers

| Tool | Input Format | Properties | Use Case |
|------|--------------|------------|----------|
| **PRISM** | PRISM lang | PCTL, LTL, CTL | Probabilistic model checking |
| **Storm** | PRISM/JANI | PCTL, LTL | High-performance probabilistic MC |
| **NuSMV** | SMV | LTL, CTL | Symbolic model checking (BDDs) |
| **SPIN** | Promela | LTL | Explicit-state, good for concurrency |
| **UPPAAL** | Timed automata XML | TCTL | Timed systems verification |

### 2.3 Abstraction Tools

| Tool | Method | Output |
|------|--------|--------|
| **SCOTS** | Symbolic control | Finite abstraction of HA |
| **PESSOA** | LTL games | Controller synthesis |
| **Manual (custom script)** | Predicate abstraction | MDP in PRISM format |

---

## 3. Workflow A: Simulation-Based Exploration

**Goal**: Understand typical behaviors, debug model, visualize trajectories

**When to use**: Early development, parameter tuning, demonstrations

### 3.1 Steps

1. **Implement HA in Python**

```python
import numpy as np
from scipy.integrate import odeint

class HybridAutomaton:
    def __init__(self, modes, flows, guards, resets, initial):
        self.modes = modes
        self.flows = flows  # Dict: mode -> flow function
        self.guards = guards  # List: (from_mode, to_mode, guard_fn)
        self.resets = resets  # Dict: (from,to) -> reset_fn
        self.mode = initial[0]
        self.x = np.array(initial[1])
        self.time = 0.0

    def step(self, dt):
        # Integrate ODEs in current mode
        flow = self.flows[self.mode]
        t_span = [0, dt]
        sol = odeint(lambda x, t: flow(x), self.x, t_span)
        self.x = sol[-1]
        self.time += dt

        # Check guards
        for (from_mode, to_mode, guard) in self.guards:
            if from_mode == self.mode and guard(self.x, self.time):
                # Fire transition
                reset = self.resets.get((from_mode, to_mode), lambda x: x)
                self.x = reset(self.x)
                self.mode = to_mode
                break

    def simulate(self, T, dt=0.1):
        trajectory = [(self.time, self.mode, self.x.copy())]
        while self.time < T:
            self.step(dt)
            trajectory.append((self.time, self.mode, self.x.copy()))
        return trajectory
```

2. **Define AI-2027 example**

```python
# Modes
modes = ['baseline', 'race', 'pause', 'aligned', 'catastrophe']

# Flows (simplified)
def flow_race(x):
    C, A, T = x
    return np.array([
        1.5 * C,           # Fast compute growth
        0.05 * (1 - A),    # Slow alignment
        -0.05 * T          # Trust erodes
    ])

def flow_pause(x):
    C, A, T = x
    return np.array([
        0.0,               # No compute growth
        0.6 * (1 - A),     # Fast alignment research
        -0.02 * T          # Slow trust erosion
    ])

flows = {
    'race': flow_race,
    'pause': flow_pause,
    # ... other modes
}

# Guards
def guard_race_to_pause(x, t):
    C, A, T = x
    evidence = (C - 10*A) > 5  # Alignment gap
    return evidence and T > 0.4  # Trust still sufficient

guards = [
    ('baseline', 'race', lambda x, t: t > 8),  # Race starts at t=8
    ('race', 'pause', guard_race_to_pause),
    # ... other guards
]

# Resets (mostly identity)
resets = {}

# Initial state
initial = ('baseline', [26.0, 0.15, 0.70])

# Simulate
ha = HybridAutomaton(modes, flows, guards, resets, initial)
trajectory = ha.simulate(T=20, dt=0.1)
```

3. **Visualize**

```python
import matplotlib.pyplot as plt

times = [t for t, m, x in trajectory]
modes_over_time = [m for t, m, x in trajectory]
compute = [x[0] for t, m, x in trajectory]
alignment = [x[1] for t, m, x in trajectory]
trust = [x[2] for t, m, x in trajectory]

fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))

# Continuous state
ax1.plot(times, compute, label='Compute')
ax1.plot(times, alignment, label='Alignment')
ax1.plot(times, trust, label='Trust')
ax1.set_xlabel('Time')
ax1.set_ylabel('Value')
ax1.legend()
ax1.grid(True)

# Mode over time
mode_ids = {m: i for i, m in enumerate(modes)}
mode_values = [mode_ids[m] for m in modes_over_time]
ax2.step(times, mode_values, where='post')
ax2.set_yticks(range(len(modes)))
ax2.set_yticklabels(modes)
ax2.set_xlabel('Time')
ax2.set_ylabel('Mode')
ax2.grid(True)

plt.tight_layout()
plt.show()
```

### 3.2 Advantages

- Fast prototyping
- Easy to debug (inspect trajectories)
- Good for demos and stakeholder communication

### 3.3 Limitations

- Only explores sample paths (not exhaustive)
- No guarantees (might miss rare but critical behaviors)
- Requires manual inspection

---

## 4. Workflow B: Abstraction + Model Checking

**Goal**: Formal verification of temporal logic properties

**When to use**: Need guarantees, safety-critical properties

### 4.1 Steps

#### Step 1: Discretize Continuous State

**Partition each variable into regions**:

```python
def discretize_compute(C):
    if C < 26.5: return 'low'
    elif C < 27.5: return 'medium'
    else: return 'high'

def discretize_alignment(A):
    if A < 0.3: return 'low'
    elif A < 0.7: return 'medium'
    else: return 'high'

def discretize_trust(T):
    if T < 0.4: return 'low'
    elif T < 0.7: return 'medium'
    else: return 'high'

def abstract_state(mode, x):
    C, A, T = x
    return (
        mode,
        discretize_compute(C),
        discretize_alignment(A),
        discretize_trust(T)
    )
```

#### Step 2: Build Finite MDP

**Sample transitions from HA to build MDP**:

```python
import itertools
from collections import defaultdict

modes = ['baseline', 'race', 'pause', 'aligned', 'catastrophe']
compute_regions = ['low', 'medium', 'high']
alignment_regions = ['low', 'medium', 'high']
trust_regions = ['low', 'medium', 'high']

# All abstract states
abstract_states = list(itertools.product(
    modes, compute_regions, alignment_regions, trust_regions
))

# Sample transitions
transition_counts = defaultdict(lambda: defaultdict(int))

for _ in range(10000):  # Monte Carlo sampling
    # Sample initial continuous state from abstract region
    s_abstract = random.choice(abstract_states)
    mode, C_region, A_region, T_region = s_abstract

    C = sample_from_region(C_region, [26, 28])
    A = sample_from_region(A_region, [0, 1])
    T = sample_from_region(T_region, [0, 1])

    # Simulate one HA step
    ha = HybridAutomaton(modes, flows, guards, resets, (mode, [C, A, T]))
    ha.step(dt=1.0)  # 1 time unit

    # Abstract successor state
    s_next_abstract = abstract_state(ha.mode, ha.x)

    # Record transition
    transition_counts[s_abstract][s_next_abstract] += 1

# Normalize to probabilities
mdp_transitions = {}
for s, successors in transition_counts.items():
    total = sum(successors.values())
    mdp_transitions[s] = {
        s_next: count / total
        for s_next, count in successors.items()
    }
```

#### Step 3: Export to PRISM

```python
def export_to_prism(mdp_transitions, filename):
    with open(filename, 'w') as f:
        f.write("mdp\n\n")

        # State encoding
        f.write("module ai_governance\n")
        f.write("    mode : [0..4] init 0; // 0=baseline, 1=race, ...\n")
        f.write("    C_region : [0..2] init 0; // 0=low, 1=med, 2=high\n")
        f.write("    A_region : [0..2] init 0;\n")
        f.write("    T_region : [0..2] init 1; // Start at medium trust\n\n")

        # Transitions
        for s, successors in mdp_transitions.items():
            mode, C_r, A_r, T_r = s
            mode_id = modes.index(mode)
            C_id = compute_regions.index(C_r)
            A_id = alignment_regions.index(A_r)
            T_id = trust_regions.index(T_r)

            f.write(f"    [step] mode={mode_id} & C_region={C_id} & A_region={A_id} & T_region={T_id} ->\n")

            for s_next, prob in successors.items():
                mode_next, C_r_next, A_r_next, T_r_next = s_next
                mode_next_id = modes.index(mode_next)
                C_next_id = compute_regions.index(C_r_next)
                A_next_id = alignment_regions.index(A_r_next)
                T_next_id = trust_regions.index(T_r_next)

                f.write(f"        {prob:.4f} : (mode'={mode_next_id}) & (C_region'={C_next_id}) & "
                        f"(A_region'={A_next_id}) & (T_region'={T_next_id}) +\n")

            f.write("    ;\n\n")

        f.write("endmodule\n\n")

        # Labels
        f.write('label "catastrophe" = mode=4;\n')
        f.write('label "aligned" = mode=3;\n')
        f.write('label "safe_trust" = T_region>=1;\n')

export_to_prism(mdp_transitions, 'ai2027.prism')
```

#### Step 4: Write Property Specifications

Create `ai2027.props`:

```prism
// Safety: Never catastrophe
Pmin=? [ F "catastrophe" ]
Pmax=? [ F "catastrophe" ]

// Liveness: Eventually aligned
Pmin=? [ F "aligned" ]
Pmax=? [ F "aligned" ]

// Bounded: Align within 10 steps
Pmin=? [ F<=10 "aligned" ]

// Until: Safe trust until aligned
P=? [ "safe_trust" U "aligned" ]

// Expected time to alignment
R{"time"}min=? [ F "aligned" ]
```

#### Step 5: Run PRISM

```bash
prism ai2027.prism ai2027.props -exportresults results.txt
```

**Example output**:
```
Property: Pmin=? [ F "catastrophe" ]
Result: 0.047 (exact)

Property: Pmin=? [ F "aligned" ]
Result: 0.523 (exact)

Property: R{"time"}min=? [ F "aligned" ]
Result: 8.3 (approx)
```

### 4.2 Advantages

- Formal guarantees (covers all possible behaviors)
- Quantitative results (exact probabilities)
- Can check complex temporal properties

### 4.3 Limitations

- Abstraction may be conservative (false positives)
- State explosion (coarse abstraction → imprecise; fine → too large)
- Requires careful validation of abstraction

---

## 5. Workflow C: Reachability Analysis (SpaceEx/Flow*)

**Goal**: Compute exact or over-approximate reachable sets

**When to use**: Safety verification, continuous dynamics critical

### 5.1 SpaceEx Example

**Model definition** (SpaceEx XML format):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<sspaceex xmlns="http://www-verimag.imag.fr/xml-namespaces/sspaceex">
  <component id="ai_governance">
    <param name="C" type="real" dynamics="any" />
    <param name="A" type="real" dynamics="any" />
    <param name="T" type="real" dynamics="any" />

    <location id="race">
      <invariant>T &gt;= 0.3</invariant>
      <flow>C' == 1.5*C &amp; A' == 0.05*(1-A) &amp; T' == -0.05*T</flow>
    </location>

    <location id="pause">
      <flow>C' == 0 &amp; A' == 0.6*(1-A) &amp; T' == -0.02*T</flow>
    </location>

    <transition source="race" target="pause">
      <guard>C - 10*A &gt; 5 &amp; T &gt; 0.4</guard>
      <assignment>C' == C &amp; A' == A &amp; T' == T</assignment>
    </transition>
  </component>
</sspaceex>
```

**Configuration file** (scenario.cfg):

```ini
system = ai_governance

initially = "race & C>=26 & C<=26.1 & A>=0.14 & A<=0.16 & T>=0.69 & T<=0.71"

forbidden = "catastrophe"

time-horizon = 20

sampling-time = 0.1

output-variables = "C, A, T"
```

**Run SpaceEx**:

```bash
spaceex -g scenario.cfg -m ai_governance.xml -o results/
```

**Output**: Reachable set at each time step (plotted as polytopes or zonotopes).

### 5.2 Interpreting Results

- **Safe**: Forbidden states not in reachable set → Property holds
- **Unsafe**: Reachable set intersects forbidden → Potential violation
- **Unknown**: Overapproximation too coarse → Refine

---

## 6. Tool Combinations

### 6.1 Simulation + Model Checking

1. **Simulate** to understand typical behavior, identify critical regions
2. **Discretize** based on simulation insights
3. **Model check** abstraction for formal guarantees
4. **Validate** by comparing simulation and model checking results

**Example**: If simulation never reaches catastrophe, but model checker says P(catastrophe) = 0.05, investigate:
- Is abstraction too coarse?
- Did simulation miss rare events?

### 6.2 SpaceEx + PRISM

1. **SpaceEx** computes reachable set bounds
2. Use bounds to **refine abstraction** regions
3. **PRISM** checks probabilistic properties on refined MDP

**Example**: SpaceEx proves alignment ∈ [0.1, 0.8] in race mode → Use 4 regions instead of 3.

---

## 7. AI-2027 Verification Goals

### 7.1 Property Suite

```prism
// P1: Catastrophe risk below 5%
const double p_cat_max = 0.05;
P<=p_cat_max [ F "catastrophe" ]

// P2: Alignment eventually achieved with >50% probability
const double p_aligned_min = 0.5;
P>=p_aligned_min [ F "aligned" ]

// P3: Trust never falls below critical threshold
P>=0.95 [ G "safe_trust" ]

// P4: If pause triggered, success within 5 years
P=? [ "pause" => F<=5 "aligned" ]

// P5: Expected time to alignment
R{"time"}=? [ F "aligned" ]

// P6: Counterfactual: If never race, P(catastrophe)?
// (Requires separate model variant)
```

### 7.2 Verification Strategy

**Phase 1: Coarse abstraction** (3 regions per variable)
- Fast verification
- Identify if properties are clearly satisfied or violated
- 27 discrete states per mode → 135 states total (5 modes)

**Phase 2: Refinement** (if results inconclusive)
- 5 regions per variable
- 125 states per mode → 625 states total
- More precision, longer runtime

**Phase 3: Sensitivity analysis**
- Vary guard thresholds (e.g., trust threshold ∈ [0.3, 0.5])
- Check robustness of results

### 7.3 Expected Results

From preliminary analysis:

| Property | Result | Confidence |
|----------|--------|------------|
| P1 (P_catastrophe < 5%) | **Violated** (≈ 8-12%) | High |
| P2 (P_aligned > 50%) | **Satisfied** (≈ 55-65%) | Medium |
| P3 (Trust always safe) | **Violated** (≈ 15% violate) | High |
| P5 (Expected time) | ≈ 8-10 years | Low (sensitive to params) |

**Interpretation**:
- Without coordination, catastrophe risk unacceptably high
- Suggests need for earlier intervention (lower guard thresholds)

---

## 8. Toolchain Setup

### 8.1 Installing PRISM

**macOS/Linux**:
```bash
wget https://www.prismmodelchecker.org/dl/prism-4.7-linux64-x86.tar.gz
tar -xzf prism-4.7-linux64-x86.tar.gz
cd prism-4.7-linux
./install.sh
export PATH=$PATH:$(pwd)/bin
```

**Verify**:
```bash
prism --version
```

### 8.2 Installing Python Dependencies

```bash
pip install numpy scipy matplotlib networkx
```

### 8.3 Installing SpaceEx (Optional)

**Ubuntu**:
```bash
sudo apt-get install spaceex
```

**macOS**: Build from source (see [spaceex.imag.fr](http://spaceex.imag.fr))

---

## 9. Advanced: Counterexample-Guided Refinement

**Problem**: Abstraction says property violated, but is it real?

### 9.1 CEGAR Loop

1. **Check** abstracted MDP
2. If **violated**, extract counterexample trace
3. **Simulate** HA following counterexample
4. If simulation confirms violation: **real bug**
5. If simulation doesn't violate: **spurious** (abstraction artifact)
6. **Refine** abstraction around spurious counterexample
7. Go to step 1

### 9.2 Example

**Counterexample**: (baseline, low, low, high) → (race, med, low, low) → (catastrophe, ...)

**Simulate**:
- Start: (baseline, C=26.2, A=0.2, T=0.75)
- After 1 year: (race, C=26.8, A=0.25, T=0.68)
- Trust still > 0.3 → Cannot reach catastrophe yet

**Diagnosis**: Abstraction "low trust" = [0, 0.4) is too coarse
- 0.68 rounded to "low" in medium region
- But 0.68 is actually safe

**Refinement**: Split trust regions into 5 instead of 3

---

## 10. Verification Checklist

Before running verification:

- [ ] **Model validated**: Flows match domain knowledge, guards make sense
- [ ] **Abstraction justified**: Region boundaries align with critical thresholds
- [ ] **Properties formalized**: LTL/PCTL formulas written, reviewed
- [ ] **Baseline simulation**: Understand typical trajectories
- [ ] **Edge cases tested**: What happens at region boundaries?

After verification:

- [ ] **Results interpreted**: Probabilities, bounds, counterexamples analyzed
- [ ] **Sanity checks**: Do results match simulation intuitions?
- [ ] **Sensitivity analysis**: Robust to parameter variations?
- [ ] **Documentation**: Results, assumptions, limitations recorded

---

## 11. Summary Table

| Workflow | Tool(s) | Output | Effort | Use Case |
|----------|---------|--------|--------|----------|
| **Simulation** | Python + scipy | Sample trajectories | Low | Exploration, demos |
| **Abstraction + MC** | Python + PRISM | Probabilities, bounds | Medium | Formal verification |
| **Reachability** | SpaceEx | Reachable sets | High | Safety-critical continuous |
| **CEGAR** | Python + PRISM + loop | Refined abstraction | Very High | High-assurance systems |

---

## 12. Related Documentation

- [framework.md](framework.md) - HA formal definitions
- [integration.md](integration.md) - SD+ABM+HA coupling
- [examples/04_ai_governance.md](examples/04_ai_governance.md) - AI-2027 full spec
- [../mvp_docs/impl_plan.md](../mvp_docs/impl_plan.md) - Implementation roadmap

---

**Next Steps**:
1. Set up PRISM on your machine
2. Run the abstraction workflow on a simple 2-mode example
3. Visualize results, iterate on abstraction granularity
4. Scale up to full AI-2027 model

**Questions?** Check [TOOLS_LITERATURE_SURVEY.md](../../TOOLS_LITERATURE_SURVEY.md) for comprehensive tool comparisons.
