# Time-Indexed Kripke Structure

## Overview

A **time-indexed Kripke structure** is a minimal formalism for modeling discrete-time systems with temporal constraints. It extends classical Kripke structures by making **time an explicit state component** and using **time guards** on transitions.

**Key insight**: Encode time as part of the state `(world, t)` so standard LTL/CTL semantics apply unchanged.

**Sweet spot**: Simpler than timed automata, more expressive than plain LTS, compatible with all temporal logics.

## Motivation

**Problem with plain Kripke structures**: No notion of time windows or temporal constraints.

**Problem with timed automata**: Continuous time, real-valued clocks, region graphs - complexity overkill for discrete scenarios.

**Solution**: Discrete time as state component + guards on transitions.

**Benefits**:
- ✅ Time windows: "Transition only allowed when k₁ < t < k₂"
- ✅ Standard temporal logics: LTL/CTL work out-of-the-box
- ✅ Simple semantics: Just a finite graph with time counter
- ✅ Extensible: Easy path to MDPs, probabilities, rewards

## Formal Definition

A **time-indexed Kripke structure** is a tuple:

```
K = (W, T, S, S₀, R, AP, L)
```

**Components**:

### World States (W)
```
W = {w₀, w₁, ..., wₙ}
```

Finite set of "world modes" or "scenarios" (AI2027 macro-states).

**Example**:
```
W = {S0, S1, S2, ..., S15}
```

Where:
- S0: 2024 baseline
- S1: Agent-1 deployed internally
- S4: Agents scaled to 1M+ employees
- S14: Catastrophe/extinction
- S15: Aligned ASI

### Time Domain (T)
```
T = {0, 1, 2, ..., T_max}  or  T = ℕ
```

Discrete time steps (quarters, years, phases, etc.).

**Example** (quarters since 2024-Q1):
```
T = {0, 1, 2, ..., 24}  (6 years)

Mapping:
  t = 0:  2024-Q1
  t = 4:  2025-Q1
  t = 12: 2027-Q1
  t = 24: 2030-Q1
```

### State Space (S)
```
S = W × T
```

**Global state**: Pair `(w, t)` combining world mode and time.

**Example**:
```
s = (S4, 8)  "Scaled agents at 2026-Q1"
s = (S15, 24) "Aligned ASI at 2030-Q1"
```

**Size**: |S| = |W| × |T| (finite if T bounded)

### Initial States (S₀)
```
S₀ ⊆ S
```

Typically: `S₀ = {(w₀, 0)}` (single initial world state at time 0)

**Example**:
```
S₀ = {(S0, 0)}  "Start at 2024 baseline, time 0"
```

### Transition Relation (R)

```
R ⊆ S × S
```

Defined by **time-guarded edges** on world states.

**For each world transition** `w → w'`:
- **Time window**: `I_{w,w'} ⊆ T` (allowed time steps)
- **Other guards**: Optional predicates on variables

**Construction**:
```
((w, t), (w', t')) ∈ R  iff:
  1. t' = t + 1           (time advances by 1)
  2. t ∈ I_{w,w'}         (time in allowed window)
  3. guards(w, w', t)     (other preconditions satisfied)
```

**Self-loops** (time passes, world unchanged):
```
((w, t), (w, t+1)) ∈ R  for all w, t
```

**Example**:
```
Edge: S0 → S1 (deploy agents)
  Time window: I_{S0,S1} = [0, 8]  (years 2024-2026)

  Transitions:
    (S0, 0) → (S1, 1)  ✓ (t=0 ∈ [0,8])
    (S0, 5) → (S1, 6)  ✓ (t=5 ∈ [0,8])
    (S0, 10) → (S1, 11) ✗ (t=10 ∉ [0,8])
```

### Atomic Propositions (AP)
```
AP = {p₁, p₂, ..., pₖ}
```

Boolean properties observable in states.

**Example**:
```
AP = {
  cat,           // Catastrophe/extinction
  aligned,       // Aligned ASI achieved
  agi,           // AGI reached
  superint,      // Superintelligence
  race,          // US-China race
  slowdown,      // Slowdown regime
  theft,         // Weight theft occurred
  signal,        // Misalignment signal detected
  highRisk,      // Alignment risk > 0.5
  lowSec,        // Security level < 2.0
  deployed,      // Agents deployed
  ...
}
```

