# Renormalization Group Theory

**Purpose**: Apply renormalization group (RG) methods to identify which parameters matter at macro scales and how to systematically coarse-grain from micro to macro.

**Core Question**: When we go from 1000 ABM parameters to 10 macro parameters, which ones survive? Which details wash out?

---

## The Renormalization Group Idea

### The Problem

**Physics**: Ising model has coupling J, external field h, temperature T
- But also: Lattice structure, boundary conditions, spin magnitude, ...
- **Question**: Which parameters matter for macro behavior?

**AI Governance**: ABM has trust, compute growth, incident rate, alliance structure, ...
- But also: Individual lab names, specific policy details, timing, ...
- **Question**: Which parameters matter for 10-year trajectories?

**Answer**: Renormalization Group (RG) tells you which parameters are **relevant** (control macro) vs **irrelevant** (wash out).

---

## Block-Spin Renormalization (Pedagogical)

### Setup: 1D Ising Chain

**Micro**: N spins on a line, each σᵢ ∈ {−1, +1}

**Energy**: H = −J Σᵢ σᵢσᵢ₊₁

**Coarse-graining**: Group spins into blocks of 3
```
Original: ↑ ↑ ↓ | ↓ ↓ ↓ | ↑ ↓ ↑ | ...
           Block 1   Block 2   Block 3

Block spin: Use majority rule
  Block 1: (↑ ↑ ↓) → Σ = +1 → σ'₁ = +1
  Block 2: (↓ ↓ ↓) → Σ = −3 → σ'₂ = −1
  Block 3: (↑ ↓ ↑) → Σ = +1 → σ'₃ = +1
```

**Result**: N/3 block spins (same model, coarser scale)

---

### RG Transformation

**Goal**: Find effective coupling J' for block spins that reproduces macro behavior

**Method**: Match partition functions
```
Z_original({σ}) = Σ_{configs} exp(−βH)
Z_coarse({σ'}) = Σ_{block configs} exp(−βH')
```

**Result**: J' = f(J, T) (depends on original parameters)

**RG flow**: Repeat coarse-graining
```
(J, T) → (J', T') → (J'', T'') → ...
```

---

### Fixed Points

**Definition**: Point where J* = f(J*, T*)
- RG transformation leaves it unchanged
- Represents a **scale-invariant** system

**Examples**:
1. **Trivial fixed point**: J* = 0 (no interactions, high-T phase)
2. **Critical fixed point**: J* = J_c (at phase transition)
3. **Infinite coupling**: J* = ∞ (low-T ordered phase)

**Physical meaning**:
- Systems flow toward fixed points under coarse-graining
- Fixed points = phases (ordered, disordered, critical)

---

## Relevant vs Irrelevant Couplings

### Linearized RG

**Near fixed point**: Expand RG flow
```
J_{n+1} = J_n + λ(J_n − J*) + ...
```

**Eigenvalue λ**:
- λ > 1: **Relevant** - coupling grows under RG
- λ < 1: **Irrelevant** - coupling shrinks under RG
- λ = 1: **Marginal** - logarithmic flow

---

### What Survives at Large Scales?

**Relevant couplings**: Control macro behavior
- Example: Temperature T, external field h
- These determine which phase you're in

**Irrelevant couplings**: Microscopic details
- Example: Lattice type (square vs hexagonal), boundary conditions
- These don't affect macro (except via relevant couplings)

**Key insight**: **Only relevant couplings matter for long-wavelength physics!**

---

### AI Governance Translation

**Relevant parameters** (affect 10-year trajectory):
- Compute growth rate
- Alignment difficulty
- Trust baseline
- Incident rate
- Major power strategic stance

**Irrelevant parameters** (wash out at macro scale):
- Names of specific labs
- Individual researcher opinions
- Exact timing of meetings
- Specific wording of treaties
- Daily news cycle details

**Marginal parameters** (borderline):
- Social media dynamics
- Public opinion shifts
- Regulatory capture details

---

## RG Flow Diagrams

### Ferromagnet Example

**Axes**: (Temperature T, External field h)

**Fixed points**:
- (T = ∞, h = 0): High-T, no field (trivial)
- (T = T_c, h = 0): Critical point
- (T = 0, h = 0): Low-T ordered

**Flow lines**: Trajectories under coarse-graining
```
    T
    ↑
    | ↘ ↘ ↘ ← (T = ∞ fixed point)
    |
    | ← ← * → → (Critical point)
    |    ↓ ↓ ↓
    | ↙ ↙ ↙ ← (T = 0 fixed point)
    +--+--+--+--→ h
       0
```

