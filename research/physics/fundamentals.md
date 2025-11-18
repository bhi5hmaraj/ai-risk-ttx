# Statistical Mechanics Fundamentals

**Purpose**: Apply statistical mechanics concepts (ensemble averages, partition functions, order parameters) to macro modeling of AI governance.

**Core Insight**: Just as we can't track every atom but can still predict macroscopic behavior, we can't model every individual actor but can still understand system-level dynamics.

---

## The Physics Playbook: Micro → Macro

### The Problem

**Physics**: You have 10²³ atoms in a piece of iron. How do you predict whether it's magnetic?

**AI Governance**: You have thousands of labs, states, companies, publics. How do you predict whether we get a race or coordination?

**Answer**: Statistical mechanics - map microscopic configurations to macroscopic observables.

---

## Core Concept: Ensemble Average

### The Ising Model (Canonical Example)

**Setup**: N spins on a lattice, each σᵢ ∈ {−1, +1}

**Energy**:
```
H = −J Σ_{⟨i,j⟩} σᵢσⱼ − h Σᵢ σᵢ
```

Where:
- J > 0: Ferromagnetic coupling (spins want to align)
- h: External magnetic field
- ⟨i,j⟩: Sum over nearest neighbors

**Key point**: We don't care about individual spin values. We care about **ensemble averages**.

---

### Boltzmann Distribution

**At temperature T**, the probability of configuration {σ} is:

```
P({σ}) = (1/Z) exp(−βH({σ}))
```

Where:
- β = 1/(k_B T)
- Z = Σ_{all configs} exp(−βH) (partition function)

**Physical meaning**:
- Low energy configurations → high probability
- High temperature → more randomness (entropy wins)
- Low temperature → order (energy wins)

---

### Order Parameter: Magnetization

**Definition**: Average spin across the lattice

```
m = ⟨1/N Σᵢ σᵢ⟩
```

Where ⟨·⟩ denotes ensemble average (thermal average over all configurations weighted by Boltzmann factor).

**Properties**:
- m = +1: All spins up (fully ordered)
- m = −1: All spins down (fully ordered)
- m = 0: Random spins (disordered)

**Key insight**: m is a **macroscopic observable** computed from **microscopic ensemble average**.

---

## Mapping to AI Governance

### Instead of Spins: Actors

**Microscopic state**: Each actor i has a "stance" sᵢ ∈ {−1, +1}
- sᵢ = +1: Pro-race (accelerate)
- sᵢ = −1: Pro-caution (slowdown)

**Population**:
- N_labs: AI labs (weighted heavily)
- N_states: National governments
- N_public: Public opinion (aggregated)

---

### Instead of Energy: Incentive Function

**Analog of Hamiltonian**: Define a "tension function" T that captures misalignment costs

```
T = −J Σ_{⟨i,j⟩} sᵢsⱼ − h Σᵢ wᵢsᵢ
```

Where:
- J > 0: Coordination benefit (aligned actors have lower tension)
- h: External pressure (market demand, security threat)
- wᵢ: Actor weight (labs > companies > individual researchers)

**Low tension**: Actors aligned (all race or all cautious)
**High tension**: Misalignment (some race, some cautious)

---

### Instead of Temperature: Social Volatility

**Analog of T**: Information environment, trust, uncertainty

**High volatility (high T)**:
- Actors change stances frequently
- Hard to maintain coordination
- Random fluctuations dominate

**Low volatility (low T)**:
- Stable coalitions
- Coordination easier to sustain
- Structure dominates

---

### Order Parameter: Race Index

**Definition**: Weighted average stance

```
r = Σᵢ wᵢsᵢ / Σᵢ wᵢ
```

Where wᵢ = weight of actor i (based on compute, influence, etc.)

**Values**:
- r ≈ +1: Race-dominated (most actors accelerating)
- r ≈ −1: Coordination-dominated (most actors cautious)
- r ≈ 0: Multipolar (mixed stances)

**This is our magnetization analog!**

---

## Ensemble Averages in Practice

### From ABM to Macro

**Micro layer (ABM)**:
- Track individual labs: {Lab A: race, Lab B: cautious, Lab C: race, ...}
- Each ABM run = one "microstate" (one configuration)
- Run ensemble: 1000 ABM runs with slightly different initial conditions