### Labeling Function (L)
```
L: S → 2^AP
```

Maps each state to set of true propositions.

**Example**:
```
L((S0, 0)) = {deployed}
L((S4, 8)) = {agi, highRisk, deployed}
L((S5, 10)) = {agi, theft, highRisk}
L((S15, 24)) = {aligned, superint}
L((S14, 18)) = {cat, superint}
```

## Time Guards: k₁ < t < k₂

**Core mechanism**: Restrict transitions to time windows.

### Interval Types

```
[a, b]      - Closed: a ≤ t ≤ b
(a, b)      - Open: a < t < b
[a, b)      - Half-open: a ≤ t < b
[a, ∞)      - Unbounded: t ≥ a
```

### Common Patterns

**1. Early window** (only in early phase):
```
I_{w,w'} = [0, k]
```
"Transition only available in first k steps."

**2. Late window** (only after delay):
```
I_{w,w'} = [k, ∞)
```
"Transition becomes available after k steps."

**3. Specific window** (temporal constraint):
```
I_{w,w'} = [k₁, k₂]
```
"Transition only possible between k₁ and k₂."

**4. Deadline** (must act by time k):
```
I_{w,w'} = [0, k]
I_{w,w''} = [k, ∞)  (forced alternative)
```
"Choose w' by time k, or forced to w''."

### AI2027 Examples

**1. Agent deployment** (early action):
```
S0 → S1: I = [0, 8]
```
"Deploy agents between 2024-2026 (quarters 0-8)."

**2. AGI emergence** (not too early):
```
S4 → S7: I = [8, ∞)
```
"AGI can't emerge before 2026 (quarter 8)."

**3. Policy window** (deadline):
```
S6 → S9 (slowdown): I = [6, 18]
S6 → S8 (race):     I = [18, ∞)
```
"Must choose slowdown by quarter 18 (mid-2028), else race lock-in."

**4. Theft vulnerability** (specific period):
```
S4 → S5 (theft): I = [6, 16]
```
"Weight theft only possible in 2025-2028 (quarters 6-16)."

## Semantics

### Paths (Traces)

A **path** is an infinite sequence:
```
π = s₀, s₁, s₂, ...
```

Where:
- s₀ ∈ S₀ (starts at initial state)
- ∀i ≥ 0: (sᵢ, sᵢ₊₁) ∈ R (follows transition relation)

**Typically**: sᵢ = (wᵢ, i) (time advances by 1 each step)

### LTL Semantics

LTL formulas evaluated over paths exactly as standard:

```
π, i ⊨ p        iff  p ∈ L(sᵢ)
π, i ⊨ ¬φ       iff  π, i ⊭ φ
π, i ⊨ φ ∧ ψ    iff  π, i ⊨ φ  and  π, i ⊨ ψ

π, i ⊨ X φ      iff  π, i+1 ⊨ φ
π, i ⊨ F φ      iff  ∃j ≥ i: π, j ⊨ φ
π, i ⊨ G φ      iff  ∀j ≥ i: π, j ⊨ φ
π, i ⊨ φ U ψ    iff  ∃j ≥ i: (π, j ⊨ ψ  and  ∀i ≤ k < j: π, k ⊨ φ)
```

**No changes** from standard LTL! Time guards affect which paths exist, not semantics.

### CTL Semantics

CTL formulas evaluated over state tree:

```
K, s ⊨ p        iff  p ∈ L(s)
K, s ⊨ ¬φ       iff  K, s ⊭ φ
K, s ⊨ φ ∧ ψ    iff  K, s ⊨ φ  and  K, s ⊨ ψ

K, s ⊨ EX φ     iff  ∃s' ∈ succ(s): K, s' ⊨ φ
K, s ⊨ AX φ     iff  ∀s' ∈ succ(s): K, s' ⊨ φ

K, s ⊨ EF φ     iff  ∃ path π from s: ∃i ≥ 0: K, π[i] ⊨ φ
K, s ⊨ AF φ     iff  ∀ path π from s: ∃i ≥ 0: K, π[i] ⊨ φ

... (standard CTL semantics)
```

Again, **no changes**! Time affects R, not the logic.

## AI2027 Example: Complete Model

