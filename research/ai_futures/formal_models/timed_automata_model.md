# Timed Automata Model

## Motivation

**Problem**: Need to model **hard timing constraints** and **deadlines**.

**Real-world scenarios**:
- "If US doesn't choose slowdown by 2027-Q1, race lock-in occurs"
- "If misalignment signal appears and no policy response within 6 months, transition to extinction"
- "Espionage risk grows linearly with time since last security audit"

**Solution**: Finite automata extended with **real-valued clocks**.

## Formal Definition

A **Timed Automaton** (Alur & Dill, 1994):

```
A = (L, L₀, C, A, E, I)

Where:
  L: Finite set of locations (like states)
  L₀ ⊆ L: Initial locations
  C: Finite set of clocks (real-valued timers)
  A: Alphabet (actions/events)
  E ⊆ L × A × Φ(C) × 2^C × L: Edges
  I: L → Φ(C): Invariants (conditions to stay in location)
```

**Clock constraints** Φ(C):
```
φ ::= true | x ~ n | x - y ~ n | φ ∧ φ

Where:
  x, y ∈ C  (clocks)
  ~ ∈ {<, ≤, =, ≥, >}
  n ∈ ℕ  (integer constants)
```

## Components

### Locations (L)

Similar to states, but focus on **control flow**:

```
L = {S0, S1, ..., S15, RACE_LOCKED, EXTINCTION, ALIGNED}
```

Example:
- S4: "Agents scaled, security moderate, time since deployment: x₁"
- RACE_LOCKED: "US and China in irreversible race"

### Clocks (C)

**Real-valued variables** that advance at rate 1:

```
C = {x₁, x₂, x₃, ...}

Example clocks:
  x_deploy: Time since agent deployment
  x_signal: Time since last alignment signal
  x_audit: Time since last security audit
  x_decision: Time since policy window opened
```

**Clock dynamics**:
- All clocks advance at **uniform rate 1** (dt/dt = 1)
- Clocks can be **reset to 0** on transitions
- Clocks are **never negative**

### Edges (E)

```
Edge = (source, action, guard, reset, target)

Where:
  source ∈ L: Source location
  action ∈ A: Event/action label
  guard ∈ Φ(C): Clock constraint (when edge is enabled)
  reset ⊆ C: Clocks to reset to 0
  target ∈ L: Target location
```

**Example edge**:
```
(S4, WEIGHT_THEFT, x_audit ≥ 6, {x_audit}, S5)

Interpretation:
  From S4, if at least 6 months since last audit,
  WEIGHT_THEFT can occur, reset audit timer, go to S5
```

### Invariants (I)

**Location invariants**: Conditions to remain in location.

```
I: L → Φ(C)

Example:
  I(S4) = x_deploy ≤ 12

Interpretation:
  Can stay in S4 only if deployment time ≤ 12 months
  After 12 months, MUST leave (forced transition)
```

## Semantics

### Configuration (State)

```
State = (l, v)

Where:
  l ∈ L: Current location
  v: C → ℝ₊: Clock valuation (values of all clocks)
```

**Example**:
```
(S4, {x_deploy: 8.3, x_audit: 2.1, x_decision: 0.5})
```

### Transitions

**Two types of transitions**:

1. **Time passage** (delay transition):
```
(l, v) →^d (l, v + d)   if  ∀t ∈ [0, d]: v + t ⊨ I(l)

Interpretation:
  Stay in same location for duration d,
  all clocks advance by d,
  invariant must hold throughout
```

2. **Discrete jump** (action transition):
```
(l, v) →^a (l', v')   if  ∃ edge (l, a, φ, R, l'):
                             v ⊨ φ  (guard satisfied)
                             v'[c] = 0 if c ∈ R
                             v'[c] = v[c] if c ∉ R
                             v' ⊨ I(l')  (target invariant)

Interpretation:
  Take edge labeled a from l to l',
  guard φ must be satisfied,
  reset clocks in R to 0,
  keep other clocks unchanged,
  must satisfy target invariant immediately
```

### Sample Execution

