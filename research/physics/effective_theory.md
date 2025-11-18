# Effective Field Theory for AI Governance

**Purpose**: Apply effective field theory (EFT) concepts to build macro models that are valid at policy timescales while encoding micro details in parameters.

**Core Idea**: AI-2027 DAG is an effective field theory - it describes long-wavelength (slow, policy-relevant) dynamics while integrating out short-wavelength (fast, micro) details.

---

## What is Effective Field Theory?

### Physics Definition

**Effective Field Theory (EFT)**: A theory valid at energy scales E << Λ (or length scales L >> a) that captures long-distance physics without resolving short-distance details.

**Key features**:
1. **Separation of scales**: Λ (cutoff) >> E (observable energies)
2. **Integrating out**: Heavy degrees of freedom removed, effects encoded in parameters
3. **Systematic expansion**: Corrections suppressed by powers of E/Λ
4. **Universal**: Different UV (short-distance) theories → same EFT if same symmetries

---

### Canonical Example: Fermi Theory

**High-energy theory**: Electroweak theory with W, Z bosons (M_W ≈ 80 GeV)

**Low-energy EFT**: Fermi's 4-fermion interaction (E << M_W)
```
L_eff = (G_F / √2) (ψ̄_1 γ^μ ψ_2)(ψ̄_3 γ_μ ψ_4)
```

Where G_F = g²/(8M_W²) (Fermi constant)

**Validity**: E < ~10 GeV (much less than M_W)

**Advantage**: No need to resolve W boson propagator for low-energy processes

**Limitation**: Breaks down at E ~ M_W (need full electroweak theory)

---

### Another Example: Chiral Perturbation Theory

**High-energy theory**: Quantum Chromodynamics (QCD) with quarks and gluons

**Low-energy EFT**: Chiral perturbation theory with pions, kaons (composite states)
```
L_eff = (F_π²/4) Tr(∂_μ U ∂^μ U†) + ...
```

**Expansion parameter**: E/Λ_QCD where Λ_QCD ≈ 1 GeV

**Result**: Can calculate pion scattering without solving QCD (intractable!)

---

## Separation of Scales

### Time Scales

**Fast** (τ_fast):
- Daily news cycles
- Individual meetings
- Bug discoveries
- Social media trends

**Slow** (τ_slow):
- Strategic stances (months)
- Trust evolution (quarters)
- Compute accumulation (years)
- Regulatory regimes (years)

**Separation**: τ_slow / τ_fast ≈ 100-1000

**EFT prescription**: Average over fast timescales, keep only slow modes

---

### Spatial Scales

**Fine-grained** (individual actors):
- 100+ labs, 200+ countries
- Detailed network structure
- Individual beliefs

**Coarse-grained** (blocs):
- 5-10 major blocs
- Effective couplings
- Aggregate stances

**Separation**: N_micro / N_macro ≈ 10-20

**EFT prescription**: Group actors into blocs, use bloc-level effective theory

---

## Integrating Out Fast Modes

### Path Integral Formulation

**Full theory**: Partition function over all degrees of freedom
```
Z = ∫ Dφ_slow Dφ_fast exp(−S[φ_slow, φ_fast])
```

**Integrate out fast modes**:
```
Z = ∫ Dφ_slow exp(−S_eff[φ_slow])
```

Where:
```
exp(−S_eff[φ_slow]) = ∫ Dφ_fast exp(−S[φ_slow, φ_fast])
```

**Result**: S_eff contains effects of fast modes via:
- Renormalized couplings
- Induced interactions
- Quantum/thermal corrections

---

### AI Governance Example

**Fast modes**: Daily fluctuations in actor stances
```python
# Micro model: Actor stances evolve daily
for day in range(365):
    for actor in actors:
        actor.stance += fast_noise[day]  # Daily fluctuations
        actor.respond_to_news(news[day])
```

**Integrate out**: Average over fast timescale (month)
```python
# Effective model: Monthly averages
for month in range(12):
    for bloc in blocs:
        # Bloc stance = average over month
        bloc.stance = np.mean([actor.stance
                               for actor in bloc.actors
                               for day in month_days[month]])

    # Effective dynamics (monthly time step)
    blocs = evolve_blocs(blocs, dt=1_month)
```