### World States
```
W = {S0, S1, S4, S5, S6, S7, S8, S9, S14, S15}
```

(Simplified AI2027 graph)

### Time Domain
```
T = {0, 1, 2, ..., 24}  (quarters 2024-Q1 to 2030-Q1)
```

### State Space
```
S = W × T

Examples:
  (S0, 0)   - 2024 baseline, start
  (S4, 8)   - Scaled agents, 2026-Q1
  (S14, 18) - Catastrophe, 2028-Q3
  (S15, 24) - Aligned ASI, 2030-Q1
```

### Initial State
```
S₀ = {(S0, 0)}
```

### Transitions with Time Guards

```
Edge                Time Window  Meaning
----                -----------  -------
S0 → S1             [0, 8]       Deploy agents by 2026
S1 → S4             [2, 12]      Scale after deployment, before 2027
S4 → S5 (theft)     [6, 16]      Theft possible 2025-2028
S4 → S6 (controls)  [6, 18]      Controls possible before mid-2028
S6 → S9 (slowdown)  [0, 18]      Slowdown choice before mid-2028
S6 → S8 (race)      [18, ∞)      After deadline, race locked
S7 → S14 (catastrophe) [12, ∞)   Catastrophe possible from 2027 on
S9 → S15 (aligned)  [16, ∞)      Alignment after sufficient progress

Self-loops:
S0 → S0, S1 → S1, ..., (all states)  Time passes
```

### Labeling
```
L((S0, t)) = {}
L((S1, t)) = {deployed}
L((S4, t)) = {deployed, agi} if t ≥ 8
L((S5, t)) = {deployed, agi, theft}
L((S6, t)) = {deployed, agi, signal}
L((S8, t)) = {race, superint} if t ≥ 12
L((S9, t)) = {slowdown, superint} if t ≥ 12
L((S14, t)) = {cat, superint}
L((S15, t)) = {aligned, superint}
```

### Example Paths

**Path 1: Cautious success**
```
(S0,0) → (S1,1) → (S1,2) → (S4,3) → (S6,4) →
(S9,5) → (S9,6) → ... → (S15,20)

Labeled trace:
  {} → {deployed} → {deployed} → {deployed,agi} →
  {deployed,agi,signal} → {slowdown,superint} → ... →
  {aligned,superint}

Satisfies: F aligned, G ¬cat, F slowdown
```

**Path 2: Theft then catastrophe**
```
(S0,0) → (S1,1) → (S4,2) → (S5,3) → (S7,4) →
(S8,5) → ... → (S14,15)

Labeled trace:
  {} → {deployed} → {deployed,agi} → {deployed,agi,theft} →
  {race} → ... → {cat,superint}

Satisfies: F cat, F theft, ¬(F aligned)
Violates: G ¬cat
```

**Path 3: Deadline miss, race lock-in**
```
(S0,0) → ... → (S6,10) → (S6,11) → ... →
(S6,18) → (S8,19) → ... → (S14,22)

At t=18, slowdown window closed, forced to race.

Violates: F slowdown
Satisfies: F race
```

## Temporal Logic Properties

### Time-Implicit Properties (Standard LTL)

```
Safety:
  G ¬cat                          (never catastrophe)
  G (deployed → ¬cat)             (deployment doesn't cause catastrophe)

Liveness:
  F aligned                       (eventually aligned)
  G (signal → F slowdown)         (signals trigger slowdown)

Causality:
  ¬superint U agi                 (AGI before superintelligence)
```

### Time-Aware Properties (Encode bounds)

**Bounded eventually** (within k steps):
```
F_≤k φ  ≡  φ ∨ Xφ ∨ XXφ ∨ ... ∨ X^k φ
```

**Example**: Align within 20 quarters
```
F_≤20 aligned
```

**Bounded globally** (for k steps):
```
G_≤k φ  ≡  φ ∧ Xφ ∧ XXφ ∧ ... ∧ X^k φ
```

**Example**: Safe for 8 quarters
```
G_≤8 ¬cat
```

### Time-Constrained via State

Since time is in state, can use predicates:

```
(t ≤ 12) → ¬superint              (No ASI before 2027)
(signal ∧ t < 18) → F slowdown    (Early signal enables slowdown)
(t ≥ 18 ∧ race) → G race          (Late race is irreversible)
```

## Extensions

