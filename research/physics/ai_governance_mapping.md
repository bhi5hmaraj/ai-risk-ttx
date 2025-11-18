# Physics → AI Governance Mapping

**Purpose**: Detailed dictionary mapping physics concepts to AI governance modeling, with specific examples and mathematical correspondences.

**Use**: Reference guide for applying physics intuition to AI-2027 modeling.

---

## Core Mapping Table (Extended)

| Physics Concept | Ferromagnet | AI Governance | Mathematical Form |
|-----------------|-------------|---------------|-------------------|
| **Microscopic DOF** | Spins σᵢ ∈ {−1, +1} | Actor stances sᵢ ∈ [−1, +1] | σᵢ, sᵢ |
| **Lattice** | Regular grid (square, cubic) | Actor network (power law, geopolitical) | Graph G = (V, E) |
| **Hamiltonian** | H = −J Σ σᵢσⱼ − h Σ σᵢ | T = −J Σ sᵢsⱼ − h Σ wᵢsᵢ | Energy/tension function |
| **Coupling** | J > 0 (ferromagnetic) | Strategic coupling (coordination benefit) | J ∈ [0, ∞) |
| **External field** | h (magnetic field) | Market pressure, security threats | h ∈ ℝ |
| **Temperature** | T (thermal noise) | Social volatility, information chaos | T ∈ [0, ∞) |
| **Partition function** | Z = Σ exp(−βH) | Z = Σ exp(−T/volatility) | Σ_{configs} exp(−E/kT) |
| **Boltzmann weight** | p ∝ exp(−βH) | p ∝ exp(−tension/volatility) | Probability of config |
| **Order parameter** | Magnetization m = ⟨Σ σᵢ⟩/N | Race index r = ⟨Σ wᵢsᵢ⟩ / Σ wᵢ | Macro observable |
| **Phases** | Ferromagnet (m ≠ 0), paramagnet (m = 0) | Race (r > 0.5), coordination (r < −0.3) | Distinct macro regimes |
| **Critical point** | T = T_c, h = 0 | Trust = 0.6, pressure = moderate | Phase boundary |
| **Correlation length** | ξ ∝ \|T − T_c\|^{−ν} | Influence distance ∝ \|trust − trust_c\|^{−ν} | Diverges at critical |
| **Susceptibility** | χ = ∂m/∂h | Policy leverage = ∂r/∂(intervention) | Response to external field |
| **Specific heat** | C_v = ∂E/∂T | Volatility response = ∂⟨T⟩/∂(information) | Energy fluctuations |

---

## Order Parameters (Detailed)

### Race Index

**Physics analog**: Magnetization m = ⟨1/N Σᵢ σᵢ⟩

**Definition**:
```
r = Σᵢ wᵢ sᵢ / Σᵢ wᵢ
```

Where:
- wᵢ = actor weight (compute, influence)
- sᵢ = stance (−1 = cautious, +1 = race)

**Range**: [−1, +1]
- r > 0.5: Race phase
- r < −0.3: Coordination phase
- r ∈ [−0.3, 0.5]: Mixed/multipolar

**Dynamics** (Landau-Ginzburg):
```
dr/dt = −∂F/∂r = −ar − ur³ + noise
```

---

### Centralization

**Physics analog**: Density contrast ρ_max / ρ_avg (liquid-gas)

**Definition**:
```
c = Σᵢ (compute_i / total_compute)²  (Herfindahl index)
```

**Range**: [1/N, 1]
- c ≈ 1: Monopoly (one actor has all compute)
- c ≈ 1/N: Uniform distribution

**Interpretation**: Probability that two random FLOPs belong to same actor

---

### Oversight Strength

**Physics analog**: Superconducting gap Δ (strength of ordered phase)

**Definition**:
```
o = (governed_compute / total_compute) × (enforcement_strength)
```

**Range**: [0, 1]
- o ≈ 1: Strong governance (all compute under effective oversight)
- o ≈ 0: Ungoverned (no effective control)

**Dynamics**: Can grow (regulation) or decay (capability proliferation)

---

### Trust Level

**Physics analog**: Inverse temperature β = 1/(k_B T) (order vs disorder)

**Definition**:
```
t = perceived_cooperation_likelihood
```

**Range**: [0, 1]
- t ≈ 1: High trust (coordination likely)
- t ≈ 0: Distrust (race likely)

**Dynamics**: Decays with incidents, grows with transparency/cooperation

