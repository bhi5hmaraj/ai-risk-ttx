# Current Model: Labeled Transition System with Effects

## Formal Definition

A **Labeled Transition System with Side Effects** on continuous variables:

```
M = (S, A, δ, V, ε, s₀, v₀)
```

**Components:**
- **S**: Finite set of discrete states (scenarios)
- **A**: Set of labeled actions (strategic decisions)
- **δ: S × A → S**: Partial transition function (deterministic)
- **V ⊆ ℝ⁶**: Continuous state space (bounded)
- **ε: A → (V → V)**: Effect function mapping actions to transformations
- **s₀ ∈ S**: Initial state
- **v₀ ∈ V**: Initial variable values

## State Space

### Discrete States (S)
```
S = {S0, S1, S2, ..., S15}
|S| = 16
```

Example states:
- S0: 2024 baseline (frontier LLMs)
- S1: Agent-1 deployed internally
- S4: Agents scaled to 1M+ employees
- S14: Extinction (terminal)
- S15: Aligned committee control (terminal)

### Continuous Variables (V)

```
V = {(c, r, s, h, a, g) | c, r ∈ ℝ₊, s ∈ [0,5], h, a, g ∈ [0,1]}
```

Variables:
- **c (compute)**: Compute relative to 2024, c ∈ ℝ₊
- **r (rnd)**: R&D productivity multiplier, r ∈ ℝ₊
- **s (sec)**: Security level, s ∈ [0, 5]
- **h (hack)**: Theft/espionage probability, h ∈ [0, 1]
- **a (align)**: Alignment risk, a ∈ [0, 1]
- **g (gov)**: Gov centralization, g ∈ [0, 1]

## Transition Function (δ)

**Partial function**: Not all (state, action) pairs have defined transitions.

```
δ: S × A ⇀ S

δ(s, a) = s'  if (s, a, s') ∈ Transitions
          ⊥   otherwise
```

**Example transitions:**
```
δ(S0, "Deploy Agent-1 internally") = S1
δ(S1, "Push to 100M+ consumer release") = S2
δ(S1, "Keep as internal research tool") = S3
δ(S1, "Scale agents to 1M+ employees") = S4
```

**Properties:**
- **Deterministic**: Each (s, a) pair has at most one target
- **Non-total**: Terminal states have no outgoing transitions
- **Branching**: States may have multiple actions (|Actions(s)| ≥ 0)

## Effect Function (ε)

Effects are structured transformations:

```
ε: A → Effect
Effect = (Mul × Add)

Mul = {μ: {compute, rnd} → ℝ₊}
Add = {α: {sec, hack, align, gov} → ℝ}
```

**Effect application order:**
```
apply(v, ε(a)) = v'  where:
  v'.compute = v.compute × ε(a).mul.compute
  v'.rnd     = v.rnd × ε(a).mul.rnd
  v'.sec     = clamp([0,5], v.sec + ε(a).add.sec)
  v'.hack    = clamp([0,1], v.hack + ε(a).add.hack)
  v'.align   = clamp([0,1], v.align + ε(a).add.align)
  v'.gov     = clamp([0,1], v.gov + ε(a).add.gov)
```

**Rationale for structure:**
- **Multiplicative (compute, rnd)**: Models exponential growth (compound R&D progress)
- **Additive (risks)**: Linear changes more interpretable for probabilities
- **Clamping**: Enforces domain constraints

## Semantics (Execution)

### Configuration
```
C = S × V
Initial configuration: c₀ = (s₀, v₀)
```

### Step Relation
```
(s, v) →ᵃ (s', v')  iff  δ(s, a) = s' ∧ v' = apply(v, ε(a))
```

### Trajectory
```
Trajectory τ = c₀ →^(a₀) c₁ →^(a₁) c₂ →^(a₂) ... →^(aₙ) cₙ
```

Where each cᵢ = (sᵢ, vᵢ).

## Example: S0 → S1 Transition

**Initial configuration:**
```
c₀ = (S0, v₀)
v₀ = {compute: 1.0, rnd: 1.0, sec: 2.5, hack: 0.3, align: 0.2, gov: 0.2}
```

**Action:**
```
a = "Deploy Agent-1 internally"

ε(a) = {
  mul: {compute: 1.0, rnd: 1.2},
  add: {sec: 0, hack: 0.05, align: 0.05, gov: 0}
}
```

**Transition:**
```
δ(S0, a) = S1
```

**Effect application:**
```
v₁.compute = 1.0 × 1.0 = 1.0
v₁.rnd     = 1.0 × 1.2 = 1.2
v₁.sec     = clamp([0,5], 2.5 + 0) = 2.5
v₁.hack    = clamp([0,1], 0.3 + 0.05) = 0.35
v₁.align   = clamp([0,1], 0.2 + 0.05) = 0.25
v₁.gov     = clamp([0,1], 0.2 + 0) = 0.2
```

**Result:**
```
c₁ = (S1, v₁)
c₀ →^a c₁
```

## Properties

### Determinism
For all s ∈ S, a ∈ A:
```
|{s' | δ(s, a) = s'}| ≤ 1
```

### Reachability
```
Reach(s) = {s' | ∃ trajectory s₀ →* s →* s'}
```

Progressive revelation shows only visited states.

### Termination
```
Terminal(s) ⟺ ∀a ∈ A: δ(s, a) = ⊥
```

Examples: S14 (extinction), S15 (aligned control)

## Strengths

✅ **Simplicity**: Easy to understand and implement
✅ **Determinism**: Predictable behavior for given choices
✅ **Modularity**: States and effects cleanly separated
✅ **Visualization**: Natural graph representation

## Limitations

❌ **No time dimension**: Transitions are instantaneous
❌ **No stochasticity**: No random events or probabilities
❌ **No continuous evolution**: Variables only change on transitions
❌ **User-driven only**: No autonomous world dynamics

## Implementation

Current implementation in:
- `visualizer_canvas_simple/src/data/states.js` (S, A, δ)
- `visualizer_canvas_simple/src/data/effects.js` (ε)
- `visualizer_canvas_simple/src/App.jsx` (execution semantics)

## When to Use

This model is appropriate when:
- User choices are the primary driver
- Deterministic outcomes suffice
- Time is abstracted away
- Visualization and exploration are priorities
- Simplicity trumps realism

## References

- Keller, R.M. (1976). "Formal verification of parallel programs"
- Plotkin, G.D. (1981). "A structural approach to operational semantics"
- Baier & Katoen (2008). "Principles of Model Checking" (Chapter 2: Transition Systems)
