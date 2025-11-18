# Universality Classes and Scaling Laws

**Purpose**: Apply universality concepts to identify families of AI governance scenarios that share the same macro behavior despite different micro details.

**Core Insight**: You don't need the "true" model - you need a model in the right universality class.

---

## What is Universality?

### Physics Definition

**Universality**: Different microscopic systems exhibit identical macroscopic behavior near critical points.

**Example**: 3D Ising Universality Class
- Ferromagnetic iron (spin model)
- Liquid-gas transition (fluid)
- Binary brass (Cu-Zn alloy)

**All have same critical exponents**:
- β = 0.326 ± 0.003
- γ = 1.237 ± 0.002
- ν = 0.630 ± 0.002

**Despite**: Different atoms, different interactions, different energy scales!

---

### Why Universality?

**Key insight**: Near critical point, only coarse features matter:
- Dimension d (2D vs 3D)
- Symmetry (Ising, XY, Heisenberg, ...)
- Interaction range (short vs long)

**Microscopic details** (atom type, lattice structure, spin magnitude):
- **Irrelevant** in RG sense
- Wash out under coarse-graining
- Don't affect critical exponents

**Consequence**: Build one simple model per universality class, trust it applies broadly

---

## Universality Classes in Statistical Mechanics

### Ising Universality Class

**Symmetry**: Z₂ (up/down, ±1)

**Order parameter**: Scalar magnetization m

**Examples**:
- Uniaxial ferromagnet (spins along one axis)
- Liquid-gas transition (density as order parameter)
- Binary alloy (composition)

**Critical exponents** (3D):
- β = 0.326: m ∝ (T_c − T)^β
- ν = 0.630: ξ ∝ |T − T_c|^{−ν}
- γ = 1.237: χ ∝ |T − T_c|^{−γ}

---

### XY Universality Class

**Symmetry**: O(2) (angle in plane)

**Order parameter**: 2D vector (m_x, m_y)

**Examples**:
- Easy-plane ferromagnet (spins in plane)
- Superfluid ⁴He transition
- 2D superconductor (Josephson arrays)

**Critical exponents** (3D):
- β ≈ 0.35
- ν ≈ 0.67
- γ ≈ 1.32

**Different from Ising!** Because symmetry is different.

---

### Heisenberg Universality Class

**Symmetry**: O(3) (full rotational symmetry)

**Order parameter**: 3D vector (m_x, m_y, m_z)

**Examples**:
- Isotropic ferromagnet (spins free to point anywhere)
- Antiferromagnet (below Néel temperature)

**Critical exponents** (3D):
- β ≈ 0.37
- ν ≈ 0.71
- γ ≈ 1.39

**Even more different!** More symmetry → different universality class.

---

### Dimension Matters

**Same symmetry, different dimension** → different universality class

**Ising model**:
- 2D: β = 1/8 = 0.125, ν = 1 (exact, Onsager solution)
- 3D: β ≈ 0.326, ν ≈ 0.630
- 4D: Mean-field (β = 1/2, ν = 1/2)

**Physical reason**: Fluctuations more important in low dimensions

---

## Scaling Laws

### Near Critical Point

**Key hypothesis**: Only one length scale near T_c
- Correlation length ξ ∝ |T − T_c|^{−ν}

**All observables** scale with powers of ξ:
```
m ∝ ξ^{−β/ν}
χ ∝ ξ^{γ/ν}
C_v ∝ ξ^{α/ν}
```

**Consequence**: Only two independent exponents (e.g., β and ν)
- All others related by **scaling relations**

---

### Scaling Relations

**Hyperscaling**:
```
α + 2β + γ = 2
dν = 2 − α
```

**Josephson scaling**:
```
γ = ν(2 − η)
```

**Example (3D Ising)**:
- Given: ν = 0.630, β = 0.326
- Predict: γ = ν(2 − η) = ?
- Measure: γ = 1.237
- Match!

**Implication**: Universal structure, not accidental numbers

---

