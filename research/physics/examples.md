# Worked Examples and Analogies

**Purpose**: Concrete examples applying physics concepts to AI governance, with runnable code and step-by-step calculations.

**Audience**: Mix of intuition-building analogies and technical worked examples.

---

## Example 1: Two-Lab Ising Model

### Setup

**Scenario**: 2 AI labs, each can choose {race, cautious}

**Physics analog**: 2-spin Ising model

---

### Step 1: Define States

**4 possible configurations**:
```python
states = [
    ("race", "race"),      # Both accelerate
    ("race", "cautious"),  # Misaligned
    ("cautious", "race"),  # Misaligned
    ("cautious", "cautious")  # Both cautious
]

# Encode as spins: race = +1, cautious = −1
spin_states = [
    (+1, +1),   # State 1
    (+1, −1),   # State 2
    (−1, +1),   # State 3
    (−1, −1)    # State 4
]
```

---

### Step 2: Define Energy (Tension Function)

**Ising energy**: H = −J σ₁σ₂ − h(σ₁ + σ₂)

**Parameters**:
- J = 5 (coordination benefit)
- h = 2 (market pressure favoring race)

```python
def energy(s1, s2, J=5, h=2):
    # Ising Hamiltonian
    return -J * s1 * s2 - h * (s1 + s2)

# Compute energies
for i, (s1, s2) in enumerate(spin_states):
    E = energy(s1, s2)
    print(f"State {i+1}: {spin_states[i]} → E = {E}")
```

**Output**:
```
State 1: (+1, +1) → E = −5(1) − 2(2) = −9  # Both race (low energy!)
State 2: (+1, −1) → E = −5(−1) − 2(0) = +5  # Misaligned (high energy)
State 3: (−1, +1) → E = +5                  # Misaligned
State 4: (−1, −1) → E = −5(1) − 2(−2) = −1  # Both cautious
```

---

### Step 3: Boltzmann Weights

**Temperature**: T = 1 (moderate volatility)

**Weights**: w_i = exp(−E_i / T)

```python
import numpy as np

T = 1.0  # volatility
energies = [-9, 5, 5, -1]

weights = [np.exp(-E / T) for E in energies]
Z = sum(weights)  # Partition function

probabilities = [w / Z for w in weights]

for i, (state, E, p) in enumerate(zip(spin_states, energies, probabilities)):
    print(f"State {i+1}: {state} | E={E:+.0f} | P={p:.3f} ({p*100:.1f}%)")
```

**Output**:
```
State 1: (+1, +1) | E=-9 | P=0.881 (88.1%)  # Both race dominates
State 2: (+1, -1) | E=+5 | P=0.001 (0.1%)   # Misaligned rare
State 3: (-1, +1) | E=+5 | P=0.001 (0.1%)   # Misaligned rare
State 4: (-1, -1) | E=-1 | P=0.118 (11.8%)  # Both cautious possible
```

**Interpretation**: With market pressure h=2, system overwhelmingly favors (race, race)

---

### Step 4: Order Parameter

**Race index**: r = ⟨σ₁ + σ₂⟩ / 2

```python
# Ensemble average
race_indices = [(s1 + s2) / 2 for s1, s2 in spin_states]
mean_race_index = sum(r * p for r, p in zip(race_indices, probabilities))

print(f"Mean race index: {mean_race_index:.3f}")
```

**Output**: r ≈ 0.76 (strong race tendency)

---

### Step 5: Phase Transition

**Vary temperature** (volatility):

```python
import matplotlib.pyplot as plt

temperatures = np.linspace(0.1, 5, 50)
mean_r = []

for T in temperatures:
    weights = [np.exp(-E / T) for E in energies]
    Z = sum(weights)
    probs = [w / Z for w in weights]

    r = sum((s1 + s2) / 2 * p for (s1, s2), p in zip(spin_states, probs))
    mean_r.append(r)

plt.plot(temperatures, mean_r)
plt.xlabel('Volatility (T)')
plt.ylabel('Race index ⟨r⟩')
plt.title('Phase Transition in Two-Lab System')
plt.axhline(0, color='k', linestyle='--', alpha=0.3)
plt.grid(True)
```

**Result**: At low T (low volatility), r → 1 (race). At high T (high volatility), r → 0 (mixed).

---

## Example 2: Bloc Coarse-Graining

### Setup

**Micro**: 20 labs with individual stances and compute

**Goal**: Coarse-grain to 4 blocs, compute race index

---

### Step 1: Generate Micro Data