---

## Phase Transitions (Detailed)

### Race Tipping Point (First-Order)

**Physics analog**: Liquid → gas (first-order transition with latent heat)

**Mechanism**:
- Trust crosses critical threshold (T_c ≈ 0.6)
- Coordination metastable, race stable
- Small perturbation → sudden cascade to race

**Order parameter jump**: Δr ≈ 1.3 (from −0.5 to +0.8)

**Hysteresis**:
```python
# Going down (coordination → race)
if trust < 0.6 and race_index < 0:
    race_index = 0.8  # Jump to race

# Going up (race → coordination)
if trust > 0.85 and race_index > 0:  # Higher threshold!
    race_index = -0.5  # Return to coordination
```

**Latent heat analog**: Trust suddenly drops further during transition (additional "energy" released)

---

### Coordination Collapse (Second-Order)

**Physics analog**: Ferromagnet → paramagnet (continuous transition)

**Mechanism**:
- Trust gradually erodes (incidents, information chaos)
- Coordination strength decays continuously
- No sudden jump, but accelerating near critical point

**Power law**: r ∝ (trust_c − trust)^β near critical point

**Correlation length diverges**: One actor's defection affects more and more others

---

### Capability Percolation (Percolation Transition)

**Physics analog**: Percolation transition (connectivity)

**Mechanism**:
- Capabilities spread through network
- Below threshold: Isolated clusters
- Above threshold: Giant connected component (in-the-wild)

**Order parameter**: p = fraction of actors with dangerous capability

**Critical point**: p_c ≈ 0.25 (depends on network structure)

**Power law** (at p_c): Cluster size ∝ s^{−τ} where τ ≈ 2.2 (2D), 2.05 (3D)

---

## Renormalization Group (Detailed)

### Block-Spin Transformation

**Physics**: Group 3×3 spins → 1 block spin (majority rule)

**AI governance**: Group 10 labs → 1 bloc (weighted average)

```python
def coarse_grain(labs, bloc_size=10):
    blocs = []
    for i in range(0, len(labs), bloc_size):
        group = labs[i:i+bloc_size]

        # Bloc stance = weighted average
        total_compute = sum(l.compute for l in group)
        bloc_stance = sum(l.stance * l.compute for l in group) / total_compute

        # Effective coupling (inherited from members)
        bloc_coupling = np.mean([l.coupling for l in group])

        blocs.append(Bloc(stance=bloc_stance, coupling=bloc_coupling,
                          compute=total_compute))

    return blocs
```

---

### RG Flow Equations

**Physics**: dJ/dℓ = β(J) where ℓ = log(scale)

**AI governance**: How strategic coupling changes with coarse-graining
```
dJ/dℓ = −ε J + J² + ...
```

Where ε = dimensionless parameter

**Fixed points**:
- J* = 0: Trivial (no coupling, race phase)
- J* = ε: Non-trivial (coordination stable if J > J*)

---

### Relevant vs Irrelevant Parameters

**Relevant** (control macro):
| Parameter | Sobol Index | RG Dimension | Effect |
|-----------|-------------|--------------|--------|
| Compute growth rate | 0.35 | +0.8 | Grows under RG |
| Strategic coupling J | 0.28 | +0.5 | Grows under RG |
| Trust baseline | 0.22 | +0.4 | Grows under RG |
| Incident rate | 0.15 | +0.3 | Grows under RG |

**Irrelevant** (wash out):
| Parameter | Sobol Index | RG Dimension | Effect |
|-----------|-------------|--------------|--------|
| Lab names | 0.00 | −1.5 | Shrinks under RG |
| Meeting timing | 0.01 | −1.2 | Shrinks under RG |
| Specific personnel | 0.02 | −0.8 | Shrinks under RG |
| Treaty wording | 0.03 | −0.5 | Shrinks under RG |

**Implication**: Focus measurement on relevant parameters only

---

## Universality Classes (Detailed)

### Two-Bloc Race

**Physics analog**: 3D Ising (Z₂ symmetry)

**Coarse structure**:
- Two dominant actors (comparable power)
- Strategic competition (positive feedback)
- Trust-dependent

**Critical exponents** (hypothesized):
- β_race ≈ 0.3: Lead growth L ∝ (t − t_c)^{0.3}
- ν_race ≈ 0.6: Influence distance ξ ∝ |trust − trust_c|^{−0.6}