### Finite-Size Scaling

**Problem**: Real systems are finite (N spins, not N → ∞)

**Solution**: Finite-size scaling theory

**Key idea**: Correlation length ξ limited by system size L
- If ξ >> L: System looks critical
- If ξ << L: Bulk behavior

**Scaling form**:
```
m(T, L) = L^{−β/ν} f((T − T_c) L^{1/ν})
```

Where f is a universal scaling function.

**Practical use**: Extract T_c and exponents from finite simulations

---

## Universality Classes Beyond Physics

### Climate Governance Example

**Class**: Two-bloc climate negotiation
- **Instances**: US vs China (emissions), EU vs developing nations, California vs Texas
- **Coarse structure**: Two major emitters, coordination failure → race to bottom
- **Order parameter**: Emission reduction commitment R
- **Universal behavior**: R(t) follows sigmoid (initial cooperation → defection → lock-in)
- **Different micro details**: Country names, specific treaties, technologies
- **Same macro**: Tragedy of commons dynamics

**Critical point**: Trust threshold where cooperation collapses

---

### Pandemic Response Example

**Class**: Centralized vs distributed response
- **Instances**: China (centralized lockdown), US (state-level), Sweden (voluntary)
- **Coarse structure**: Centralization of authority vs distributed decision-making
- **Order parameter**: Centralization index C
- **Universal behavior**: Centralized → fast response, high compliance; Distributed → slow, variable
- **Different micro details**: Political system, culture, specific policies
- **Same macro**: Efficacy vs freedom trade-off curve

**Critical point**: Authority level where population accepts vs resists

---

### Financial Stability Example

**Class**: Bank run / coordination cascade
- **Instances**: 2008 crisis (mortgages), 1929 crash (stocks), 2023 (SVB)
- **Coarse structure**: Many actors, trust-dependent coordination, positive feedback
- **Order parameter**: Fraction of actors withdrawing W
- **Universal behavior**: W(t) = 0 (stable) → sudden jump to W ≈ 1 (panic)
- **Different micro details**: Asset class, geography, specific banks
- **Same macro**: Explosive first-order phase transition

**Critical point**: Trust level where one withdrawal triggers cascade

---

## AI Governance Universality Classes

### Hypothesis

**Claim**: Families of AI governance scenarios share same macro behavior

**Mechanism**: RG washes out irrelevant details (country names, company names, specific policies)

**Testable**: Run multiple detailed ABMs, check if macro outcomes converge

**Analogs**: Same principles as climate (coordination failure), pandemic (centralization), finance (cascades)

---

### Class 1: Two-Bloc Race

**Coarse structure**:
- Two major actors (comparable power)
- Strategic competition
- Coordination failure

**Instances**:
- US vs China
- OpenAI vs Google (if one gets big lead)
- NATO vs BRICS
- Regulation hawks vs industry

**Expected macro behavior**:
- Race dynamics (r grows)
- Eventual winner-take-all (one bloc dominant)
- Catastrophe risk elevated during transition
- Timescale: Years to decade

**Order parameter**: Lead L = (compute₁ − compute₂) / (compute₁ + compute₂)

**Prediction**: L(t) follows universal trajectory (sigmoid or power law)

---

### Class 2: Hegemon

**Coarse structure**:
- Single dominant actor (>50% compute)
- Others followers or irrelevant
- Unilateral control

**Instances**:
- OpenAI reaches AGI first (large lead)
- China achieves compute monopoly
- UN-backed global compute governance

**Expected macro behavior**:
- Centralization c → 1
- Hegemon sets alignment/safety standards
- Catastrophe risk depends on hegemon's values/competence
- Stable (no race dynamics)

**Order parameter**: Centralization c = Σᵢ (compute_i / total)²

---

### Class 3: Multilateral Coordination

**Coarse structure**:
- Many comparable actors (no hegemon)
- Strong coordination institutions
- Compliance mechanisms

**Instances**:
- UN AI governance treaty (with teeth)
- Industry consortium (with binding agreements)
- International compute cap enforced