**Macro layer (AI-2027)**:
- Compute race index r from each ABM run
- Average across ensemble: r̄ = ⟨r⟩
- This is the **order parameter** for the macro model

---

### Statistical Mechanics Recipe

**Step 1**: Define microscopic state space
- Example: (stance_lab1, stance_lab2, ..., trust, compute)

**Step 2**: Define energy/tension function
- Example: T = coordination_cost + market_pressure

**Step 3**: Define temperature analog
- Example: Social volatility = f(information_chaos, incident_rate)

**Step 4**: Compute partition function (or approximate via Monte Carlo)
- Z = Σ_{configs} exp(−T/volatility)

**Step 5**: Compute order parameters via ensemble average
- Race index: r = ⟨Σ wᵢsᵢ / Σ wᵢ⟩

**Step 6**: Use order parameters in macro model (AI-2027 DAG)

---

## Example: Two-Lab System

### Setup

**Actors**: 2 labs (A, B), each can be {race, cautious}

**States**: 4 possible configurations
1. (race, race): Both accelerate
2. (race, cautious): Misaligned
3. (cautious, race): Misaligned
4. (cautious, cautious): Both cautious

---

### Energy Function

```
T_1 = 0       # Both race → no tension (coordination benefit)
T_2 = +10     # Misaligned → high tension (one gets left behind)
T_3 = +10     # Misaligned
T_4 = 0       # Both cautious → no tension (coordination benefit)
```

**External pressure**: h = +5 (market favors racing)

**Updated energies**:
```
T_1 = 0 − 5(+1 + 1) = −10  # Both race → very favorable
T_2 = 10 − 5(+1 − 1) = +10 # Misaligned
T_3 = 10 − 5(−1 + 1) = +10 # Misaligned
T_4 = 0 − 5(−1 − 1) = +10  # Both cautious → market penalty
```

---

### Boltzmann Weights (at volatility = 2)

```
w_1 = exp(−(−10)/2) = exp(5) ≈ 148
w_2 = exp(−10/2) = exp(−5) ≈ 0.007
w_3 = exp(−10/2) = exp(−5) ≈ 0.007
w_4 = exp(−10/2) = exp(−5) ≈ 0.007
```

**Partition function**: Z = 148 + 0.007 + 0.007 + 0.007 ≈ 148

**Probabilities**:
```
P_1 ≈ 148/148 = 99.98%  # Both race
P_2 ≈ 0.007/148 ≈ 0.005% # Misaligned
P_3 ≈ 0.007/148 ≈ 0.005% # Misaligned
P_4 ≈ 0.007/148 ≈ 0.005% # Both cautious
```

**Race index**:
```
r = 0.998(+1 + 1) + 0.00005(+1 − 1 + ... ) ≈ +2.0
```
(Normalized to [−1, 1]: r/2 = +1.0 → full race)

---

### Interpretation

**With market pressure h = +5 and low volatility**:
- System overwhelmingly settles into (race, race)
- Coordination on racing is the stable equilibrium
- Cautious stance has ~0% probability

**If we increase volatility to T = 10**:
```
w_1 = exp(1) ≈ 2.7
w_2 = exp(−1) ≈ 0.37
w_3 = exp(−1) ≈ 0.37
w_4 = exp(−1) ≈ 0.37
```
Z ≈ 3.8
P_1 ≈ 71%, P_2 ≈ 10%, P_3 ≈ 10%, P_4 ≈ 10%

Now there's ~29% chance of coordination failure!

---

## Order Parameters: General Definition

**What makes a good order parameter?**

1. **Distinguishes phases**: Different values in different regimes
2. **Macroscopic**: Can be measured/computed from macro observables
3. **Emergent**: Not directly controlled, arises from micro interactions
4. **Continuous** (usually): Allows smooth transitions

---

### Examples in Physics

| System | Order Parameter | Phases |
|--------|-----------------|--------|
| Ferromagnet | Magnetization m | Magnetic (m ≠ 0) vs Paramagnetic (m = 0) |
| Liquid-gas | Density ρ | Liquid (high ρ) vs Gas (low ρ) |
| Superconductor | Cooper pair density | Superconducting vs Normal |
| Liquid crystal | Orientational order | Nematic vs Isotropic |

---

### Examples in AI Governance