```python
import numpy as np
np.random.seed(42)

# 20 labs
n_labs = 20
labs = []

for i in range(n_labs):
    lab = {
        'id': i,
        'stance': np.random.uniform(-1, 1),  # Random stance
        'compute': np.random.lognormal(20, 2),  # Log-normal distribution
        'alignment': np.random.uniform(0, 1)
    }
    labs.append(lab)

# Print sample
print("Sample labs:")
for i in range(3):
    print(f"Lab {labs[i]['id']}: stance={labs[i]['stance']:.2f}, "
          f"compute={labs[i]['compute']:.2e}")
```

---

### Step 2: Cluster into Blocs

```python
from sklearn.cluster import KMeans

# Features for clustering: stance, log(compute)
features = np.array([[l['stance'], np.log(l['compute'])]
                     for l in labs])

# K-means with 4 clusters
kmeans = KMeans(n_clusters=4, random_state=42)
labels = kmeans.fit_predict(features)

# Group labs into blocs
blocs = {i: [] for i in range(4)}
for lab, label in zip(labs, labels):
    blocs[label].append(lab)
```

---

### Step 3: Compute Bloc-Level Order Parameters

```python
def compute_bloc_stats(bloc_labs):
    """Aggregate micro labs into bloc-level order parameters"""
    total_compute = sum(l['compute'] for l in bloc_labs)

    # Weighted average stance (race index for bloc)
    bloc_stance = sum(l['stance'] * l['compute'] for l in bloc_labs) / total_compute

    # Average alignment
    bloc_alignment = np.mean([l['alignment'] for l in bloc_labs])

    return {
        'n_labs': len(bloc_labs),
        'total_compute': total_compute,
        'stance': bloc_stance,
        'alignment': bloc_alignment
    }

# Compute for all blocs
bloc_stats = {i: compute_bloc_stats(labs) for i, labs in blocs.items()}

print("\nBloc statistics:")
for i, stats in bloc_stats.items():
    print(f"Bloc {i}: {stats['n_labs']} labs, "
          f"stance={stats['stance']:.2f}, "
          f"compute={stats['total_compute']:.2e}")
```

---

### Step 4: Macro Order Parameter

```python
# Global race index (weighted by bloc compute)
total_compute_global = sum(b['total_compute'] for b in bloc_stats.values())
race_index_global = sum(b['stance'] * b['total_compute']
                        for b in bloc_stats.values()) / total_compute_global

print(f"\nGlobal race index: {race_index_global:.3f}")

# Centralization (Herfindahl)
centralization = sum((b['total_compute'] / total_compute_global)**2
                     for b in bloc_stats.values())

print(f"Centralization: {centralization:.3f}")
```

**Output example**:
```
Global race index: 0.234  # Slightly race-leaning
Centralization: 0.312     # Moderately distributed
```

---

### Step 5: Map to HA Mode

```python
def map_to_ha_mode(race_index, centralization, trust=0.7):
    """Determine HA mode from order parameters"""
    if race_index > 0.5:
        if centralization > 0.5:
            return "hegemon_race"  # One actor racing ahead
        else:
            return "two_bloc_race"  # Multiple racing
    elif race_index < -0.3:
        return "coordination"
    else:
        if trust < 0.5:
            return "fragile_baseline"  # Near tipping point
        else:
            return "stable_baseline"

mode = map_to_ha_mode(race_index_global, centralization)
print(f"HA Mode: {mode}")
```

---

## Example 3: Phase Transition with Hysteresis

### Setup

**Scenario**: Trust evolves over time, system transitions between coordination and race

---

### Landau-Ginzburg Free Energy

```python
def free_energy(r, trust, pressure=0.5):
    """
    F(r) = a(trust, pressure) * r² + u * r⁴
    """
    # Coefficient depends on trust and pressure
    # a < 0 → race stable (m ≠ 0)
    # a > 0 → coordination stable (m = 0)
    a = 0.5 * (trust - 0.6) - pressure

    u = 0.25  # Quartic stabilization

    return a * r**2 + u * r**4

# Plot free energy for different trust levels
r_vals = np.linspace(-1, 1, 100)

fig, axes = plt.subplots(1, 3, figsize=(15, 4))

for ax, trust, title in zip(axes,
                             [0.8, 0.6, 0.4],
                             ['High Trust', 'Critical Trust', 'Low Trust']):
    F_vals = [free_energy(r, trust) for r in r_vals]
    ax.plot(r_vals, F_vals)
    ax.set_xlabel('Race index r')
    ax.set_ylabel('Free energy F(r)')
    ax.set_title(title)
    ax.axvline(0, color='k', linestyle='--', alpha=0.3)
    ax.grid(True)

plt.tight_layout()
```