**Interpretation**:
- Systems flow away from critical point (unstable)
- Flow toward ordered or disordered phases (stable)
- Perturbations in irrelevant directions → back to fixed point

---

### AI Governance RG Flow

**Axes**: (Strategic coupling J, External pressure h)

**Fixed points**:
1. **Coordination basin** (high J, low h): Stable coordination
2. **Race basin** (low J, high h): Stable race
3. **Critical surface** (separating coordination and race)

```python
import numpy as np
import matplotlib.pyplot as plt

J = np.linspace(0, 5, 20)
h = np.linspace(0, 5, 20)
J_grid, h_grid = np.meshgrid(J, h)

# RG flow: dJ/dt, dh/dt
dJ = 2 * (J_grid - 2.5)  # Flow away from J=2.5 (critical)
dh = h_grid - 2.5        # Flow away from h=2.5 (critical)

plt.quiver(J_grid, h_grid, dJ, dh)
plt.xlabel('Strategic coupling J')
plt.ylabel('External pressure h')
plt.title('RG Flow in AI Governance')
```

**Interpretation**:
- If J high, h low → flow to coordination fixed point
- If J low, h high → flow to race fixed point
- Near critical line → small changes matter a lot

---

## Coarse-Graining in Practice

### ABM → Blocs → Macro

**Step 1: Micro (ABM)**
```python
# 100 labs, each with detailed state
labs = [
    Lab(id=1, compute=1e20, alignment=0.6, stance=0.8, ...),
    Lab(id=2, compute=5e19, alignment=0.7, stance=-0.3, ...),
    ...
]
```

**Parameters**: ~1000 (100 labs × 10 params each)

---

**Step 2: Meso (Blocs)**

Group labs by similarity:
```python
def cluster_labs(labs, n_clusters=5):
    # K-means clustering on (stance, compute, alignment)
    features = np.array([(l.stance, np.log(l.compute), l.alignment)
                         for l in labs])
    kmeans = KMeans(n_clusters=n_clusters)
    labels = kmeans.fit_predict(features)

    blocs = {}
    for i in range(n_clusters):
        bloc_labs = [l for l, label in zip(labs, labels) if label == i]
        blocs[f"bloc_{i}"] = aggregate(bloc_labs)

    return blocs

# Result: 5 blocs instead of 100 labs
blocs = cluster_labs(labs)
# blocs = {"US_leaders", "US_followers", "China", "Europe", "Startups"}
```

**Parameters**: ~50 (5 blocs × 10 params each)

---

**Step 3: Macro (Order Parameters)**

Compute macro observables:
```python
def compute_order_parameters(blocs):
    # Race index (weighted by compute)
    total_compute = sum(b.compute for b in blocs.values())
    race_index = sum(b.stance * b.compute for b in blocs.values()) / total_compute

    # Centralization (Herfindahl index)
    shares = [b.compute / total_compute for b in blocs.values()]
    centralization = sum(s**2 for s in shares)

    # Oversight (weighted avg)
    oversight = sum(b.oversight * b.compute for b in blocs.values()) / total_compute

    return {
        'race_index': race_index,
        'centralization': centralization,
        'oversight': oversight,
        'trust': np.mean([b.trust for b in blocs.values()])
    }
```

**Parameters**: ~10 (4 order parameters + 6 effective couplings)

---

### Parameter Reduction

**Micro → Macro pipeline**:
```
1000 params (ABM) → 50 params (blocs) → 10 params (macro)
```

**RG identifies**: Which 10 matter at macro scale

**Method**: Sensitivity analysis + RG reasoning
1. Run ABM ensemble with varied parameters
2. Compute macro outcomes (catastrophe?, when?, who wins?)
3. Sobol sensitivity: Which micro params affect macro most?
4. **High Sobol index → relevant coupling**
5. **Low Sobol index → irrelevant coupling**

---

## Wilson's RG for Field Theory

### Integrating Out Short-Distance Modes

**Setup**: Field theory with action S[φ]

**Idea**: Separate high-frequency (UV) and low-frequency (IR) modes
```
φ(x) = φ_slow(x) + φ_fast(x)
```

**RG step**: Integrate out φ_fast
```
Z = ∫ Dφ_slow Dφ_fast exp(−S[φ_slow + φ_fast])
  = ∫ Dφ_slow exp(−S_eff[φ_slow])
```

Where S_eff encodes effects of φ_fast via changed couplings.

**Result**: Effective theory for long-wavelength modes only

---

### AI Governance Analog