**Effect**: Fast noise → effective temperature (volatility parameter in macro model)

---

## Wilsonian EFT Construction

### Step 1: Identify Cutoff

**Physics**: Cutoff Λ = energy scale where UV physics matters

**AI governance**: Cutoff τ_c = timescale where micro details matter
- τ_c ≈ 1 month (policy cycle, quarterly earnings)

**Below cutoff**: Macro model valid (monthly to yearly dynamics)
**Above cutoff**: Need micro model (daily fluctuations)

---

### Step 2: Write Down Effective Action

**General form**: Include all terms allowed by symmetries
```
S_eff = Σ_i c_i O_i
```

Where:
- O_i = operators (terms in action)
- c_i = Wilson coefficients (encode UV physics)

**Organize by relevance**:
- Dimension-2: Marginal (log running)
- Dimension-4: Relevant (grow under RG)
- Dimension-6+: Irrelevant (suppressed by (E/Λ)^n)

---

### Step 3: Match to UV Theory

**Procedure**: Calculate same observable in UV and EFT, equate
```
⟨O⟩_UV = ⟨O⟩_EFT
```

**Determines Wilson coefficients** c_i in terms of UV parameters

**Example**:
- UV: Detailed ABM with 100 parameters
- Calculate: P(catastrophe), ⟨race_index⟩, etc.
- EFT: Macro model with 10 parameters
- Fit: Adjust EFT parameters until observables match ABM

---

### Step 4: Run EFT

**Advantage**: Much faster (no micro details)

**Use**: Monte Carlo, optimization, real-time prediction

**Check**: Compare EFT predictions to ABM occasionally (validation)

---

## AI-2027 as Effective Theory

### Structure

**Degrees of freedom**: Order parameters (race index r, centralization c, oversight o, trust t)

**Dynamics**: Discrete-time hybrid automaton
- Modes: {baseline, race, coordination, pause, catastrophe}
- Flows: x[k+1] = f_q(x[k], u[k], ξ[k]) (difference equations)
- Transitions: Guards on order parameters

**Valid for**: Timescales τ > 1 month, spatial scales > blocs

---

### Effective Action (Informal)

**For "race" mode**:
```python
def race_mode_effective_action(trajectory):
    """
    Effective action = cost of trajectory
    Higher action = less likely trajectory
    """
    action = 0

    for k in range(len(trajectory) - 1):
        x = trajectory[k]
        r, c, o, t = x

        # Kinetic term: Cost of fast changes
        action += 0.5 * (x[k+1] - x[k])**2 / dt

        # Potential terms: Preferences
        action += V_race(r, c, t)  # Favors high r (race)

    return action

def V_race(r, c, t):
    """
    Effective potential in race mode
    Encodes micro incentives
    """
    # Race mode favors high race index
    potential = -0.5 * r**2  # Favors r > 0

    # But trust decay increases cost
    potential += 0.3 * (1 - t)**2

    # Centralization preferred (winner-take-all)
    potential += -0.2 * c

    return potential
```

**Coefficients (−0.5, 0.3, −0.2)**: Wilson coefficients fitted from ABM

---

### Matching to ABM

**Procedure**:
1. Run ABM ensemble (N=1000) in "race" conditions
2. Extract order parameter trajectories: r(t), c(t), o(t), t(t)
3. Fit EFT dynamics to match trajectories:
   ```python
   def fit_eft_to_abm(abm_trajectories):
       # Extract ABM statistics
       r_mean = np.mean([traj.r for traj in abm_trajectories], axis=0)
       r_std = np.std([traj.r for traj in abm_trajectories], axis=0)

       # Fit EFT parameters
       params_eft = optimize_eft(race_mode_dynamics, target=r_mean)

       # Validate
       eft_trajectories = run_eft_monte_carlo(params_eft, n=1000)
       r_eft_mean = np.mean([traj.r for traj in eft_trajectories], axis=0)

       # Check match
       assert np.allclose(r_mean, r_eft_mean, rtol=0.1)
       return params_eft
   ```

