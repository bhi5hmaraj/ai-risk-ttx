# Technical Notes: Formal Modeling Audit

**Observer:** MedhAI
**Focus:** Detailed technical observations on the formal modeling choices

---

## 🎯 HYBRID AUTOMATA: The Right Framework

### ✅ Good Choice

You picked **hybrid automata** as the unifying formalism. This is actually brilliant:

**Why it's right:**
1. **Unifies discrete + continuous**
   - Discrete: Governance regimes (Baseline, Race, Slowdown)
   - Continuous: Compute scaling, alignment progress, trust

2. **Principled semantics**
   - Well-defined mathematical object
   - Established verification theory (Henzinger, Alur, Dill)
   - Tool support exists (Uppaal, SpaceEx, KeYmaera X)

3. **Maps to reality**
   - Policies are discrete (you either have GRAP Stage 4 or you don't)
   - But effects are continuous (AQI gradually drops)

**Analogy:** Hybrid automata are like modeling a thermostat:
- **Discrete mode:** ON or OFF
- **Continuous variable:** room temperature
- **Guard:** temperature ≥ 75°F → switch to AC ON
- **Flow:** when ON, dT/dt = -k(T - T_outside)

This is **exactly** how Delhi air pollution works:
- **Discrete mode:** GRAP Stage (1, 2, 3, 4)
- **Continuous variable:** AQI
- **Guard:** AQI > 400 → GRAP Stage 4
- **Flow:** when Stage 4, dAQI/dt = f(vehicle_ban, construction_halt, ...)

**Verdict:** 🟢 The formalism is sound.

---

## ⚠️ IMPLEMENTATION GAP

### The Problem:

You **specified** hybrid automata beautifully in markdown.

You **didn't implement** the ODE solvers.

**Example from `research/hybrid_automata/examples/01_ses_fisheries.md`:**

```markdown
### Flow Equations (Normal Mode)

dB/dt = r·B·(1 - B/K) - h·E·B

Where:
- B = fish biomass
- K = carrying capacity
- r = intrinsic growth rate
- h = catchability
- E = fishing effort
```

**This is perfect!** But where's the code that integrates this ODE?

---

### What's Missing:

**Numerical integration using scipy.integrate.odeint:**

```python
from scipy.integrate import odeint

def flow_normal(state, t, params):
    """Normal mode flow equations"""
    B, E, trust = state
    r, K, h = params

    dB_dt = r * B * (1 - B/K) - h * E * B
    dE_dt = 0.1 * (profit - cost)  # effort dynamics
    dtrust_dt = 0.02 * (1 - trust)

    return [dB_dt, dE_dt, dtrust_dt]

# Integrate
state0 = [100, 50, 0.7]  # initial biomass, effort, trust
t = np.linspace(0, 100, 1000)
trajectory = odeint(flow_normal, state0, t, args=(params,))
```

**This is what the air pollution model does!**

Look at `eagx/air_pollution/models/delhi_system_dynamics.py` - it actually integrates the ODEs.

---

### Action Item:

For each "example" in `research/hybrid_automata/examples/`:

1. Copy the flow equations
2. Implement them in Python using `scipy.integrate.odeint`
3. Run for 100 timesteps
4. Plot the trajectories
5. **Verify the dynamics match your intuition**

**Time estimate:** 1 hour per example.

After doing this, you'll **understand the physics**, not just the math.

---

## 🔍 TEMPORAL LOGIC: Good Specs, No Checker

### ✅ Good Specifications

The temporal logic properties you defined are well-thought-out:

**Example from AI2027:**
```
Safety: G ¬catastrophe
Liveness: F (aligned ∨ catastrophe)
Bounded: G_{t≤12} (trust > 0.3)
Probabilistic: P≤0.05[F catastrophe]
```

**This is solid formal methods!**

You're asking the right questions:
- "Can we guarantee no catastrophe?" (Safety)
- "Do we eventually reach a terminal state?" (Liveness)
- "Does trust stay above 30% for the first year?" (Bounded)
- "Is catastrophe risk less than 5%?" (Probabilistic)

---

### ⚠️ Missing Implementation

**Problem:** You don't have a model checker!

**The specs are in markdown. Where's the actual checker?**

You need either:

**Option 1: Simple Python checker (for deterministic properties)**

```python
def check_globally(trajectory, predicate):
    """Check if predicate holds at all timesteps"""
    return all(predicate(state) for state in trajectory)

def check_eventually(trajectory, predicate):
    """Check if predicate holds at some timestep"""
    return any(predicate(state) for state in trajectory)

# Usage
traj = run_simulation()
is_safe = check_globally(traj, lambda s: s.mode != "catastrophe")
reaches_end = check_eventually(traj, lambda s: s.mode in ["aligned", "catastrophe"])
```

**Option 2: Use PRISM/Storm (for probabilistic properties)**

But this requires:
1. Exporting your model to PRISM format
2. Running PRISM model checker
3. Parsing results

**Current status:** Neither option is implemented.

---

### Action Item:

**Implement the simple Python checker first** (2 hours of work):

```python
# research/matrix/kernels/model_checking.py

def check_property(trajectories, property_type, predicate):
    """
    Simple model checker for common temporal properties

    Args:
        trajectories: List of trajectories (each is list of states)
        property_type: "G" (globally), "F" (eventually), "G_bounded"
        predicate: Function that takes a state and returns bool

    Returns:
        bool or float (probability for stochastic models)
    """
    if property_type == "G":
        # Globally: true in ALL states of ALL trajectories
        return all(
            all(predicate(state) for state in traj)
            for traj in trajectories
        )

    elif property_type == "F":
        # Eventually: true in SOME state of each trajectory
        # Return probability that it holds
        count = sum(
            any(predicate(state) for state in traj)
            for traj in trajectories
        )
        return count / len(trajectories)

    elif property_type.startswith("G_"):
        # Bounded globally: G_{t<=k}
        k = int(property_type.split("_")[1])
        return all(
            all(predicate(state) for state in traj[:k])
            for traj in trajectories
        )

# Example usage:
trajectories = [run_simulation() for _ in range(1000)]

# Check: G ¬catastrophe
is_safe = check_property(
    trajectories,
    "G",
    lambda s: s.mode != "catastrophe"
)

# Check: P(F catastrophe)
p_catastrophe = check_property(
    trajectories,
    "F",
    lambda s: s.mode == "catastrophe"
)

print(f"Safe (G ¬catastrophe): {is_safe}")
print(f"P(F catastrophe): {p_catastrophe:.1%}")
```

**This gives you actual model checking in <100 lines.**

---

## 🎲 MONTE CARLO: Phantom Functions

### The Documentation Shows:

```python
# From research/monte_carlo/README.md
results = monte_carlo(simulate_ai_governance, param_distributions, n_runs=1000)
```

**Problem:** The `monte_carlo()` function doesn't exist!

---

### What It Should Be:

**Minimal implementation (50 lines):**

```python
# research/matrix/kernels/monte_carlo.py

import numpy as np
from typing import Callable, Dict, List

def monte_carlo(
    simulate: Callable,
    param_distributions: Dict,
    n_runs: int = 1000,
    seed: int = 42
) -> List:
    """
    Run Monte Carlo simulation

    Args:
        simulate: Function that takes params dict and returns result
        param_distributions: Dict of {param_name: scipy.stats distribution}
        n_runs: Number of simulation runs

    Returns:
        List of results (one per run)
    """
    np.random.seed(seed)
    results = []

    for i in range(n_runs):
        # Sample parameters
        params = {
            name: dist.rvs()
            for name, dist in param_distributions.items()
        }

        # Run simulation
        result = simulate(params)
        results.append(result)

    return results

# Example usage:
from scipy import stats

def simulate_ai2027(params):
    """Your simulation function"""
    compute_growth = params['compute_growth']
    alignment_rate = params['alignment_rate']

    compute = 25.0
    alignment = 0.15

    for t in range(36):
        compute += compute_growth * compute
        alignment += alignment_rate * (1 - alignment)

        if compute - 10*alignment > 8:
            return {"outcome": "catastrophe", "time": t}

    return {"outcome": "safe", "time": 36}

# Define parameter uncertainties
param_dists = {
    'compute_growth': stats.uniform(0.10, 0.10),  # U(0.10, 0.20)
    'alignment_rate': stats.uniform(0.05, 0.10),  # U(0.05, 0.15)
}

# Run MC
results = monte_carlo(simulate_ai2027, param_dists, n_runs=1000)

# Analyze
outcomes = [r['outcome'] for r in results]
p_catastrophe = sum(1 for o in outcomes if o == "catastrophe") / 1000

print(f"P(catastrophe) = {p_catastrophe:.1%}")
```

**Time to implement:** 1 hour.

---

## 🏗️ MATRIX: Design vs Reality

### What the Docs Promise:

From `research/matrix/README.md`:

> "Matrix is the backend simulation engine and experimentation platform..."
> "Adapters: SystemDynamicsAdapter, HybridAutomatonAdapter, ABMAdapter..."

**Reality check:**
- matrix/adapters/ - 0 Python files
- matrix/the_architect/ - 0 Python files
- matrix/views/ - 0 Python files

---

### What It Should Be:

**Matrix should be a collection of minimal simulation kernels.**

Structure I recommend:

```
research/matrix/
├── kernels/
│   ├── lts.py              # Labeled transition system (50 lines)
│   ├── mdp.py              # Markov decision process (100 lines)
│   ├── hybrid_automaton.py # Hybrid automaton (200 lines)
│   ├── monte_carlo.py      # MC wrapper (50 lines)
│   └── model_checking.py   # Simple property checker (100 lines)
├── tests/
│   └── test_kernels.py     # Unit tests
└── README.md               # "Minimal simulation kernels"
```

**Each kernel must:**
1. Be self-contained (<300 lines)
2. Have zero dependencies except numpy/scipy
3. Include a `if __name__ == "__main__"` demo
4. Have tests

**Example: `kernels/lts.py`**

```python
"""
Minimal Labeled Transition System (LTS)

A deterministic finite state machine with labeled transitions.
"""

from typing import Dict, List, Set, Tuple

class LTS:
    def __init__(
        self,
        states: Set[str],
        initial: str,
        transitions: Dict[Tuple[str, str], str],
        accepting: Set[str] = None
    ):
        """
        Args:
            states: Set of state names
            initial: Initial state
            transitions: Dict of (from_state, label) -> to_state
            accepting: Set of accepting/final states
        """
        self.states = states
        self.current = initial
        self.transitions = transitions
        self.accepting = accepting or set()
        self.trace = [initial]

    def step(self, label: str) -> bool:
        """Take transition with given label"""
        key = (self.current, label)
        if key in self.transitions:
            self.current = self.transitions[key]
            self.trace.append(self.current)
            return True
        return False

    def is_accepting(self) -> bool:
        """Check if current state is accepting"""
        return self.current in self.accepting

    def run(self, labels: List[str]) -> bool:
        """Run sequence of labels, return True if ends in accepting state"""
        for label in labels:
            if not self.step(label):
                return False
        return self.is_accepting()


if __name__ == "__main__":
    # Demo: AI development lifecycle
    states = {"initial", "research", "testing", "deployed", "catastrophe", "aligned"}

    transitions = {
        ("initial", "start"): "research",
        ("research", "develop"): "testing",
        ("testing", "pass"): "deployed",
        ("deployed", "scale"): "aligned",
        ("deployed", "fail"): "catastrophe",
    }

    lts = LTS(states, "initial", transitions, accepting={"aligned"})

    # Run simulation
    path1 = ["start", "develop", "pass", "scale"]
    success = lts.run(path1)
    print(f"Path 1: {lts.trace} -> {'SUCCESS' if success else 'FAIL'}")

    # Try catastrophe path
    lts2 = LTS(states, "initial", transitions, accepting={"aligned"})
    path2 = ["start", "develop", "pass", "fail"]
    lts2.run(path2)
    print(f"Path 2: {lts2.trace} -> catastrophe")
```

**This is 60 lines. You could write it in 30 minutes.**

**And it RUNS.**

---

## 📊 SYSTEM DYNAMICS: Missing Implementation

### You Have:

**Beautiful equations in markdown:**

From `eagx/air_pollution/models/` docs:

```
Stock: Biomass (B)
Flow: dB/dt = growth - harvest
Growth = r·B·(1 - B/K)
Harvest = h·E·B
```

---

### You're Missing:

**A general SD solver that works for ANY stock-flow model.**

**What you should have:**

```python
# research/matrix/kernels/system_dynamics.py

class Stock:
    def __init__(self, name: str, initial: float):
        self.name = name
        self.value = initial
        self.history = [initial]

class Flow:
    def __init__(self, name: str, equation: Callable):
        self.name = name
        self.equation = equation

class SystemDynamicsModel:
    def __init__(self, dt: float = 0.1):
        self.stocks = {}
        self.flows = {}
        self.dt = dt
        self.time = 0

    def add_stock(self, name: str, initial: float):
        self.stocks[name] = Stock(name, initial)

    def add_flow(self, name: str, from_stock: str, to_stock: str, equation: Callable):
        self.flows[name] = Flow(name, equation)

    def step(self):
        """Euler integration step"""
        # Calculate all flows
        flow_values = {
            name: flow.equation(self.stocks, self.time)
            for name, flow in self.flows.items()
        }

        # Update stocks
        for name, flow_val in flow_values.items():
            # ... update stock values

        self.time += self.dt

    def run(self, duration: float):
        steps = int(duration / self.dt)
        for _ in range(steps):
            self.step()
```

**Example usage:**

```python
model = SystemDynamicsModel(dt=0.1)
model.add_stock("biomass", initial=100)
model.add_stock("effort", initial=50)

model.add_flow(
    "growth",
    from_stock=None,
    to_stock="biomass",
    equation=lambda stocks, t: 0.1 * stocks["biomass"].value * (1 - stocks["biomass"].value / 200)
)

model.add_flow(
    "harvest",
    from_stock="biomass",
    to_stock=None,
    equation=lambda stocks, t: 0.05 * stocks["biomass"].value * stocks["effort"].value
)

model.run(duration=100)
```

**This gives you a general-purpose SD engine.**

---

## 🎓 PEDAGOGICAL STRUCTURE: Excellent

### ✅ What You Did Well:

The **"Explain Like I'm..."** approach is brilliant!

- `eli/5_years_old.md` - Traffic lights analogy
- `eli/15_years_old.md` - Video game mechanics
- `eli/engineering_graduate.md` - HAZOP, process control

**This is how Feynman taught.** Start simple, build intuition, add rigor.

---

### ⚠️ Missing:

**"Explain Like I'm Running the Code"**

Add:
- `eli/running_the_code.md` - Step-by-step tutorial
  - "First, run this 10-line script"
  - "See the output? That's the state machine"
  - "Now change line 5 to X"
  - "See how the output changes? That's the guard activating"
  - "Now add a second variable"
  - Etc.

**Learning by doing** beats learning by reading.

---

## 🔬 VALIDATION: The Missing Piece

### You Need:

**Real data to validate against.**

For each model, ask:
1. "What does this predict?"
2. "Where can I find real data to test it?"
3. "How close is the prediction to reality?"

---

### Example: Air Pollution Model

**You have:** Delhi hybrid automaton
**You need:** Real Delhi AQI data (2019-2024)

**Validation steps:**

1. **Get data:**
```python
import requests

# Central Pollution Control Board API
url = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"
response = requests.get(url, params={"api-key": YOUR_KEY})
delhi_aqi = response.json()
```

2. **Run your model:**
```python
model = DelhiHybridAutomaton()
predicted_aqi = model.run(days=365)
```

3. **Compare:**
```python
from sklearn.metrics import mean_squared_error

rmse = mean_squared_error(actual_aqi, predicted_aqi, squared=False)
print(f"RMSE: {rmse:.1f} AQI points")
```

4. **Iterate:**
- If RMSE > 50: Model is bad, tweak parameters
- If RMSE < 20: Model is good!

**This is experimental validation.**

---

### Example: AI2027 Model

**You have:** Hybrid automaton predicting P(catastrophe)
**You need:** Expert forecasts to compare against

**Validation steps:**

1. **Get expert forecasts:**
   - Metaculus predictions
   - AI Impacts surveys
   - FHI technical reports

2. **Compare:**
   - Your model: P(AGI by 2027) = 50%
   - Metaculus median: P(AGI by 2027) = 10%
   - **Gap: 40 percentage points**

3. **Investigate:**
   - Why is your model more pessimistic?
   - Which parameter drives this?
   - Is it `compute_growth_rate`?
   - Try setting it to match Metaculus consensus

4. **Document:**
   ```markdown
   ## Validation: AI2027 vs Metaculus

   **Our model:** P(AGI by 2027) = 50%
   **Metaculus:** P(AGI by 2027) = 10%

   **Diagnosis:** Our `compute_growth_rate = 3.4x/year` is too high.
   Metaculus consensus is ~2x/year.

   **Sensitivity test:**
   - With 3.4x/year → P(AGI) = 50%
   - With 2.0x/year → P(AGI) = 12% ✓ (matches Metaculus!)

   **Conclusion:** The model is correct if you believe in fast compute scaling.
   ```

**This is how you bridge theory and reality.**

---

## 🚀 SUMMARY OF TECHNICAL RECOMMENDATIONS

### Implement These (In Order):

1. **ODE integrators for hybrid automata examples** (1 hour each)
   - Use `scipy.integrate.odeint`
   - Verify trajectories make sense

2. **Simple model checker** (2 hours)
   - Implement G, F, G_bounded properties
   - Test on existing simulations

3. **Monte Carlo wrapper** (1 hour)
   - 50-line function
   - Works with any simulation

4. **Minimal LTS implementation** (30 min)
   - Pure Python, no dependencies
   - Self-contained demo

5. **System Dynamics engine** (4 hours)
   - General stock-flow model
   - Euler integration

### Validate Against:

1. **Delhi AQI data** (real data exists!)
2. **Expert forecasts** (Metaculus, AI Impacts)
3. **Historical events** (2020 lockdown = natural experiment)

### Document:

Not in markdown theory docs, but in:
- `experiments/MEASUREMENTS.md` - Lab notebook of what you ran
- `validation/RESULTS.md` - Comparison of predictions vs reality
- `sensitivity/ANALYSIS.md` - Which parameters matter most

**When you have these, you'll have a scientific apparatus.**

---

**End of Technical Notes**