**Fast modes** (high frequency, short timescale):
- Daily news cycles
- Individual tweets, speeches
- Lab internal reorganizations
- Specific bug reports

**Slow modes** (low frequency, long timescale):
- Strategic stances
- Compute accumulation
- Trust trends
- Regulatory regimes

**RG prescription**: Integrate out fast modes → effective theory for slow modes

---

## Effective Couplings

### Running Couplings

**Definition**: Parameters that change with scale

**Example**: Quantum electrodynamics (QED)
- Fine structure constant α ≈ 1/137 at low energy
- α increases at high energy due to vacuum polarization
- α(scale) is a **running coupling**

**RG equation**:
```
dα/d(log μ) = β(α)
```

Where β(α) = RG beta function, μ = energy scale

---

### AI Governance Running Couplings

**Example**: Strategic coupling J(scale)

**At micro scale** (individual labs):
- J_micro = direct communication, collaboration agreements
- Strong coupling within teams, weak between competing labs

**At meso scale** (blocs):
- J_meso = alliance structures, trade dependencies
- Effective coupling includes indirect effects

**At macro scale** (order parameters):
- J_macro = aggregate coordination tendency
- Includes all cascading effects

**RG flow**: J_micro → J_meso → J_macro

**Measurement**:
```python
def measure_coupling(system, scale):
    # Perturb one actor, measure response of others at distance r
    response = system.perturb_and_measure(actor_id=0, distance=scale)

    # Coupling = response decay rate
    # J(scale) = response / perturbation
    return response / perturbation_size
```

**Expectation**: J(scale) changes with scale (generally decreases for AI governance)

---

## Universality and RG

**Key insight**: Systems in same **universality class** flow to same fixed point under RG

**Example**: 3D Ising universality class
- Ferromagnet (spin model)
- Liquid-gas transition (fluid)
- Binary alloy (A/B atoms)

**All have**:
- Same critical exponents (β = 0.33, ν = 0.63, ...)
- Same RG fixed point
- Different microscopic details (irrelevant couplings)

**Reason**: RG flow washes out irrelevant details, only relevant couplings survive

---

### AI Governance Universality Classes

**Hypothesis**: Families of AI governance scenarios with same macro behavior

**Class 1: Two-Bloc Race**
- US vs China
- OpenAI vs Google
- NATO vs BRICS
- **Common macro**: Race dynamics with eventual leader

**Class 2: Hegemon**
- Single dominant actor
- Compute monopoly
- **Common macro**: Unilateral control

**Class 3: Multilateral Governance**
- Many comparable actors
- Strong coordination institutions
- **Common macro**: Stable cooperative equilibrium

**RG prediction**: Different micro details (country names, company names) → same macro trajectory within class

---

## Perturbative RG

### Epsilon Expansion

**Trick**: Do RG near dimension where problem is solvable

**Ising model**: Solvable in d = 4 dimensions (mean-field)

**Physical interest**: d = 3 dimensions

**Method**: Expand in ε = 4 − d
- Calculate critical exponents as power series in ε
- β = 1/2 + O(ε), ν = 1/2 + ε/6 + O(ε²), ...
- Set ε = 1 for d = 3: β ≈ 0.33, ν ≈ 0.63

**Result**: Accurate predictions from controlled approximation

---

### AI Governance Expansion

**Analog**: Expand around solvable limit

**Example**: Expand around mean-field (all actors see average)
- Mean-field is solvable (single self-consistency equation)
- Real system has spatial/network structure
- Treat structure as perturbation

**Method**:
1. Solve mean-field: r₀ = tanh(β(J·r₀ + h))
2. Add network corrections: r = r₀ + δr
3. δr = O(network_structure_strength)

**Result**: Systematic corrections to mean-field predictions

---

## Practical RG for AI Governance

### Algorithm

**Step 1**: Build detailed ABM (micro)
- 100 labs with individual parameters
- Detailed game-theoretic interactions

**Step 2**: Cluster into blocs (meso)
- K-means or hierarchical clustering
- 5-10 blocs with effective parameters

**Step 3**: Fit macro model to bloc dynamics
- Run ABM ensemble (N=1000)
- Extract order parameters: r(t), c(t), o(t), ...
- Fit discrete-time HA to order parameter trajectories

**Step 4**: Identify relevant couplings
- Sobol sensitivity analysis
- High Sobol → relevant (include in macro model)
- Low Sobol → irrelevant (can fix or ignore)

**Step 5**: Validate universality
- Run multiple ABM variants (different micro details)
- Check if they converge to same macro behavior
- If yes → universality class identified

---

### Python Sketch

