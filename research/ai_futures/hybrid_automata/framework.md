# Hybrid Automata: Formal Framework

**Formal definitions, semantics, and mathematical foundations**

---

## 1. What is a Hybrid Automaton?

A **hybrid automaton** (HA) is a formal model combining:

1. **Discrete dynamics** (finite state machines)
2. **Continuous dynamics** (differential equations)
3. **Interaction** between discrete and continuous parts

**Intuition**: A hybrid system switches between different "modes" (discrete states), and in each mode, continuous variables evolve according to differential equations. Transitions between modes can be triggered by continuous state reaching thresholds (guards), and can cause discrete jumps in continuous state (resets).

---

## 2. Formal Definition

### 2.1 Basic Hybrid Automaton

A **hybrid automaton** H = (Q, X, Init, Inv, Flow, E, Guard, Reset) consists of:

1. **Q** - Finite set of **modes** (discrete locations)
   - Like states in an FSM
   - Example: Q = {Baseline, Race, Slowdown, Pause}

2. **X ⊆ ℝⁿ** - **Continuous state space**
   - Real-valued variables
   - Example: X = ℝ³ for (compute, alignment, trust)

3. **Init ⊆ Q × X** - **Initial states**
   - (q₀, x₀) ∈ Init
   - Example: (Baseline, (26.0, 0.15, 0.70))

4. **Inv : Q → P(X)** - **Invariants** (staying conditions)
   - Inv(q) defines allowable continuous states in mode q
   - Example: Inv(Race) = {x | x.trust ≥ 0.3}
   - System must leave mode when invariant violated

5. **Flow : Q → (X → ℝⁿ)** - **Flow conditions** (ODEs)
   - Flow(q) = f_q(x) defines how x evolves in mode q
   - ẋ = f_q(x) while in mode q
   - Example: Flow(Race) = (1.5·C, 0.05·(1-A), -0.05·T)

6. **E ⊆ Q × Q** - **Discrete transitions** (edges)
   - Possible mode switches
   - Example: (Race, Pause) ∈ E

7. **Guard : E → P(X)** - **Guard conditions** (jump triggers)
   - Guard(e) defines when transition e can fire
   - Example: Guard(Race → Pause) = {x | evidence ≥ 3}

8. **Reset : E → (X → X)** - **Reset maps** (discrete updates)
   - Reset(e)(x) = x' defines new continuous state after transition e
   - Example: Reset(Race → Pause)(x) = (x.C, x.A, x.T, 0)
   - Often identity (no discrete jump), but can model instantaneous changes

---

### 2.2 Execution Semantics

A **hybrid trajectory** is a sequence alternating between:

1. **Continuous evolution** (time-elapse): stay in mode q, follow ẋ = Flow(q)(x)
2. **Discrete transitions** (jumps): switch modes q → q' when Guard fires, apply Reset

**Formally**, a hybrid execution is:

