# Phase Transitions in AI Governance

**Purpose**: Apply phase transition theory (critical points, hysteresis, bifurcations) to understand sudden regime changes in AI governance.

**Core Question**: Under what conditions does the system suddenly flip from coordination to race? Can we predict and prevent these transitions?

---

## What is a Phase Transition?

### Physics Definition

**Phase transition**: A sudden, qualitative change in system behavior as a parameter is varied.

**Examples**:
- Water → ice (liquid to solid at T = 0°C)
- Paramagnet → ferromagnet (random to aligned spins at T = Tᶜ)
- Liquid → gas (boiling)

**Key feature**: **Order parameter** changes discontinuously (1st order) or its derivative changes discontinuously (2nd order).

---

### AI Governance Analogy

**Phase transition**: Sudden shift in governance regime as conditions change

**Examples**:
- Coordination → race (trust erosion crosses threshold)
- Baseline → pause (major incident triggers emergency response)
- Centralized → distributed (capability percolation threshold)

**Order parameter**: Race index r, centralization c, oversight o

---

## Types of Phase Transitions

### First-Order Transitions

**Physics**: Discontinuous jump in order parameter

**Example**: Water → ice
- Density jumps at T = 0°C
- Latent heat released (energy discontinuity)
- Coexistence region (ice + water mix)

**Characteristics**:
- Sudden jump
- Hysteresis (different paths up vs down)
- Metastable states (supercooled water)

---

### Second-Order (Continuous) Transitions

**Physics**: Order parameter → 0 continuously, but derivative diverges

**Example**: Ferromagnet → paramagnet
- Magnetization m → 0 as T → Tᶜ
- No latent heat
- Critical fluctuations diverge

**Characteristics**:
- Smooth change in order parameter
- Correlation length diverges (ξ → ∞)
- Power laws at criticality
- Universal exponents

---

## Critical Point

### Ferromagnet Example

**Below Tᶜ**: Spontaneous magnetization m ≠ 0 (ordered)
**Above Tᶜ**: No magnetization m = 0 (disordered)
**At Tᶜ**: Critical point
- Correlation length ξ → ∞
- Fluctuations on all scales
- Power law behavior: m ∝ (Tᶜ − T)^β where β ≈ 0.33 (3D Ising)

---

### Critical Exponents

**Universal numbers** characterizing behavior near critical point:

| Quantity | Definition | 3D Ising Value |
|----------|------------|----------------|
| β | m ∝ (Tᶜ − T)^β | 0.33 |
| γ | χ ∝ \|T − Tᶜ\|^{−γ} | 1.24 |
| ν | ξ ∝ \|T − Tᶜ\|^{−ν} | 0.63 |
| α | C_v ∝ \|T − Tᶜ\|^{−α} | 0.11 |

Where:
- χ = susceptibility
- ξ = correlation length
- C_v = specific heat

**Key insight**: These are **universal** - same for all systems in the universality class, regardless of microscopic details!

---

## Phase Transitions in AI Governance

### The Race Tipping Point

**Scenario**: System near critical surface separating coordination from race

**Order parameter**: Race index r

**Control parameters**:
- Market pressure h (external field analog)
- Social volatility T (temperature analog)
- Trust level (system parameter)

**Phase diagram**: Map in (pressure, volatility) space
```
         High volatility (chaos)
              |
    Race      |     Multipolar
              |
    --------- • --------- (critical point)
              |
    Coord.    |     Cautious
              |
         Low volatility

    Low pressure ← → High pressure
```

---

### First-Order Race Transition

**Scenario**: Sudden flip to race dynamics

**Trigger**: Trust drops below threshold
```
Trust > 0.6: Coordination stable (r ≈ −0.5)
Trust < 0.5: Race stable (r ≈ +0.8)
Trust ∈ [0.5, 0.6]: Unstable region (could go either way)
```

**Characteristics**:
- Discontinuous jump in race index: Δr ≈ 1.3
- Hysteresis: Easy to fall into race, hard to escape
- Metastability: Coordination can persist briefly in race-favoring conditions

**Real-world analog**: Bank run, panic selling, coordination collapse

---