**Expected macro behavior**:
- Race index r → −1 (coordination)
- Slow, coordinated progress
- Catastrophe risk low (safety prioritized)
- Stable if institutions robust

**Order parameter**: Coordination strength K = trust × institution_capacity

---

### Class 4: Fragmented Chaos

**Coarse structure**:
- Many actors, no coordination
- Capabilities widely distributed
- No effective governance

**Instances**:
- Open-source AGI widely available
- Many small labs post-semiconductor breakthrough
- Governance collapse after major incident

**Expected macro behavior**:
- Percolation of dangerous capabilities
- Multipolar (r ≈ 0 but high variance)
- Catastrophe risk very high (no control)
- Chaotic, hard to predict

**Order parameter**: Capability percolation p = fraction with dangerous capability

---

## Historical Examples of Universality

### Cold War Arms Race (Two-Bloc Race Class)

**Instances**:
1. **Nuclear arms race** (1950s-1980s): US vs USSR
2. **Space race** (1950s-1970s): US vs USSR
3. **Cyber capabilities** (2000s-present): US vs China/Russia

**Coarse structure**: Identical
- Two superpowers
- Strategic competition
- Positive feedback (one's advance → other's response)
- Trust-dependent (cooperation possible but fragile)

**Different micro details**:
- Technology: Missiles vs rockets vs code
- Geography: Different continents
- Ideology: Capitalism vs communism (Cold War), democracy vs authoritarianism (cyber)
- Specific weapons/systems

**Universal macro behavior**:
- Exponential growth phase (initial buildup)
- Plateau phase (MAD, parity reached)
- Arms control possible only after parity + trust-building
- Timescale: Decades

**Order parameter**: Capability ratio R = (US capability / USSR capability)

**Result**: Same macro dynamics despite completely different micro details → validates universality

---

### Technology Platform Competition (Hegemon Class)

**Instances**:
1. **Operating systems**: Microsoft Windows (1990s)
2. **Search engines**: Google (2000s)
3. **Social networks**: Facebook (2010s)
4. **Cloud computing**: AWS (2010s)

**Coarse structure**: Identical
- Network effects → increasing returns
- Early lead → lock-in
- Winner-take-all dynamics
- High switching costs

**Different micro details**:
- Product: OS vs search vs social vs cloud
- Geography: Global vs regional
- Business model: Licensed vs ad-based vs usage-based
- Technology stack

**Universal macro behavior**:
- Initial competition (multiple players)
- Tipping point (one gains advantage)
- Rapid consolidation (market share → 70%+)
- Stable hegemon (hard to displace)
- Timescale: 5-10 years

**Order parameter**: Market share M_1 (largest player)

**Result**: Same S-curve trajectory to dominance → validates universality

---

### Coordination Cascade (Fragmented Chaos Class)

**Instances**:
1. **Bank runs**: 1929, 2008, 2023 (SVB)
2. **Currency crises**: 1997 (Asia), 2010 (Euro)
3. **Market crashes**: Black Monday (1987), Flash Crash (2010)
4. **Panic buying**: Toilet paper (COVID), gas (1970s oil crisis)