---

## Operator Product Expansion

### Physics Concept

**OPE**: Near critical point, products of operators → sum of operators
```
O_1(x) O_2(0) = Σ_i C_i(x) O_i(0)
```

**C_i(x)**: Wilson coefficients (depend on separation x)

**Use**: Simplify correlation functions

---

### AI Governance Analog

**Composite observables**: Functions of multiple order parameters

**Example**: "Catastrophe risk" ≈ function of (r, c, o, t)
```python
def catastrophe_risk(r, c, o, t):
    # Composite operator (effective)
    # Encodes correlations between order parameters
    risk = 0.1 + 0.3 * r + 0.2 * (1 - o) - 0.4 * t
    risk += 0.15 * r * (1 - o)  # Interaction term
    return np.clip(risk, 0, 1)
```

**Wilson coefficients**: (0.3, 0.2, −0.4, 0.15) fitted from ABM

**Advantage**: Fast catastrophe risk estimate without running full simulation

---

## Validity Range

### Where EFT Breaks Down

**Too short timescales**: τ < 1 month
- Daily fluctuations matter
- Need full ABM

**Near cutoff**: τ ~ 1 month
- Corrections large
- EFT less accurate

**Micro events matter**: Specific incidents
- Assassination, breakthrough, leak
- Discrete shocks (not captured by continuous EFT)
- Hybrid automaton modes help (discrete transitions)

---

### How to Check Validity

**Method 1: Compare to ABM**
```python
# Run both models
abm_result = run_abm(params, n_runs=100)
eft_result = run_eft(params_eft, n_runs=1000)

# Compare distributions
ks_stat = ks_test(abm_result, eft_result)
if ks_stat < 0.1:
    print("EFT valid")
else:
    print("EFT breakdown, use ABM")
```

**Method 2: Check corrections**
```python
# EFT has expansion in (dt / cutoff)
# Next-order correction:
correction = compute_next_order_term(trajectory)

if correction / leading_term < 0.1:
    print("EFT valid (corrections small)")
else:
    print("Corrections large, EFT questionable")
```

---

## Landau-Ginzburg Theory

### Classic EFT for Phase Transitions

**Order parameter**: Magnetization field m(x)

**Effective free energy**:
```
F[m] = ∫ d³x [r m² + u m⁴ + c (∇m)² + ...]
```

**Parameters**:
- r = a(T − T_c): Relevant coupling (controls phase)
- u > 0: Quartic stabilization
- c > 0: Stiffness (gradient cost)

**Physics**:
- r > 0 (T > T_c): Minimum at m = 0 (paramagnet)
- r < 0 (T < T_c): Minima at m = ±√(−r/2u) (ferromagnet)

**Critical point**: r = 0 (T = T_c)

---

### AI Governance Landau-Ginzburg

**Order parameter**: Race index field r(bloc, t)
- Depends on which bloc (spatial variation)
- Depends on time

**Effective free energy**:
```python
def free_energy(r_field, params):
    """
    Landau-Ginzburg for AI governance
    r_field: race index for each bloc
    """
    F = 0

    for bloc in range(n_blocs):
        r = r_field[bloc]

        # Quadratic term (depends on pressure)
        a = params['pressure'] - params['pressure_critical']
        F += a * r**2

        # Quartic term (stabilization)
        F += params['u'] * r**4

        # Gradient term (blocs influence neighbors)
        neighbors = get_neighbors(bloc)
        for neighbor in neighbors:
            dr = r_field[bloc] - r_field[neighbor]
            F += params['c'] * dr**2

    return F
```

**Dynamics**: Gradient flow
```python
dr_dt = -delta_F / delta_r  # Minimize free energy
```

---

### Phase Diagram from LG Theory

**Parameters**: (pressure h, volatility T)

**Free energy**: F = ar² + ur⁴, where a = a₀ + h/T

**Equilibrium**: ∂F/∂r = 0 → 2ar + 4ur³ = 0