```
Initial: (S0, {x_deploy: 0})

→^{3.2} (S0, {x_deploy: 3.2})          [time passes]

→^{DEPLOY} (S1, {x_deploy: 0})         [deployment, reset timer]

→^{5.8} (S1, {x_deploy: 5.8})          [time passes]

→^{SCALE} (S4, {x_deploy: 5.8, x_audit: 0})  [scale agents, start audit timer]

→^{6.1} (S4, {x_deploy: 11.9, x_audit: 6.1})  [time passes]

→^{THEFT} (S5, {x_deploy: 11.9, x_audit: 0})  [theft occurs, reset audit timer]
```

## Example: Race Lock-In Deadline

**Scenario**: If US doesn't choose SLOWDOWN by 2027-Q1 (12 quarters from start), race becomes irreversible.

**Timed automaton**:

```
Locations:
  S_PRE_RACE: Before race lock-in
  S_RACE_LOCKED: Race is irreversible
  S_SLOWDOWN: Cooperative regime

Clocks:
  x_start: Time since scenario start

Edges:
  (S_PRE_RACE, SLOWDOWN, x_start < 12, {}, S_SLOWDOWN)
    "Choose slowdown before deadline"

  (S_PRE_RACE, RACE, true, {}, S_RACE_LOCKED)
    "Choose race (any time)"

Invariants:
  I(S_PRE_RACE) = x_start ≤ 12
    "Must leave PRE_RACE by quarter 12"

  I(S_RACE_LOCKED) = true
    "Can stay in RACE_LOCKED forever"

  I(S_SLOWDOWN) = true
    "Can stay in SLOWDOWN forever"
```

**Execution scenarios**:

**Scenario A**: Early slowdown
```
(S_PRE_RACE, {x_start: 0})
→^{5} (S_PRE_RACE, {x_start: 5})
→^{SLOWDOWN} (S_SLOWDOWN, {x_start: 5})  ✓ Success
```

**Scenario B**: Late slowdown (fails)
```
(S_PRE_RACE, {x_start: 0})
→^{12} (S_PRE_RACE, {x_start: 12})   [at deadline]
→^{SLOWDOWN} ???  [guard x_start < 12 violated!]

Invariant I(S_PRE_RACE) = x_start ≤ 12 forces:
→^{RACE} (S_RACE_LOCKED, {x_start: 12})  [only option]
```

## Example: Misalignment Signal with Response Window

**Scenario**: If misalignment signal appears and no intervention within 3 months, catastrophe.

**Automaton**:

```
Locations:
  NORMAL: No signals
  SIGNAL: Misalignment signal detected
  CATASTROPHE: Too late
  ALIGNED: Successfully intervened

Clocks:
  x_signal: Time since signal appeared

Edges:
  (NORMAL, SIGNAL_DETECTED, true, {x_signal}, SIGNAL)
    "Signal appears, start response timer"

  (SIGNAL, INTERVENE, x_signal ≤ 3, {}, ALIGNED)
    "Intervene within 3 months → success"

  (SIGNAL, TIMEOUT, x_signal ≥ 3, {}, CATASTROPHE)
    "No response for 3 months → catastrophe"

Invariants:
  I(SIGNAL) = x_signal ≤ 3
    "Must leave SIGNAL within 3 months"
```

**Execution scenarios**:

**Scenario A**: Quick response
```
(NORMAL, {x_signal: 0})
→^{SIGNAL_DETECTED} (SIGNAL, {x_signal: 0})
→^{1.5} (SIGNAL, {x_signal: 1.5})
→^{INTERVENE} (ALIGNED, {x_signal: 1.5})  ✓ Success
```

**Scenario B**: Too slow
```
(NORMAL, {x_signal: 0})
→^{SIGNAL_DETECTED} (SIGNAL, {x_signal: 0})
→^{3} (SIGNAL, {x_signal: 3})  [at invariant boundary]
→^{TIMEOUT} (CATASTROPHE, {x_signal: 3})  ✗ Failed
```

## Extensions: Probabilistic Timed Automata (PTA)

**Add probabilities** to timed automata:

```
PTA = (L, L₀, C, A, E, I, Pr)

Where:
  Pr: E → [0,1]  (probability of taking each edge)
```

**Example**: Signal detection has probability