**Coarse structure**: Identical
- Many actors
- Coordination on trust
- Positive feedback (others' actions → my action)
- Critical threshold

**Different micro details**:
- Asset: Banks vs currencies vs stocks vs commodities
- Geography: US vs Asia vs Europe vs global
- Information: Rumor vs news vs social media
- Institutions: Different regulatory frameworks

**Universal macro behavior**:
- Stable phase (trust high, no withdrawals)
- Critical transition (trust crosses threshold)
- Explosive cascade (minutes to hours)
- New equilibrium (everyone withdrawn / prices collapsed)

**Order parameter**: Fraction participating F

**Critical exponent**: F(t) ∝ exp(λt) near cascade (exponential, not power law)

**Result**: Same explosive dynamics → validates universality across completely different domains

---

## Testing Universality Hypothesis

### Method

**Step 1**: Define coarse structure (which class?)

**Step 2**: Build multiple detailed ABMs
- Variant A: US vs China, chip export controls, 2025 start
- Variant B: OpenAI vs Google, model size race, 2027 start
- Variant C: Fictional countries Alpha vs Beta, different tech tree

**Step 3**: Run ensembles (N=1000 each)

**Step 4**: Extract macro observables
- Race index r(t)
- Centralization c(t)
- Time to critical threshold
- Catastrophe probability

**Step 5**: Compare
- **If trajectories converge**: Same universality class confirmed!
- **If diverge**: Check if coarse structure actually different

---

### Example: Two-Bloc Race

**ABM Variant A** (US vs China):
```python
# Detailed parameters
params_A = {
    'actors': ['US_OpenAI', 'US_Anthropic', 'China_Baidu', ...],
    'initial_compute': [1e25, 8e24, 5e24, ...],
    'alliances': [(0, 1), (2, 3), ...],
    'regulation': 'export_controls',
    # ... 100 more parameters
}
```

**ABM Variant B** (OpenAI vs Google):
```python
params_B = {
    'actors': ['OpenAI', 'Google', 'Meta', 'Anthropic'],
    'initial_compute': [2e25, 1.5e25, 8e24, 5e24],
    'alliances': [],  # No geopolitical alliances
    'regulation': 'voluntary_commitments',
    # ... 100 more parameters (different from A!)
}
```

**Run and extract**:
```python
results_A = run_abm_ensemble(params_A, n_runs=1000)
results_B = run_abm_ensemble(params_B, n_runs=1000)

# Extract race index over time
race_A = [extract_race_index(r) for r in results_A]
race_B = [extract_race_index(r) for r in results_B]

# Compare
mean_race_A = np.mean(race_A, axis=0)
mean_race_B = np.mean(race_B, axis=0)

plt.plot(mean_race_A, label='US vs China')
plt.plot(mean_race_B, label='OpenAI vs Google')
plt.legend()
```

**Universality confirmed if**: Curves overlap (within error bars)

**Different universality class if**: Curves diverge qualitatively

---

## Scaling Function

### Universal Trajectory

**Hypothesis**: Race index follows universal form

```
r(t) = f(t / τ)
```

Where:
- f = universal scaling function (same for all ABMs in class)
- τ = characteristic timescale (depends on micro details)

**Test**:
```python
# Fit characteristic time for each ABM
tau_A = fit_timescale(race_A)
tau_B = fit_timescale(race_B)

# Rescale time
rescaled_A = race_A(t / tau_A)
rescaled_B = race_B(t / tau_B)

# Check collapse
plt.plot(t / tau_A, rescaled_A, 'o', label='Variant A')
plt.plot(t / tau_B, rescaled_B, 'x', label='Variant B')
# Should overlap!
```

**Result**: Data collapse → universality confirmed

---

## Critical Exponents for AI Governance

### Defining Exponents

**Near race tipping point**: Define analogs of physics exponents

**Example**: Lead grows as power law
```
L(t) ∝ (t − t_c)^β_race
```

Where:
- L = lead of winning bloc
- t_c = time when race "locks in"
- β_race = critical exponent (analog of magnetization exponent)

---

### Measuring Exponents

```python
# From ABM ensemble
results = run_abm_ensemble(params, n_runs=1000)

# Extract trajectories near tipping point
for traj in results:
    t_c = find_tipping_point(traj)  # When r crosses 0.5
    lead = extract_lead(traj)

    # Fit power law near t_c
    mask = (t > t_c) & (t < t_c + 5)  # 5 years after tipping
    log_lead = np.log(lead[mask])
    log_time = np.log(t[mask] - t_c)

    # β_race = slope
    beta_race, _ = np.polyfit(log_time, log_lead, 1)
    exponents.append(beta_race)

# Universal exponent
print(f"β_race = {np.mean(exponents):.3f} ± {np.std(exponents):.3f}")
```

**If universal**: Same β_race across different ABM variants in same class

---

### Correlation Length Analog

**Physics**: ξ = distance over which spins are correlated

**AI Governance**: "Influence distance" in actor network
- How far does one lab's decision propagate?
- In coordination phase: Long range (ξ large)
- In race phase: Short range (ξ small)
- Near critical point: Diverges (ξ → ∞)

**Measurement**:
```python
def measure_correlation_length(system):
    # Perturb one actor
    system.actors[0].stance += 0.1

    # Measure response vs distance
    correlations = []
    for distance in range(1, 20):
        actors_at_d = system.actors_at_distance(0, distance)
        response = np.mean([a.stance_change for a in actors_at_d])
        correlations.append(response)

    # Fit exponential decay: C(d) ∝ exp(−d/ξ)
    xi, _ = fit_exponential_decay(correlations)
    return xi

# Near critical point
xi_values = [measure_correlation_length(system_at_trust_t)
             for t in np.linspace(0.5, 0.7, 20)]  # Scan through critical region
```

**Expected**: ξ diverges near trust ≈ 0.6 (critical threshold)

---

## Coarse-Graining and Universality

### Block-Spin Picture

**Micro**: 1000 labs with individual stances

**Coarse-grain (scale 1)**: 100 blocs (10 labs each)

**Coarse-grain (scale 2)**: 10 super-blocs (100 labs each)

**Universality prediction**: At large scales, only coarse structure matters
- Names of labs → irrelevant
- Detailed policies → irrelevant
- Only: Number of blocs, relative power, strategic coupling

---

### Universality Mechanism

**RG flow**:
```
(1000 labs, detailed) → (100 blocs, simplified) → (10 super-blocs, very simple)
```

**At each step**: Irrelevant couplings wash out

**End result**: Only relevant couplings survive
- These determine universality class
- Micro details (irrelevant couplings) forgotten

**Example**:
- Relevant: Strategic coupling strength J
- Irrelevant: Specific alliance treaty wording

**Both US-China and OpenAI-Google** have:
- J ≈ 2 (moderate coupling)
- Two dominant actors
- → Same universality class

---

## Designing Simple Models for Each Class

### Minimal Model Philosophy

**Goal**: One simple model per universality class
- Captures coarse structure
- Drops irrelevant details
- Fast to simulate
- Easy to analyze

**Cross-domain examples**:
- **Climate**: Two-emitter model (US-China) applies to any two major emitters
- **Arms race**: US-USSR, India-Pakistan, cyber capabilities - same dynamics
- **Technology adoption**: VHS-Betamax, Blu-ray-HD DVD - same network effects
- **AI governance**: US-China, OpenAI-Google - same strategic structure

---

### Class 1: Two-Bloc Race (Minimal Model)

```python
@dataclass
class TwoBlocRace:
    """Minimal model for two-bloc race universality class"""
    compute_1: float
    compute_2: float
    trust: float

    def step(self, dt=1.0):
        # Lead grows if trust low
        L = (self.compute_1 - self.compute_2) / (self.compute_1 + self.compute_2)

        if self.trust < 0.6:
            # Race dynamics (positive feedback)
            dL = 0.1 * L * (1 - L**2)  # Logistic growth
        else:
            # Coordination (negative feedback)
            dL = -0.05 * L  # Lead decays

        # Update
        total = self.compute_1 + self.compute_2
        self.compute_1 += dL * total / 2
        self.compute_2 -= dL * total / 2

        # Trust erosion in race
        if self.trust < 0.6:
            self.trust -= 0.01

    def outcome(self):
        L = (self.compute_1 - self.compute_2) / (self.compute_1 + self.compute_2)
        if abs(L) > 0.8:
            return "winner_take_all"
        elif self.trust > 0.7:
            return "coordination"
        else:
            return "ongoing_race"
```

**This is enough** to capture class behavior!

---

### Class 2: Hegemon (Minimal Model)

```python
@dataclass
class Hegemon:
    """Single dominant actor"""
    hegemon_compute: float
    hegemon_safety: float  # 0-1, alignment capability
    others_compute: float

    def step(self, dt=1.0):
        # Hegemon grows faster (no competition)
        self.hegemon_compute *= 1.05

        # Hegemon invests in safety based on values
        self.hegemon_safety += 0.02 * self.hegemon_safety * (1 - self.hegemon_safety)

    def outcome(self):
        if self.hegemon_safety > 0.8:
            return "aligned_hegemon"
        elif self.hegemon_safety < 0.4:
            return "catastrophe"
        else:
            return "uncertain"
```

**Different dynamics** from two-bloc race → different universality class

---

## Implications for Modeling

### 1. Don't Overfit to Specifics

**Wrong approach**: "We need to model the exact US-China relationship, all 200 variables"

**Right approach**: "Two-bloc race is a universality class. We build one simple model that captures the coarse structure."

**Benefit**: Robust to uncertainty in micro details

---

### 2. Validate with Multiple ABMs

**Workflow**:
1. Build 3 detailed ABMs (different micro stories)
2. Check if they converge to same macro behavior
3. If yes: Universality class identified → trust simple model
4. If no: Coarse structure matters → revisit classification

**Confidence**: Validated across multiple detailed models

---

### 3. Focus Measurement on Relevant Couplings

**From RG + universality**: Only ~5-10 parameters matter

**Example (two-bloc race)**:
- Strategic coupling J (how much they respond to each other)
- External pressure h (market, security)
- Initial asymmetry (compute ratio)
- Trust baseline
- Volatility (information environment)

**These 5 determine trajectory!**

**Don't waste effort** measuring irrelevant details (specific lab personnel, exact policy wording)

---

### 4. Transfer Learning Across Domains

**Hypothesis**: Same universality class → same model works

**Example**: Two-bloc race
- AI governance (US vs China)
- Climate policy (US vs China on emissions)
- Cybersecurity (NATO vs adversary)

**Same coarse structure** → transfer the model!

**Adjust**: Timescales, parameter values, but keep structure

---

## Falsifying Universality

### When Might It Fail?

**Universality requires**:
1. Near critical point (far from critical → details matter)
2. Short-range interactions (long-range can break universality)
3. Thermodynamic limit (N → ∞, finite-size effects vanish)

**AI governance challenges**:
1. May not be near critical point always
2. Global coordination = long-range interaction
3. N = ~100 labs (finite-size effects?)

---

### Tests

**Test 1**: Do multiple ABMs converge?
- If yes: Universality likely
- If no: Need to refine classification or accept non-universal

**Test 2**: Do exponents match across ABMs?
- Extract β, ν from each ABM
- Check if consistent within error bars

**Test 3**: Does simple model capture ABM ensemble?
- Run simple model + noise
- Compare distributions to ABM ensemble
- KS test, moment matching

---

## Summary

**Universality means**:
1. **Families of scenarios** share same macro behavior
2. **Microscopic details** irrelevant (washed out by RG)
3. **Critical exponents** universal within class
4. **Scaling functions** describe universal trajectories

**AI governance universality classes**:
1. **Two-bloc race**: Symmetric competition → winner-take-all
2. **Hegemon**: Single dominant actor, unilateral control
3. **Multilateral coordination**: Many actors, strong institutions
4. **Fragmented chaos**: No coordination, capabilities proliferate

**For modeling**:
- Build simple models (one per class)
- Validate with multiple detailed ABMs
- Test: Do ABMs converge to same macro?
- Focus effort on relevant couplings (universal parameters)
- Don't overfit to specific micro details

**Practical benefits**:
- Robust to uncertainty (details don't matter)
- Transferable across domains (same coarse structure)
- Parsimonious (few parameters, simple model)
- Falsifiable (test with ABM ensemble)

**Next**: See how to build effective field theories for each class in [effective_theory.md](./effective_theory.md)