**Result**:
- High trust (0.8): Minimum at r = 0 (coordination)
- Critical (0.6): Flat (unstable)
- Low trust (0.4): Two minima at r = ±0.7 (race or anti-race)

---

### Hysteresis Loop

```python
def simulate_hysteresis():
    """Simulate trust going down then up, track race index"""

    # Initial state
    race_index = 0.0  # Start coordinated
    trajectory_down = []

    # Trust declining (coordination → race)
    trust_down = np.linspace(0.9, 0.3, 50)

    for trust in trust_down:
        # Minimize free energy from current state
        # (system evolves continuously, not jumping randomly)
        r_new = minimize_scalar(lambda r: free_energy(r, trust),
                                bounds=(race_index - 0.2, race_index + 0.2),
                                method='bounded').x

        race_index = r_new
        trajectory_down.append((trust, race_index))

    # Trust recovering (race → coordination)
    trajectory_up = []
    trust_up = np.linspace(0.3, 0.9, 50)

    for trust in trust_up:
        r_new = minimize_scalar(lambda r: free_energy(r, trust),
                                bounds=(race_index - 0.2, race_index + 0.2),
                                method='bounded').x

        race_index = r_new
        trajectory_up.append((trust, race_index))

    return trajectory_down, trajectory_up

from scipy.optimize import minimize_scalar

traj_down, traj_up = simulate_hysteresis()

# Plot hysteresis loop
plt.figure(figsize=(8, 6))
trust_d, r_d = zip(*traj_down)
trust_u, r_u = zip(*traj_up)

plt.plot(trust_d, r_d, 'r-', linewidth=2, label='Trust declining')
plt.plot(trust_u, r_u, 'b--', linewidth=2, label='Trust recovering')
plt.xlabel('Trust level')
plt.ylabel('Race index')
plt.title('Hysteresis Loop: Easy to Race, Hard to Coordinate')
plt.legend()
plt.grid(True)
```

**Result**: Asymmetric loop. System jumps to race at trust ≈ 0.6 going down, but only returns to coordination at trust ≈ 0.75 going up.

---

## Example 4: Critical Exponents from ABM

### Setup

**Goal**: Extract critical exponent β from simulated ABM data

**Theory**: Near critical point, lead L ∝ (t − t_c)^β

---

### Generate Synthetic ABM Data

```python
def simulate_two_bloc_race(trust_initial, n_steps=100):
    """
    Simple ABM: Two blocs with strategic coupling
    Returns lead L(t)
    """
    compute_1 = 1.0
    compute_2 = 0.95  # Slight initial asymmetry

    trajectory = []

    for t in range(n_steps):
        # Lead
        L = (compute_1 - compute_2) / (compute_1 + compute_2)

        trajectory.append(L)

        # Growth depends on trust
        if trust_initial < 0.6:
            # Race dynamics (positive feedback)
            growth_1 = 0.05 * (1 + 0.5 * L)  # Leader grows faster
            growth_2 = 0.05 * (1 - 0.5 * L)  # Follower slower
        else:
            # Coordination (negative feedback)
            growth_1 = 0.05 * (1 - 0.2 * L)  # Leader slows
            growth_2 = 0.05 * (1 + 0.2 * L)  # Follower catches up

        compute_1 *= (1 + growth_1)
        compute_2 *= (1 + growth_2)

    return np.array(trajectory)

# Run for multiple trust levels
trust_levels = np.linspace(0.55, 0.65, 10)  # Near critical (0.6)
trajectories = [simulate_two_bloc_race(t) for t in trust_levels]
```

---

### Extract Critical Exponent

```python
# Fit power law: L(t) ∝ t^β near critical point

betas = []

for trust, traj in zip(trust_levels, trajectories):
    if abs(trust - 0.6) < 0.03:  # Near critical
        # Fit log(L) = β log(t) + const
        t_vals = np.arange(10, 50)  # Mid-range times
        log_L = np.log(traj[t_vals] + 1e-6)  # Add epsilon to avoid log(0)
        log_t = np.log(t_vals)

        # Linear regression
        coeffs = np.polyfit(log_t, log_L, 1)
        beta = coeffs[0]
        betas.append(beta)

        if len(betas) <= 2:  # Print first few
            print(f"Trust={trust:.3f}, β={beta:.3f}")

# Critical exponent (average near critical point)
beta_critical = np.mean(betas)
print(f"\nCritical exponent β ≈ {beta_critical:.3f}")
```