**Scaling function**: L(t, trust) = (t − t_c)^{β_race} f((trust − trust_c) / (t − t_c)^{1/ν})

---

### Hegemon

**Physics analog**: Mean-field (single mode dominates)

**Coarse structure**:
- One dominant actor (>50% compute)
- No competition

**Exponents**: Mean-field (β = 1/2, ν = 1/2)

**Scaling**: Market share m ∝ √(t − t_tipping)

---

### Multilateral Coordination

**Physics analog**: XY model (O(2) symmetry, continuous angles)

**Coarse structure**:
- Many comparable actors
- Strong institutions (long-range interaction)

**Exponents**: Different from Ising (different symmetry)

---

## Effective Field Theory (Detailed)

### Landau-Ginzburg Free Energy

**Physics**:
```
F[m] = ∫ d³x [a(T − T_c) m² + u m⁴ + c (∇m)² + ...]
```

**AI governance**:
```python
def free_energy(state):
    r, c, o, t = state

    # Quadratic term (depends on pressure, trust)
    a = (pressure - pressure_c) / trust
    F = a * r**2

    # Quartic term (stabilization)
    F += u * r**4

    # Coupling terms
    F += -J * r * o  # Race and oversight anti-correlated
    F += lambda_t * (1 - t)**2  # Trust cost

    return F
```

**Dynamics**: dr/dt = −∂F/∂r + noise

---

### Wilson Coefficients

**Fitted from ABM**:

| Coefficient | Value | Meaning |
|-------------|-------|---------|
| a₀ | −0.5 | Pressure sensitivity |
| u | 0.3 | Quartic stabilization |
| c | 0.1 | Spatial stiffness (bloc coupling) |
| J | 0.2 | Race-oversight coupling |
| λ_t | 0.4 | Trust cost weight |

**Fitting procedure**:
```python
def fit_wilson_coefficients(abm_ensemble):
    # Extract order parameter trajectories
    trajectories = [extract_order_params(run) for run in abm_ensemble]

    # Define EFT dynamics with parameters
    def eft_dynamics(x, params):
        a0, u, c, J, lambda_t = params
        # ... (as above)
        return dx_dt

    # Optimize parameters to match ABM
    params_opt = minimize(
        lambda p: loss(eft_dynamics, trajectories, p),
        initial_guess=[−0.5, 0.3, 0.1, 0.2, 0.4]
    )

    return params_opt
```

---

## Critical Phenomena (Detailed)

### Critical Exponents

**Hypothesized values for AI governance** (two-bloc race class):

| Exponent | Definition | Value | Observable |
|----------|------------|-------|------------|
| β | L ∝ (t − t_c)^β | 0.3 | Lead growth near tipping |
| γ | χ ∝ \|trust − trust_c\|^{−γ} | 1.2 | Policy leverage |
| ν | ξ ∝ \|trust − trust_c\|^{−ν} | 0.6 | Influence distance |
| η | Correlation C(r) ∝ r^{−d+2−η} | 0.1 | Spatial correlations |
| α | Volatility response ∝ \|trust − trust_c\|^{−α} | 0.1 | Fluctuation growth |

**Scaling relations**:
```
α + 2β + γ = 2
dν = 2 − α
γ = ν(2 − η)
```

**Test**: Measure exponents from ABM ensemble, check if scaling relations hold

---

### Critical Slowing Down

**Measurement**:
```python
def measure_response_time(system, trust_level):
    # Apply policy intervention
    system.apply_intervention(magnitude=0.1)

    # Measure relaxation time
    initial_r = system.race_index
    t = 0
    while abs(system.race_index - initial_r) > 0.01:
        system.step()
        t += 1

    return t

# Scan near critical point
trust_range = np.linspace(0.5, 0.7, 20)
response_times = [measure_response_time(system, t) for t in trust_range]

# Expect divergence: τ ∝ |trust − 0.6|^{−z·ν}
```

---

## Monte Carlo Integration

### Ensemble Averages

**Physics**: ⟨O⟩ = (1/Z) Σ O({σ}) exp(−βH({σ}))

**AI governance**: ⟨O⟩ = (1/N) Σ_{runs} O(trajectory)