τ = (q₀, x₀) →^(t₁) (q₀, x₁) →^e₁ (q₁, x₁') →^(t₂) (q₁, x₂) →^e₂ ...

Where:
- →^t means continuous evolution for time t in same mode
- →^e means discrete transition via edge e

**Constraints**:
- While in mode q, must satisfy Inv(q)
- Can only take transition e when x ∈ Guard(e)
- After transition e, x' = Reset(e)(x)

---

### 2.3 Example: Two-Mode Thermostat

**Modes**: Q = {Heating, Cooling}

**Continuous state**: X = ℝ (temperature T)

**Flows**:
- Flow(Heating)(T) = +5 (heater adds 5°/min)
- Flow(Cooling)(T) = -2 (natural cooling 2°/min)

**Guards**:
- Guard(Heating → Cooling) = {T | T ≥ 22}
- Guard(Cooling → Heating) = {T | T ≤ 18}

**Resets**:
- Reset(e)(T) = T for all e (no discrete jump in temperature)

**Invariants**:
- Inv(Heating) = {T | T ≤ 22}
- Inv(Cooling) = {T | T ≥ 18}

**Execution**:
1. Start: (Heating, T=17)
2. Evolve: T increases at +5°/min until T=22 (takes 1 minute)
3. Transition: (Heating, 22) → (Cooling, 22)
4. Evolve: T decreases at -2°/min until T=18 (takes 2 minutes)
5. Transition: (Cooling, 18) → (Heating, 18)
6. Repeat...

---

## 3. Stochastic Hybrid Automata

A **stochastic hybrid automaton** (SHA) adds probabilities to mode transitions.

### 3.1 Definition

SHA = (Q, X, Init, Inv, Flow, E, Guard, Reset, **Prob**)

Where:
- Prob : E × X → [0,1] - **Transition probabilities**
- For each q, Σ_{e from q} Prob(e, x) ≤ 1 (rest is probability of staying)

**Semantics**: When x ∈ Guard(e), transition e fires with probability Prob(e, x).

### 3.2 Example: AI-2027 Pause

**Modes**: {Misalignment_Evidence, Pause, Catastrophe}

**Guards**:
- Guard(Misalignment_Evidence → Pause) = {x | pause_action_taken}
- Guard(Misalignment_Evidence → Catastrophe) = {x | x.alignment < 0.3}

**Probabilities** (stochastic outcomes from Pause):
- Prob(Pause → Aligned, x) = 0.7 + 0.3 · (x.alignment - 0.85) / 0.15
  - Higher alignment → higher chance of success
- Prob(Pause → Misalignment_Evidence, x) = 1 - Prob(Pause → Aligned, x)
  - Pause can fail, return to crisis

---

## 4. Time Models

Hybrid automata can have different timing semantics:

### 4.1 Time-Triggered Transitions

**Guards reference time**: Guard(e) = {(x,t) | t ∈ [t_min, t_max]}

Example:
- Guard(Baseline → Race) = {(x,t) | t ≥ 8 ∧ t ≤ 16}
- Models: "Race can start between years 2032-2040"

### 4.2 Urgent Transitions

**Must fire immediately** when guard becomes true (no delay allowed).

Notation: Guard(e) with urgency flag

Example:
- Guard(Race → Catastrophe) = {x | x.trust < 0.2} (urgent)
- Meaning: If trust falls below 20%, catastrophe happens instantly

### 4.3 Delayable Transitions

**Can fire anytime** guard is true (nondeterministic timing).

Used when exact timing is unknown or adversarial.

---

## 5. Connection to Other Models

### 5.1 Hybrid Automata Subsume Discrete Models

| Discrete Model | Hybrid Automaton Restriction |
|----------------|------------------------------|
| **FSM** | X = ∅ (no continuous state), Flow(q) = 0 |
| **Timed Automaton** | X = ℝ (single clock variable), Flow(q) = 1 |
| **Kripke Structure** | X = ∅, deterministic transitions |
| **MDP** | X = ∅, probabilistic transitions (SHA) |
| **LTS** | X = ∅, no atomic propositions |

**Key insight**: Every discrete model is a special case of HA where continuous state is trivial.

### 5.2 Hybrid Automata Generalize Dynamical Systems

| Dynamical System | Hybrid Automaton Representation |
|------------------|----------------------------------|
| **ODE** | Q = {single mode}, no transitions |
| **Switched System** | Multiple modes, switching signal determines transitions |
| **Piecewise Affine** | Linear flows in each mode, guards partition state space |

**Key insight**: Pure continuous dynamics are HA with one mode and no transitions.

---

## 6. Composition of Hybrid Automata

**Parallel composition** H₁ ∥ H₂ models multiple interacting hybrid systems.

### 6.1 Product Construction

Given H₁ = (Q₁, X₁, ...) and H₂ = (Q₂, X₂, ...)

H₁ ∥ H₂ = (Q₁ × Q₂, X₁ × X₂, Init₁ × Init₂, ...)

**Flows**: Flow((q₁, q₂)) = (Flow₁(q₁), Flow₂(q₂))
- Continuous state evolves independently in each component

**Transitions**:
- **Interleaving**: H₁ transitions alone or H₂ transitions alone
- **Synchronization**: Both transition simultaneously on shared actions

### 6.2 Example: Multi-Actor AI Governance

**H_US** = hybrid automaton for US AI policy
**H_China** = hybrid automaton for China AI policy

**Product** H_US ∥ H_China:
- Modes: (US_mode, China_mode)
- Example: (US_Race, China_Race) vs (US_Slowdown, China_Race)
- Continuous state: (US_compute, US_alignment, China_compute, China_alignment)
- Synchronization: Both countries agree to pause → synchronized transition

---

## 7. Abstraction and Discretization

For verification, continuous state must be **abstracted** to finite.

### 7.1 Predicate Abstraction

Partition X into regions R₁, R₂, ..., R_k based on predicates.

Example:
- R_low = {x | x.alignment < 0.3}
- R_med = {x | 0.3 ≤ x.alignment < 0.7}
- R_high = {x | x.alignment ≥ 0.7}

**Abstract state**: (q, R_i) where q ∈ Q, x ∈ R_i

**Abstract transition system**:
- States: Q × {R₁, ..., R_k}
- Transitions: (q, R_i) → (q', R_j) if ∃ trajectory from (q, x ∈ R_i) to (q', x' ∈ R_j)

### 7.2 Reachability Overapproximation

**Conservative abstraction**: If abstract system says "property violated", HA *might* violate it (not certain).

**Sound abstraction**: If abstract system satisfies property, HA *definitely* satisfies it.

Techniques:
- **Rectangular approximations** (intervals per variable)
- **Zonotopes** (convex polytopes)
- **Support functions** (optimize over reachable set)

---

## 8. Verification Questions

Given hybrid automaton H and property φ:

### 8.1 Reachability

**Question**: Can H reach a state satisfying φ?
- Example: Can (mode=Catastrophe) be reached from Init?

**Challenge**: Continuous state space is infinite
**Approach**: Compute/overapproximate reachable set

### 8.2 Safety

**Question**: Does H avoid all states satisfying ¬φ?
- Example: AG (alignment_gap < 10)
- "Alignment gap never exceeds 10"

**Dual to reachability**: Safe ⟺ ¬φ unreachable

### 8.3 Liveness

**Question**: Does H eventually reach φ?
- Example: AF (mode=Aligned)
- "Eventually reach aligned mode"

**Challenge**: Requires reasoning about infinite time horizon

### 8.4 Probabilistic Properties (SHA)

**Question**: What is P(eventually φ)?
- Example: P_≤0.05 [ F (mode=Catastrophe) ]
- "Probability of catastrophe ≤ 5%"

**Approach**: Build MDP abstraction, probabilistic model checking

---

## 9. Model Checking Hybrid Automata

### 9.1 Decidability

**Bad news**: Reachability is **undecidable** for general hybrid automata.

**Good news**: Many **subclasses are decidable**:

| Class | Decidable? | Example |
|-------|------------|---------|
| Finite automata | Yes | Pure discrete FSM |
| Timed automata | Yes | Clocks with linear constraints |
| Rectangular HA | Yes | Independent variable bounds |
| Linear HA | No (in general) | Arbitrary linear ODEs |
| Nonlinear HA | No | General ODEs |

### 9.2 Practical Approaches

1. **Symbolic reachability** (exact for simple classes)
   - Tools: HyTech, PHAVer

2. **Numerical simulation + search** (sound but incomplete)
   - Tools: SpaceEx, Flow*

3. **Abstraction to finite MDP** (conservative)
   - Discretize continuous state → MDP
   - Model check MDP with PRISM/Storm
   - See [tools_and_verification.md](tools_and_verification.md)

4. **Barrier certificates** (prove unreachability without computing reachable set)
   - Find function B(x) such that B(x) > 0 proves x unreachable

---

## 10. Connection to AI-2027

AI-2027 scenario is naturally a **stochastic hybrid automaton**:

**Discrete modes**: {Baseline, Race, Slowdown, Pause, Catastrophe, Aligned}
- Governance regimes with qualitatively different dynamics

**Continuous state**: (compute, alignment, trust, security) ∈ ℝ⁴
- Quantities that evolve smoothly

**Flow equations**: Different ODEs per mode
- Race: rapid compute growth, alignment lags
- Pause: compute frozen, alignment research accelerates

**Guards**: Thresholds and events
- Trust < 0.4 → Regulation_Window
- Evidence ≥ 3 → Misalignment_Evidence

**Stochastic transitions**: Uncertain outcomes
- Pause → Aligned with probability 0.7 + f(alignment)
- Pause → Catastrophe with probability 1 - p_success

**Verification goals**:
- P(Catastrophe) < 0.05
- P(Eventually Aligned) > 0.5
- AG (trust > 0.3) - maintain legitimacy

See [examples/04_ai_governance.md](examples/04_ai_governance.md) for full specification.

---

## 11. Further Reading

### 11.1 Foundational Papers

- Henzinger (1996): "The Theory of Hybrid Automata" - canonical definition
- Alur et al. (1995): "Hybrid Automata: An Algorithmic Approach" - decidability results
- Frehse et al. (2011): "SpaceEx: Scalable Verification of Hybrid Systems" - practical tool

### 11.2 Textbooks

- "Hybrid Systems: Computation and Control" (HSCC conference proceedings)
- Cassandras & Lafortune (2008): "Introduction to Discrete Event Systems" - Chapter on hybrid systems

### 11.3 Related Documentation

- [integration.md](integration.md) - How HA couples with SD and ABM
- [tools_and_verification.md](tools_and_verification.md) - Verification workflows
- [../README.md](../README.md) - Four-component framework overview

---

**Next**: See [integration.md](integration.md) for how hybrid automata integrate with System Dynamics and Agent-Based Models.