**Solutions**:
- r = 0: Always a solution (coordination)
- r = ±√(−a/2u): Exists if a < 0 (race)

**Phase boundary**: a = 0 → h = −a₀T

**Phase diagram**:
```
    Volatility T
        ↑
        |   Race (r ≠ 0)
        |
   ---- • ---- (h = −a₀T, critical line)
        |
        | Coord (r = 0)
        +--+--+--+--→ Pressure h
           0
```

---

## Symmetries and Conservation Laws

### Noether's Theorem

**Physics**: Every continuous symmetry → conserved quantity
- Time translation symmetry → Energy conservation
- Spatial translation → Momentum conservation
- Gauge symmetry → Charge conservation

**EFT**: Symmetries restrict allowed terms in action

---

### AI Governance Symmetries

**Example 1: Bloc permutation symmetry**
- If blocs are identical (before differentiation), effective action symmetric under permutation
- Restricts: Couplings must be symmetric (J_12 = J_21)

**Example 2: Trust parity**
- If system symmetric under "trust flip" (high ↔ low with policy sign flip)
- Forbids: Odd powers of trust in effective action (only t², t⁴, ...)

**Practical use**: Reduces number of free parameters

---

## Non-AI Governance Examples

### Climate Policy EFT

**Order parameter**: Global emissions reduction E(region, t)

**Effective free energy**:
```
F[E] = ∫ d(region) [a(ambition - cost) E² + u E⁴ + c (∇E)²]
```

**Parameters**:
- a: Net benefit/cost of emission reduction
- u: Saturation (diminishing returns)
- c: International spillovers (my reduction helps neighbors)

**Dynamics**: E evolves to minimize F (Paris Agreement targets, NDCs)

**Cutoff**: Monthly to quarterly (policy cycles)

**UV theory**: Daily emissions from millions of sources

---

### Pandemic Response EFT

**Order parameter**: Stringency index S(region, t) (0 = open, 1 = lockdown)

**Effective free energy**:
```
F[S] = ∫ d(region) dt [α(cases - tolerance) S² + β S⁴ + γ (∇S)² + δ (∂_t S)²]
```

**Parameters**:
- α: Response to case load
- β: Saturation (can't lock down more than 100%)
- γ: Geographic spillover (border policies)
- δ: Policy inertia (cost of changing stringency fast)

**Cutoff**: Weekly (policy decision cycle)

**UV theory**: Daily individual interactions, exposures

---

## Summary

**Effective Field Theory provides**:
1. **Separation of scales**: Macro model valid for slow, policy-relevant timescales
2. **Integrating out**: Fast modes removed, effects encoded in Wilson coefficients
3. **Systematic**: Expansion in (short scale / long scale)
4. **Universal**: Different UV theories → same EFT (if same symmetries)

**AI-2027 as EFT**:
- **Order parameters**: Race index, centralization, oversight, trust
- **Cutoff**: τ_c ≈ 1 month (policy cycle)
- **Valid for**: Monthly to yearly timescales
- **Breaks down**: Daily fluctuations, discrete shocks (use ABM)
- **Wilson coefficients**: Fitted from ABM ensemble

**Construction workflow**:
1. Identify fast vs slow modes (timescale separation)
2. Integrate out fast modes (average over short timescale)
3. Write effective action (all terms allowed by symmetries)
4. Match to UV (fit Wilson coefficients to ABM)
5. Validate (compare EFT to ABM on test cases)

**For modeling**:
- Discrete-time HA = EFT for order parameters
- Mode dynamics f_q = effective equations (Wilson coefficients)
- Guards = phase boundaries (critical surfaces)
- Noise ξ = integrated-out fast modes (effective temperature)

**Practical benefits**:
- Fast simulation (EFT >> ABM speed)
- Clear scope (valid for τ > τ_c, not all timescales)
- Honest uncertainty (know what's integrated out)
- Transferable (same EFT structure for climate, pandemic, finance)

**Next**: See detailed mapping of physics concepts to AI governance in [ai_governance_mapping.md](./ai_governance_mapping.md)