**Example**:
```python
def monte_carlo_average(model, params, n_runs=1000):
    outcomes = []

    for run in range(n_runs):
        # Sample initial condition
        initial = sample_initial_state(params)

        # Run simulation
        trajectory = model.simulate(initial)

        # Compute observable
        outcome = compute_race_index(trajectory[-1])
        outcomes.append(outcome)

    # Ensemble average
    mean = np.mean(outcomes)
    std = np.std(outcomes)

    return mean, std
```

---

## Connection to Discrete-Time HA

### Modes as Phases

| HA Mode | Physics Phase | Order Parameter Range |
|---------|---------------|-----------------------|
| Baseline | Near-critical | −0.3 < r < 0.5 |
| Race | Ordered (race) | r > 0.5 |
| Coordination | Ordered (cautious) | r < −0.3 |
| Pause | Metastable | r frozen |
| Catastrophe | Absorbing | Terminal state |

---

### Guards as Phase Boundaries

**Critical surfaces** in (r, c, o, t) space:

```python
guards = {
    ('baseline', 'race'): lambda x: x.race_index > 0.5 and x.trust < 0.6,
    ('race', 'baseline'): lambda x: x.race_index < 0.3 and x.trust > 0.7,
    ('baseline', 'coordination'): lambda x: x.race_index < -0.3 and x.trust > 0.8,
    # ... (phase boundaries from physics)
}
```

**Hysteresis**: Asymmetric thresholds encode first-order transition

---

### Stochastic Noise as Temperature

**Discrete-time HA**:
```
x[k+1] = f_q(x[k], u[k]) + σ ξ[k]
```

Where:
- σ = noise amplitude (analog of √(k_B T))
- ξ[k] ~ N(0, I) (Gaussian white noise)

**Boltzmann distribution**: Trajectories weighted by ∝ exp(−action/σ²)

---

## Summary Table: Physics ↔ AI Governance

| Physics | AI Governance | Implementation |
|---------|---------------|----------------|
| Spins σᵢ | Actor stances sᵢ | ABM agents |
| Magnetization m | Race index r | Weighted average |
| Temperature T | Social volatility | Noise parameter σ |
| Coupling J | Strategic coupling | Alliance strength |
| External field h | Market pressure | Incentive parameter |
| Phase transition | Regime shift | Mode transition |
| Ising model | Two-bloc race | Discrete-time HA |
| Landau-Ginzburg | AI-2027 EFT | Difference equations |
| RG flow | Coarse-graining | ABM → blocs → macro |
| Universality class | Scenario family | Two-bloc, hegemon, multilateral |
| Critical exponent β | Lead growth rate | Fit from ABM |
| Correlation length ξ | Influence distance | Network analysis |
| Partition function Z | Trajectory ensemble | Monte Carlo sampling |
| Boltzmann weight | Trajectory probability | exp(−action/σ²) |

---

## Example Calculation

### Computing Race Index from ABM

```python
# ABM state: 100 labs with stances and compute
labs = [
    Lab(stance=0.8, compute=1e25),   # US lab 1
    Lab(stance=0.7, compute=8e24),   # US lab 2
    Lab(stance=0.6, compute=5e24),   # China lab 1
    # ... 97 more labs
]

# Race index (order parameter)
total_compute = sum(l.compute for l in labs)
race_index = sum(l.stance * l.compute for l in labs) / total_compute

print(f"Race index: {race_index:.2f}")  # e.g., 0.72 (race phase)

# Centralization (second order parameter)
centralization = sum((l.compute / total_compute)**2 for l in labs)
print(f"Centralization: {centralization:.3f}")  # e.g., 0.234 (distributed)

# Map to HA mode
if race_index > 0.5:
    mode = "race"
elif race_index < -0.3:
    mode = "coordination"
else:
    mode = "baseline"

print(f"Current mode: {mode}")  # → "race"
```

---

**Related Documentation**:
- [fundamentals.md](./fundamentals.md) - Statistical mechanics basics
- [phase_transitions.md](./phase_transitions.md) - Phase transition theory
- [renormalization.md](./renormalization.md) - RG and coarse-graining
- [universality.md](./universality.md) - Universality classes
- [effective_theory.md](./effective_theory.md) - EFT construction
- [examples.md](./examples.md) - Worked examples with code

**See also**:
- [../hybrid_automata/discrete_time_ha.md](../hybrid_automata/discrete_time_ha.md) - Discrete-time HA formalism
- [../monte_carlo/README.md](../monte_carlo/README.md) - Monte Carlo integration
- [../surrogate_models/README.md](../surrogate_models/README.md) - Fast approximations