### Add Nondeterminism

Already present! Multiple outgoing edges = nondeterministic choice.

**Example**:
```
(S4, 8) → (S5, 9)  (theft)
(S4, 8) → (S6, 9)  (controls)
(S4, 8) → (S4, 9)  (nothing)
```

Environment/adversary chooses.

### Add Probabilities → DTMC

Replace R with probability function:

```
P: S × S → [0, 1]

P((S4, t), (S5, t+1)) = 0.15  (theft probability)
P((S4, t), (S6, t+1)) = 0.10  (controls probability)
P((S4, t), (S4, t+1)) = 0.75  (nothing)
```

Time guards remain: P(s, s') = 0 if transition disallowed.

**Now**: PCTL properties like `P_≤0.05[F cat]`

### Add Actions → MDP

Add action set A:

```
R: S × A × S → {0,1}  (enabled transitions)
P: S × A × S → [0,1]  (probabilities)

Example:
  Action: INVEST_SECURITY
  (S4, t) →^{INVEST_SEC} (S4, t+1)  with lower theft probability
```

**Now**: Strategy synthesis, PCTL with P^min / P^max

### Add Rewards → MRM

Add reward function:

```
r: S → ℝ  (state rewards)
r: S × A → ℝ  (action rewards)

Example:
  r(S14) = -1000  (catastrophe cost)
  r(S15) = +1000  (alignment reward)
  r(s, RACE) = -10  (race cost per quarter)
```

**Now**: Expected reward queries, optimization

### Add Variables → Hybrid

Add continuous variables to state:

```
S = W × T × V

v ∈ V: {compute, rnd, sec, hack, align, gov}

Example state:
  (S4, 8, {compute: 1.2, rnd: 1.4, sec: 2.0, ...})
```

Guards can reference variables:

```
S4 → S5 (theft): t ∈ [6,16] ∧ sec < 2.5
S6 → S14 (catastrophe): align > 0.6
```

**Now**: Hybrid system, predicate abstraction

## Comparison with Other Models

| Feature | Kripke | Time-Indexed Kripke | Timed Automata | MDP |
|---------|--------|---------------------|----------------|-----|
| **Time** | Implicit steps | Explicit discrete T | Real-valued clocks | Implicit steps |
| **Time guards** | No | Yes (k₁ ≤ t ≤ k₂) | Yes (x ≤ c) | No |
| **Complexity** | Simple | Simple | Complex (regions) | Medium |
| **LTL/CTL** | Native | Native | Requires abstraction | PCTL variant |
| **Probabilities** | No | Extension | Extension | Native |
| **State space** | |W| | |W| × |T| | |W| × (ℝ₊)^n | |W| |

## Implementation

### Data Structure

```javascript
class TimeIndexedKripke {
  constructor() {
    this.worlds = new Set()        // W
    this.timeMax = 24              // T = {0, ..., 24}
    this.initial = {w: 'S0', t: 0} // S₀
    this.edges = []                // Transition templates
    this.labels = new Map()        // L: S → 2^AP
  }

  addEdge(from, to, timeWindow, guards = []) {
    this.edges.push({
      from, to,
      timeWindow: {min: timeWindow[0], max: timeWindow[1]},
      guards
    })
  }

  isTransition(state, nextState) {
    const {w, t} = state
    const {w: w2, t: t2} = nextState

    // Time must advance by 1
    if (t2 !== t + 1) return false

    // Check edges
    for (const edge of this.edges) {
      if (edge.from === w && edge.to === w2) {
        // Check time window
        if (t < edge.timeWindow.min || t > edge.timeWindow.max)
          return false

        // Check other guards
        if (!edge.guards.every(g => g(state)))
          return false

        return true
      }
    }

    // Self-loop (time passes)
    return w === w2
  }

  successors(state) {
    const {w, t} = state
    const nexts = []

    // Self-loop
    if (t < this.timeMax) {
      nexts.push({w, t: t + 1})
    }

    // Other transitions
    for (const edge of this.edges) {
      if (edge.from === w &&
          t >= edge.timeWindow.min &&
          t <= edge.timeWindow.max &&
          edge.guards.every(g => g(state))) {
        nexts.push({w: edge.to, t: t + 1})
      }
    }

    return nexts
  }

  getLabel(state) {
    const key = `${state.w},${state.t}`
    return this.labels.get(key) || new Set()
  }
}
```

### Example Construction

```javascript
const K = new TimeIndexedKripke()

// Worlds
K.worlds = new Set(['S0', 'S1', 'S4', 'S5', 'S6', 'S9', 'S15', 'S14'])

// Edges with time windows
K.addEdge('S0', 'S1', [0, 8])      // Deploy by 2026
K.addEdge('S1', 'S4', [2, 12])     // Scale 2024-2027
K.addEdge('S4', 'S5', [6, 16])     // Theft 2025-2028
K.addEdge('S4', 'S6', [6, 18])     // Controls before mid-2028
K.addEdge('S6', 'S9', [0, 18])     // Slowdown before mid-2028
K.addEdge('S6', 'S8', [18, Infinity]) // Race after deadline
K.addEdge('S9', 'S15', [16, Infinity]) // Align after progress

// Labels
K.labels.set('S0,0', new Set([]))
K.labels.set('S1,5', new Set(['deployed']))
K.labels.set('S4,10', new Set(['deployed', 'agi']))
K.labels.set('S15,22', new Set(['aligned', 'superint']))
K.labels.set('S14,20', new Set(['cat', 'superint']))
```

### Path Generation

```javascript
function* generatePaths(K, maxDepth) {
  function* extend(state, depth, path) {
    if (depth >= maxDepth) {
      yield path
      return
    }

    for (const next of K.successors(state)) {
      yield* extend(next, depth + 1, [...path, next])
    }
  }

  yield* extend(K.initial, 0, [K.initial])
}

// Generate all paths up to depth 20
for (const path of generatePaths(K, 20)) {
  console.log(path.map(s => `(${s.w},${s.t})`).join(' → '))
}
```

## Model Checking

**Standard algorithms** work unchanged:

### LTL Model Checking

1. Build Büchi automaton for ¬φ
2. Product K × A_¬φ
3. Check for accepting cycles
4. Complexity: O(|W| × |T| × 2^|φ|)

### CTL Model Checking

1. Fixpoint computation on state graph
2. Complexity: O(|W| × |T| × |φ|)

**Time guards** affect reachability, not algorithm!

## Strengths

✅ **Minimal extension**: Just add time to state
✅ **Standard semantics**: LTL/CTL unchanged
✅ **Time windows**: Natural k₁ < t < k₂ constraints
✅ **Extensible**: Easy path to MDPs, probabilities
✅ **Implementable**: Simple data structures
✅ **Tool-friendly**: Export to PRISM, NuSMV, SPIN

## Limitations

❌ **Discrete time**: Can't express "exactly 2.5 years"
❌ **Linear time growth**: |S| grows with T_max
❌ **No clock resets**: Can't model "time since event" without encoding
❌ **Uniform tick**: All transitions advance time by 1

## When to Use

Use time-indexed Kripke when you want to:

✓ **Discrete time** sufficient (quarters, phases)
✓ **Time windows** on transitions (k₁ < t < k₂)
✓ **Standard temporal logics** (LTL, CTL, PCTL)
✓ **Simple implementation** (no clocks, no regions)
✓ **Extensibility** to probabilities/rewards later

**Don't use** when you need:
- Continuous time: Use CTMDP or timed automata
- Multiple independent clocks: Use timed automata
- Sub-step timing: Need finer granularity

## AI2027 Analysis with Time-Indexed Kripke

**Questions answerable**:

1. "Can we avoid catastrophe?" → EF ¬cat via CTL
2. "Must we decide by 2027?" → Use deadline edge guards
3. "What if theft occurs early vs late?" → Compare paths with different t
4. "Probability of alignment by 2030?" → Add probabilities, use PCTL

**Workflow**:
1. Model AI2027 as time-indexed Kripke
2. Specify properties in LTL/CTL
3. Model check using standard tools
4. Analyze counterexamples (timing-aware paths)

## References

- Kripke, S. (1963). "Semantical analysis of modal logic"
- Clarke et al. (1999). "Model Checking" (Chapter 2: Kripke Structures)
- Baier & Katoen (2008). "Principles of Model Checking"
- Vardi, M.Y. (1996). "An automata-theoretic approach to linear temporal logic"
- Pnueli, A. (1977). "The temporal logic of programs"