| System | Order Parameter | Phases |
|--------|-----------------|--------|
| AI ecosystem | Race index r | Race (r > 0.5) vs Coordination (r < −0.5) |
| Compute distribution | Centralization c | Concentrated vs Distributed |
| Capability diffusion | Percolation p | Controlled vs In-the-wild |
| Oversight strength | Coverage o | Governed vs Ungoverned |

---

## Multiple Order Parameters

**Real systems need multiple order parameters** to fully characterize the phase.

**Example: AI-2027 state**
```python
@dataclass
class MacroState:
    race_index: float        # −1 (caution) to +1 (race)
    centralization: float    # 0 (distributed) to 1 (monopoly)
    oversight: float         # 0 (ungoverned) to 1 (full governance)
    trust: float            # 0 (distrust) to 1 (high trust)
```

**Phase diagram**: Map in (race_index, centralization) space
- Region 1: High race, low centralization → Multipolar race
- Region 2: High race, high centralization → Hegemon race
- Region 3: Low race, high centralization → Coordinated slowdown
- Region 4: Low race, low centralization → Fragmented caution

---

## Connecting to Discrete-Time HA

**In discrete-time hybrid automaton**:

**Continuous state x[k]**:
```python
x = [race_index, centralization, oversight, trust]
```

These are the **order parameters**!

**Modes q ∈ Q**:
- q = "baseline": Normal times
- q = "race": Race dynamics (r growing)
- q = "coordination": Slowdown (r decreasing)

**Dynamics f_q(x, u)**:
- Describes how order parameters evolve in each mode
- Captures effective dynamics after coarse-graining micro details

**Guards G**:
- Based on order parameter thresholds
- Example: race_index > 0.7 → transition to race mode

---

## Coarse-Graining Example

### Micro → Macro Pipeline

**Micro (ABM)**:
```python
# 100 actors, each with stance, compute, alignment view
actors = [
    Actor(id=1, stance=0.8, compute=1e20, alignment_belief=0.6),
    Actor(id=2, stance=-0.3, compute=5e19, alignment_belief=0.8),
    ...
]
```

**Meso (Blocs)**:
Group into blocs by similarity:
```python
blocs = {
    "US_labs": aggregate([actor_1, actor_7, actor_23]),
    "China": aggregate([actor_2, actor_15]),
    "Regulators": aggregate([actor_5, actor_11, actor_44]),
}
```

**Macro (Order Parameters)**:
```python
race_index = weighted_average([
    (0.9, "US_labs"),    # Weight by compute
    (0.7, "China"),
    (-0.5, "Regulators")
])  # → r ≈ 0.7 (race-leaning)
```

---

## Why This Matters

### 1. Principled Reduction

**Without stat mech**: "We'll just average things and hope it works"

**With stat mech**: "Ensemble averages of micro configs give macro observables via Boltzmann weighting"

**Benefit**: Know what you're doing mathematically

---

### 2. Parameter Counting

**Micro model**: 100 actors × 10 params each = 1000 parameters

**Macro model**: 4 order parameters

**Reduction**: 1000 → 4 via coarse-graining

**Benefit**: Tractable calibration and analysis

---

### 3. Universality Preparation

**Key insight from stat mech**: Many micro models → same macro behavior

**Implications**:
- Don't overfit to one detailed ABM
- Focus on robust macro patterns (order parameters)
- Different micro details can give same effective theory

See [universality.md](./universality.md) for details.

---

### 4. Connection to EFT

**Effective Field Theory** = Field theory for order parameters

**Example**: Landau-Ginzburg theory for magnetization
```
F[m] = ∫ d³x [a(T)m² + bm⁴ + c(∇m)²]
```

**For AI governance**: Similar theory for race index r(x, t)

**Benefit**: All micro details encoded in a, b, c coefficients

See [effective_theory.md](./effective_theory.md) for details.

---

## Summary

**Statistical mechanics provides**:
1. **Ensemble averages**: Macro observables from micro configs
2. **Order parameters**: Few variables that distinguish phases
3. **Boltzmann distribution**: Probability of configurations
4. **Coarse-graining**: Principled micro → macro reduction

**For AI governance**:
- Actors with stances → spins on lattice
- Tension function → Hamiltonian
- Social volatility → temperature
- Race index, centralization → order parameters
- ABM ensemble → micro configs
- AI-2027 state → macro order parameters

**Result**: Principled connection between detailed ABM and simple macro model

**Next**: See how order parameters change between phases in [phase_transitions.md](./phase_transitions.md)