```
(NORMAL, SIGNAL_DETECTED, true, {x_signal}, SIGNAL) [Pr = 0.1 per quarter]
(NORMAL, NO_SIGNAL, true, {}, NORMAL) [Pr = 0.9 per quarter]
```

Now we can ask: **What's the probability of catastrophe by 2027?**

## Comparison with Other Models

| Feature | Timed Automata | CTMDP | Discrete MDP |
|---------|----------------|-------|--------------|
| **Time** | Real-valued clocks | Exponential rates | Discrete steps |
| **Deadlines** | Native (guards, invariants) | Approximate | Approximate |
| **Stochasticity** | Extension (PTA) | Native | Native |
| **Verification** | Model checking | Value iteration | Policy iteration |
| **Use case** | "Can X happen?" | "How often X?" | "What to do?" |

## Strengths

✅ **Hard deadlines**: Natural modeling of "must happen by T"
✅ **Verification**: Mature model checking tools (UPPAAL, Kronos)
✅ **Timing constraints**: Guards and invariants express complex timing logic
✅ **Multiple clocks**: Can track different timers independently
✅ **Formal analysis**: Decidable reachability ("Can we avoid extinction?")

## Limitations

❌ **No built-in probabilities**: Need PTA extension
❌ **Verification focus**: Better for "is it possible?" than "how likely?"
❌ **Integer constants**: Clock constraints use integers (x ≤ 12, not x ≤ 12.7)
❌ **Complexity**: State space explosion with many clocks
❌ **Learning curve**: Unfamiliar to many practitioners

## Implementation Strategy

### Simplified Approach (UI-Friendly)

Don't implement full TA, just key features:

```javascript
state = {
  location: "S4",
  clocks: {
    x_deploy: 8.3,
    x_audit: 2.1
  },
  variables: {compute: 1.2, ...}
}

// Time passage
function advanceTime(state, delta) {
  for (let clock in state.clocks) {
    state.clocks[clock] += delta
  }
  checkInvariants(state)  // Force transitions if violated
}

// Check if transition is enabled
function isEnabled(edge, clocks) {
  return evaluateGuard(edge.guard, clocks)
}

// Take transition
function takeTransition(state, edge) {
  state.location = edge.target
  for (let clock of edge.reset) {
    state.clocks[clock] = 0
  }
}
```

### UI Elements

**Clock displays**:
```jsx
<div className="clock-panel">
  <Clock name="Time since deployment" value={x_deploy} max={12} />
  <Clock name="Time since last audit" value={x_audit} max={6}
         warning={x_audit > 4} />
</div>
```

**Deadline warnings**:
```jsx
{x_decision > 8 && (
  <Alert severity="warning">
    Policy window closing! Must decide within {12 - x_decision} quarters.
  </Alert>
)}
```

## When to Use

This model is appropriate when:
- **Hard deadlines** are critical ("must act by T")
- **Verification** is desired ("can we avoid bad outcome?")
- **Multiple timers** need tracking independently
- **Timing constraints** are complex (x ≤ 6 ∧ y ≥ 2)
- **Safety analysis** is the goal

Recommended for:
- Policy deadline analysis
- Safety verification ("Can extinction be avoided?")
- Real-time system modeling
- Compliance checking ("Are we meeting timelines?")

**NOT recommended when**:
- Probabilities are central (use PTA or CTMDP instead)
- Continuous variables dominate (use hybrid automata)
- Simplicity is priority (use discrete-time MDP)

## Tools and Model Checkers

**UPPAAL**: Industry-standard TA model checker
- Graphical editor for automata
- CTL-like query language
- Timed trace visualization

**Kronos**: Academic tool for TA
- Reachability analysis
- State space minimization

**PRISM**: Probabilistic model checker
- Supports PTA
- Quantitative queries ("Prob of X by time T?")

## References

- Alur, R. & Dill, D.L. (1994). "A theory of timed automata"
- Bengtsson, J. & Yi, W. (2004). "Timed Automata: Semantics, Algorithms and Tools"
- Kwiatkowska et al. (2011). "PRISM 4.0: Verification of probabilistic real-time systems"
- Behrmann et al. (2004). "A Tutorial on UPPAAL"