### Second-Order Trust Transition

**Scenario**: Gradual erosion of coordination

**Trigger**: Slow parameter change (increasing incidents, declining transparency)

**Behavior**:
```python
# As trust decreases smoothly
trust = np.linspace(1.0, 0.3, 100)
race_index = []

for t in trust:
    if t > 0.7:
        r = 0  # Stable coordination
    else:
        r = 0.5 * (0.7 - t)**0.33  # Power law near critical point
    race_index.append(r)
```

**Characteristics**:
- Continuous but accelerating change
- Long-range correlations (one lab's stance affects many others)
- Warning signs: Fluctuations grow near transition

---

## Hysteresis

### Physics: Ferromagnet with External Field

**Experiment**: Start with magnet, vary external field h
1. h = 0 → +large: Magnetization m = 0 → +1 (all spins align with field)
2. h = +large → −large: m flips from +1 to −1
3. **But the flip doesn't happen at h = 0!**

**Hysteresis loop**: Different paths depending on history
```
m ↑
+1 |     /‾‾‾\
   |    /     \
 0 |---+-------+---
   |  /         \
-1 | /___________\‾
   |
  -h_c   0   +h_c  → h
```

**Key**: System "remembers" its history. Takes extra push to flip.

---

### AI Governance: Race Hysteresis

**Scenario**: Easy to fall into race, hard to climb out

**Going down (coordination → race)**:
```
Initial: r = −0.5 (coordination)
Incident reduces trust: 0.8 → 0.5
Race index jumps: r = −0.5 → +0.6 (race)
```

**Trying to go back up (race → coordination)**:
```
Current: r = +0.6 (race)
Trust recovery: 0.5 → 0.8
Race index only drops to: r = +0.6 → +0.2 (still race-leaning!)
```

**To return to coordination**: Need trust > 0.9 (higher than original 0.8)

---

### Hysteresis Diagram

```python
import numpy as np
import matplotlib.pyplot as plt

# Going down: coordination → race (easy)
trust_down = np.linspace(1.0, 0.4, 50)
race_down = []
r = -0.5  # Start coordinated

for t in trust_down:
    if t < 0.6 and r < 0:
        r = 0.6  # Sudden flip to race
    race_down.append(r)

# Going up: race → coordination (hard)
trust_up = np.linspace(0.4, 1.0, 50)
race_up = []
r = 0.6  # Start in race

for t in trust_up:
    if t > 0.85:
        r = -0.5  # Return to coordination (higher threshold!)
    race_up.append(r)

# Hysteresis loop
plt.plot(trust_down, race_down, 'r-', label='Trust declining')
plt.plot(trust_up, race_up, 'b--', label='Trust recovering')
plt.xlabel('Trust level')
plt.ylabel('Race index')
plt.title('Hysteresis: Easy to race, hard to coordinate')
plt.legend()
```

**Result**: Asymmetric loop. **Race is a trap.**

---

## Metastability

### Physics: Supercooled Water

**Normal**: Water freezes at T = 0°C

**Metastable**: Pure water can stay liquid down to T = −15°C
- Thermodynamically "should" be ice
- But lacks nucleation site
- Small perturbation → sudden freezing

---

### AI Governance: Fragile Coordination

**Scenario**: Coordination persists despite race-favoring conditions

**Example**:
- Trust = 0.55 (below critical 0.6)
- Market pressure high
- But labs maintain coordination (metastable)

**Why?**:
- Strong norms/institutions (activation barrier)
- No trigger incident yet
- Everyone waiting for first defector

**Risk**: Any shock → sudden cascade to race
- One lab defects → others follow
- Incident → trust collapse → immediate race

---

## Bifurcation Theory

### What is Bifurcation?

**Definition**: Qualitative change in dynamical system behavior as parameter varies

**Example**: Pitchfork bifurcation
```
   x
   ↑
   |    /‾‾\
   |   /    \
---+--+------+--- r (parameter)
   | /        \
   |/          \‾
```

Before r = 0: One stable equilibrium (x = 0)
After r > 0: Two stable equilibria (x = ±√r), one unstable (x = 0)

---

### Saddle-Node Bifurcation

**Dynamics**: dx/dt = r + x²

**For r < 0**: Two equilibria
- x₁ = −√(−r) (stable)
- x₂ = +√(−r) (unstable)

**At r = 0**: Equilibria collide and annihilate

**For r > 0**: No equilibria (x → ∞)

**Interpretation**: System suddenly has no stable state!

---

### AI Governance: Regime Collapse

**Example**: Baseline governance loses stability

**Model**:
```python
def race_index_dynamics(r, pressure):
    # dr/dt = pressure - r³ (cubic restoring force)
    return pressure - r**3

# Low pressure: r = 0 is stable
pressure = 0.1
equilibria = [0, ±√(pressure)^(1/3)]  # r = 0 stable

# High pressure: r = 0 unstable, system forced to r > 0
pressure = 0.5
# Only positive equilibrium stable → forced into race
```

---

## Critical Slowing Down

### Physics

**Near critical point**: System responds slowly to perturbations
- Correlation length ξ → ∞
- Recovery time τ ∝ ξ^z (z = dynamic exponent)
- Small kick → long-lasting fluctuations

**Example**: Ferromagnet near Tᶜ
- Apply small field, remove it
- Far from Tᶜ: Magnetization returns to zero quickly
- Near Tᶜ: Magnetization decays slowly (τ → ∞)

---

### AI Governance: Warning Sign

**Scenario**: System near race tipping point

**Observable**: Policy interventions have weaker, slower effects
- Trust recovery takes longer
- Labs respond sluggishly to incentives
- System "stuck" in intermediate state

**Interpretation**: Early warning of impending transition!

**Monitoring**:
```python
# Measure response time to policy shock
def measure_response_time(system, shock):
    initial_state = system.state.copy()
    system.apply_shock(shock)

    # Time to return to 90% of equilibrium
    t = 0
    while system.distance_from_equilibrium() > 0.1:
        system.step()
        t += 1
        if t > 1000:
            return np.inf  # Critical slowing down!
    return t

# If response_time → ∞, you're near critical point
```

---

## Spinodal Decomposition

### Physics: Liquid Mixture

**Scenario**: Mix two liquids (oil + water) that phase separate

**Spinodal decomposition**: Spontaneous formation of domains
- No nucleation needed
- Characteristic length scale grows over time
- Eventually: Large separated regions

---

### AI Governance: Bloc Formation

**Scenario**: Mixed ecosystem → blocs separate

**Example**:
- Initially: Labs distributed across stance spectrum
- Small fluctuation: Some labs slightly more race-oriented
- Positive feedback: Race labs cluster, cautious labs cluster
- Endpoint: Clear US bloc (race) vs Europe bloc (cautious)

**Dynamics**:
```python
def bloc_formation(stances, coupling):
    # Cahn-Hilliard-like equation
    for i in range(N):
        # Labs influenced by neighbors
        neighbor_avg = np.mean(stances[neighbors(i)])
        stances[i] += coupling * (neighbor_avg - stances[i])

    # Result: Like attracts like → blocs form
```

**Timescale**: Weeks to months for coalitions to crystallize

---

## Mean-Field Theory

### Ising Model Mean-Field

**Approximation**: Replace spin-spin interactions with average field

**Self-consistency**:
```
m = tanh(β(Jzm + h))
```

Where:
- m = magnetization (order parameter)
- z = coordination number (# neighbors)
- β = 1/T

**Solve for m**:
- High T: Only solution m = 0 (paramagnet)
- Low T: Two solutions m = ±m₀ (ferromagnet)

**Critical temperature**: T_c = Jz/k_B

---

### AI Governance Mean-Field

**Setup**: Each actor sees average stance of all others

**Self-consistency**:
```
r = tanh(β(J·r + h))
```

Where:
- r = race index
- J = strategic coupling (how much actors follow others)
- h = external pressure
- β = 1/volatility

**Solutions**:
```python
import numpy as np
from scipy.optimize import fsolve

def mean_field_eq(r, J, h, volatility):
    beta = 1.0 / volatility
    return r - np.tanh(beta * (J * r + h))

# Find equilibria
volatility = 1.0
J = 2.0  # Strong coupling
h = 0.5  # Moderate pressure

# Three solutions possible
solutions = fsolve(mean_field_eq, [-1, 0, 1], args=(J, h, volatility))
# e.g., solutions = [-0.8, 0.0, +0.9]
# Two stable (±), one unstable (0)
```

---

## Phase Diagram

### Constructing Phase Diagram

**Axes**: Control parameters (pressure h, volatility T)

**Regions**: Different phases (race, coordination, multipolar)

**Example**:
```
    Volatility
        ↑
    1.0 |  Multipolar (m ≈ 0)
        |
    0.5 |---- · ---- (critical line)
        | Race | Coord.
    0.0 +----+----+---→ Pressure
        0    0.5   1.0
```

**Critical line**: Boundary between phases
- Equation: h_c(T) = f(T) (depends on model)
- Mean-field: h_c(T) ∝ (T_c - T) near T_c

---

### AI Governance Phase Diagram

**Axes**: (Market pressure, Social volatility)

**Phases**:
1. **Coordination** (low pressure, low volatility): Stable r < 0
2. **Race** (high pressure, low volatility): Stable r > 0
3. **Multipolar** (high volatility): No stable order (r ≈ 0 average, large fluctuations)
4. **Critical region** (near boundary): Metastable, sensitive to perturbations

```python
import numpy as np
import matplotlib.pyplot as plt

pressure = np.linspace(0, 1, 100)
volatility = np.linspace(0, 1, 100)
P, V = np.meshgrid(pressure, volatility)

# Phase assignment (simplified)
phase = np.zeros_like(P)
for i in range(100):
    for j in range(100):
        p, v = P[i, j], V[i, j]
        if v > 0.7:
            phase[i, j] = 2  # Multipolar
        elif p > 0.6:
            phase[i, j] = 0  # Race
        else:
            phase[i, j] = 1  # Coordination

plt.contourf(P, V, phase, levels=[0, 1, 2, 3],
             colors=['red', 'blue', 'gray'])
plt.xlabel('Market pressure')
plt.ylabel('Social volatility')
plt.title('AI Governance Phase Diagram')
```

---

## Connection to Discrete-Time HA

### Modes as Phases

**In discrete-time hybrid automaton**:
- Each **mode** q ∈ Q corresponds to a **phase**
- Mode transitions = phase transitions
- Guards = critical surfaces in phase diagram

**Example**:
```python
modes = {
    "coordination": (r < -0.3),     # Coordination phase
    "baseline": (-0.3 ≤ r ≤ 0.5),  # Near-critical
    "race": (r > 0.5)               # Race phase
}
```

---

### Hysteresis in Mode Transitions

**Implementation**:
```python
class HAWithHysteresis:
    def check_transition(self, state, mode):
        r = state.race_index

        if mode == "coordination":
            # Harder to leave coordination (lower threshold)
            if r > 0.7:  # Higher than baseline → race (0.5)
                return "race"

        elif mode == "race":
            # Harder to leave race (higher threshold)
            if r < -0.5:  # Lower than baseline → coord (-0.3)
                return "coordination"

        return mode  # Stay in current mode
```

**Result**: Hysteresis loop encoded in guard asymmetry

---

## Summary

**Phase transitions provide**:
1. **Critical points**: Where small changes cause large effects
2. **Hysteresis**: Asymmetric transitions (easy down, hard up)
3. **Metastability**: Fragile states that can suddenly collapse
4. **Bifurcations**: Parameter values where equilibria change
5. **Warning signs**: Critical slowing down, growing fluctuations

**For AI governance**:
- Race tipping points = critical surfaces
- Coordination collapse = first-order transition
- Hysteresis = race is easier to enter than exit
- Metastability = fragile coordination before cascade
- Mean-field theory = actors influenced by average behavior
- Phase diagram = map of regimes in parameter space

**For modeling**:
- Modes in HA = phases in physics
- Guards = critical surfaces
- Asymmetric guards = hysteresis
- Order parameters (race index, etc.) track phase

**Next**: See how coarse-graining connects micro to macro in [renormalization.md](./renormalization.md)