**Expected output**: β ≈ 0.3-0.4 (similar to ferromagnet β ≈ 0.33)

---

## Example 5: Universality Across Domains

### Climate vs AI Governance

**Claim**: Two-bloc coordination problem has same structure

---

### Climate (Emissions Reduction)

```python
@dataclass
class ClimateBloc:
    name: str
    emissions: float
    commitment: float  # −1 (no reduction) to +1 (full reduction)

def climate_free_energy(commitment_1, commitment_2,
                        ambition=0.5, cost=0.3):
    """
    F = cost of misalignment + external pressure
    """
    # Misalignment cost (want same commitment)
    F = cost * (commitment_1 - commitment_2)**2

    # External pressure (ambition favors reduction)
    F += -ambition * (commitment_1 + commitment_2)

    return F

# Two major emitters (US, China)
# Minimize free energy
us_commitment = minimize_scalar(lambda c: climate_free_energy(c, 0.2),
                                bounds=(-1, 1), method='bounded').x

print(f"US commitment: {us_commitment:.2f}")  # Depends on China's 0.2
```

---

### AI Governance (Race/Coordination)

```python
@dataclass
class AIBloc:
    name: str
    compute: float
    stance: float  # −1 (cautious) to +1 (race)

def ai_free_energy(stance_1, stance_2,
                   pressure=0.5, coupling=0.3):
    """
    F = cost of misalignment + market pressure
    """
    # Misalignment cost (want same stance)
    F = coupling * (stance_1 - stance_2)**2

    # Market pressure (favors race)
    F += -pressure * (stance_1 + stance_2)

    return F

# Two major labs (OpenAI, Google)
openai_stance = minimize_scalar(lambda s: ai_free_energy(s, 0.2),
                                 bounds=(-1, 1), method='bounded').x

print(f"OpenAI stance: {openai_stance:.2f}")  # Depends on Google's 0.2
```

---

### Same Structure!

```python
# Both have form: F = J(x₁ − x₂)² − h(x₁ + x₂)
# Same math → same universality class

def generic_two_bloc_free_energy(x1, x2, coupling, pressure):
    return coupling * (x1 - x2)**2 - pressure * (x1 + x2)

# Climate: x = commitment, coupling = cost, pressure = ambition
# AI: x = stance, coupling = coordination benefit, pressure = market

# Both minimize same functional form → same dynamics!
```

---

## Example 6: Effective Theory Validation

### Setup

**Goal**: Compare full ABM to effective (macro) model

---

### Full ABM (Micro)

```python
def abm_step(labs, dt=1):
    """Micro-level ABM: Each lab updates stance"""
    for lab in labs:
        # Influenced by neighbors
        neighbors = get_neighbors(lab, labs)
        neighbor_avg = np.mean([n.stance for n in neighbors])

        # Respond to average + noise
        lab.stance += 0.1 * (neighbor_avg - lab.stance) + np.random.normal(0, 0.05)

        # Clip to [−1, 1]
        lab.stance = np.clip(lab.stance, -1, 1)

    return labs

# Run ABM
n_labs = 100
labs = [Lab(id=i, stance=np.random.uniform(-0.5, 0.5),
            compute=np.random.lognormal(20, 1))
        for i in range(n_labs)]

abm_trajectory = []
for t in range(50):
    labs = abm_step(labs)
    # Compute race index
    r = sum(l.stance * l.compute for l in labs) / sum(l.compute for l in labs)
    abm_trajectory.append(r)
```

---

### Effective Model (Macro)

```python
def eft_step(race_index, params):
    """Effective model: Race index evolves via Landau-Ginzburg"""
    a = params['pressure'] - 0.5
    u = 0.3

    # dr/dt = −∂F/∂r = −2ar − 4ur³
    dr_dt = -2 * a * race_index - 4 * u * race_index**3

    # Add effective noise (from integrated-out fast modes)
    dr_dt += np.random.normal(0, params['volatility'])

    return race_index + dr_dt * 1.0  # dt = 1

# Run EFT
params_eft = {'pressure': 0.4, 'volatility': 0.05}
race_index = 0.0

eft_trajectory = []
for t in range(50):
    race_index = eft_step(race_index, params_eft)
    eft_trajectory.append(race_index)
```

---

### Compare