```python
import numpy as np
from sklearn.cluster import KMeans
from SALib.analyze import sobol

# Step 1: Run detailed ABM
def run_abm(params):
    # 100 labs, detailed dynamics
    trajectory = simulate_detailed_abm(params)
    return trajectory

# Step 2: Coarse-grain to blocs
def coarse_grain(labs):
    features = np.array([(l.stance, np.log(l.compute)) for l in labs])
    kmeans = KMeans(n_clusters=5)
    labels = kmeans.fit_predict(features)

    blocs = {}
    for i in range(5):
        blocs[i] = aggregate([l for l, lbl in zip(labs, labels) if lbl == i])
    return blocs

# Step 3: Extract order parameters
def extract_order_params(trajectory):
    return {
        'race_index': weighted_avg([l.stance for l in trajectory[-1]]),
        'centralization': herfindahl([l.compute for l in trajectory[-1]]),
        # ...
    }

# Step 4: Sensitivity analysis
problem = {
    'num_vars': 20,
    'names': ['trust_0', 'growth_rate', 'J_coupling', ...],
    'bounds': [[0.5, 1.0], [0.1, 0.3], [0, 5], ...]
}

# Run ensemble
Y = []
for params in sample_parameter_space(problem, N=1000):
    traj = run_abm(params)
    outcome = extract_order_params(traj)['race_index']
    Y.append(outcome)

# Sobol analysis
Si = sobol.analyze(problem, np.array(Y))
print("First-order indices:", Si['S1'])  # Which params matter most?

# Result: Focus macro model on high-Sobol parameters
relevant_params = [name for name, s1 in zip(problem['names'], Si['S1'])
                   if s1 > 0.1]  # Threshold for relevance
```

---

## RG and Effective Field Theory

### Connection

**RG provides**:
- Which couplings survive at large scales (relevant)
- Values of effective couplings (running couplings)
- Structure of effective theory (symmetries, terms)

**EFT uses**:
- Effective couplings from RG
- Only relevant operators
- Valid at scales >> microscopic cutoff

**Example**: Landau-Ginzburg theory for magnetization
```
F[m] = ∫ d³x [r(T)m² + um⁴ + c(∇m)²]
```

**RG determines**:
- r(T) = a(T − T_c) (relevant coupling, controls phase)
- u = positive constant (relevant, stabilizes)
- c = stiffness (relevant, gradient cost)
- Higher-order terms m⁶, m⁸, ... irrelevant (drop them!)

---

### AI-2027 as EFT with RG Couplings

**Effective theory**: Discrete-time HA for order parameters

**Dynamics in "race" mode**:
```python
def race_dynamics(x, u, params):
    r, c, o, t = x  # Order parameters

    # RG-informed couplings
    alpha = params['growth_rate']       # Relevant
    beta = params['alignment_progress'] # Relevant
    J = params['strategic_coupling']    # Relevant

    # Effective equations (coarse-grained from ABM)
    r_next = r + alpha * r * (1 - r)  # Logistic growth
    c_next = c + beta * (1 - c)       # Alignment progress
    o_next = o - 0.05                 # Oversight erosion
    t_next = t - J * r**2             # Trust decays with race intensity

    return np.array([r_next, c_next, o_next, t_next])
```

**Parameters**: Fitted from ABM, only relevant couplings included

**Validation**: Does macro model match ABM ensemble?

---

## Summary

**Renormalization Group provides**:
1. **Coarse-graining**: Systematic micro → macro reduction
2. **Relevant vs irrelevant**: Which parameters matter at large scales
3. **Running couplings**: How parameters change with scale
4. **Fixed points**: Scale-invariant phases (ordered, disordered, critical)
5. **Universality**: Different micro → same macro (if same relevant couplings)

**For AI governance**:
- Cluster labs → blocs → order parameters (coarse-graining)
- Sobol sensitivity identifies relevant couplings
- Irrelevant details (lab names, specific events) wash out
- Universality classes: Two-bloc race, hegemon, multilateral
- Effective couplings in AI-2027 macro model

**For modeling**:
- ABM = micro theory (all details)
- Blocs = meso theory (clustered actors)
- AI-2027 = macro EFT (order parameters only)
- RG identifies which ABM parameters map to macro couplings

**Practical workflow**:
1. Build detailed ABM
2. Run ensemble (N=1000)
3. Sobol analysis → identify relevant parameters
4. Coarse-grain to blocs
5. Fit macro HA to order parameter dynamics
6. Validate: Does macro reproduce ABM ensemble statistics?

**Next**: See how universality classes group scenarios in [universality.md](./universality.md)