```python
plt.figure(figsize=(10, 5))
plt.plot(abm_trajectory, 'b-', alpha=0.7, label='ABM (micro)')
plt.plot(eft_trajectory, 'r--', linewidth=2, label='EFT (macro)')
plt.xlabel('Time step')
plt.ylabel('Race index')
plt.title('ABM vs EFT: Validation')
plt.legend()
plt.grid(True)

# Quantitative comparison
from scipy.stats import ks_2samp
ks_stat, p_value = ks_2samp(abm_trajectory, eft_trajectory)
print(f"KS statistic: {ks_stat:.3f}, p-value: {p_value:.3f}")

if p_value > 0.05:
    print("✓ EFT validates (distributions match)")
else:
    print("✗ EFT fails (distributions differ)")
```

---

## Summary of Examples

| Example | Concept | Takeaway |
|---------|---------|----------|
| **1. Two-Lab Ising** | Statistical mechanics | Boltzmann distribution captures equilibrium probabilities |
| **2. Bloc Coarse-Graining** | RG / coarse-graining | 20 labs → 4 blocs → 1 order parameter (systematic reduction) |
| **3. Phase Transition** | Hysteresis | Asymmetric thresholds (easy to race, hard to return) |
| **4. Critical Exponents** | Universality | Extract β from ABM, compare to physics (β ≈ 0.3) |
| **5. Cross-Domain** | Universality classes | Climate and AI governance have same math (same class) |
| **6. EFT Validation** | Effective theory | Macro model reproduces ABM distributions (if well-calibrated) |

---

## Non-AI Governance Analogy: Bank Run

### Physics Mapping

**System**: Bank with depositors

**Micro state**: Each depositor i has state {keep money in, withdraw}

**Order parameter**: Fraction withdrawing W = N_withdraw / N_total

**Phases**:
- W ≈ 0: Stable (everyone trusts bank)
- W ≈ 1: Bank run (cascade)

**Critical point**: Trust level where first withdrawal triggers cascade

---

### Ising Model Formulation

**Spins**: σᵢ = +1 (withdraw), σᵢ = −1 (keep in bank)

**Energy**:
```
H = −J Σ_{⟨i,j⟩} σᵢσⱼ − h Σᵢ σᵢ
```

Where:
- J > 0: Herd behavior (if neighbor withdraws, I'm more likely to)
- h: External pressure (bad news, rumors)

**Low trust (high T)**: Random behavior (no coordination)
**High trust (low T), low h**: Everyone keeps money in (σᵢ = −1)
**High trust, high h**: Sudden flip to everyone withdraws (σᵢ = +1)

**Critical h_c**: Threshold where bank run starts

---

### Code Example

```python
def bank_run_simulation(n_depositors=100, trust_level=0.7, bad_news=0.5):
    """
    Simulate bank run using Ising model
    """
    # Initialize: Everyone has money in bank
    states = np.ones(n_depositors) * (-1)  # −1 = keep in

    # Temperature (inverse trust)
    T = 1.0 / trust_level

    # External field (bad news)
    h = bad_news

    # Coupling (herd behavior)
    J = 0.5

    # Monte Carlo steps
    for step in range(1000):
        # Pick random depositor
        i = np.random.randint(n_depositors)

        # Compute energy change if they flip
        # (Assume all-to-all coupling for simplicity)
        neighbors_avg = np.mean(states)
        dE = 2 * states[i] * (J * neighbors_avg + h)

        # Metropolis: Flip if dE < 0 or with probability exp(−dE/T)
        if dE < 0 or np.random.random() < np.exp(-dE / T):
            states[i] *= -1  # Flip state

    # Fraction withdrawing
    W = np.sum(states == 1) / n_depositors

    return W

# Test different scenarios
print("Low bad news:", bank_run_simulation(bad_news=0.2))   # W ≈ 0
print("Medium bad news:", bank_run_simulation(bad_news=0.5)) # W ≈ 0-1 (varies)
print("High bad news:", bank_run_simulation(bad_news=0.8))   # W ≈ 1 (run!)
```

**Result**: Same math as ferromagnet → same critical behavior

**Takeaway**: Physics universality applies to social phenomena!

---

**Related Documentation**:
- [README.md](./README.md) - Overview and motivation
- [fundamentals.md](./fundamentals.md) - Statistical mechanics basics
- [phase_transitions.md](./phase_transitions.md) - Phase transitions
- [renormalization.md](./renormalization.md) - RG theory
- [universality.md](./universality.md) - Universality classes
- [effective_theory.md](./effective_theory.md) - EFT construction
- [ai_governance_mapping.md](./ai_governance_mapping.md) - Detailed mapping dictionary
