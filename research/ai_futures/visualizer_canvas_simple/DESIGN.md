# AI2027 Canvas Visualizer - Design Documentation

## Overview

The AI2027 Canvas Visualizer models AI development trajectories as an **interactive state machine** with **labeled transitions** (actions) that apply **effects** to continuous state variables. Users explore possible futures by choosing actions, creating a **trajectory** through the state space.

## Formalism

### Core Model: Labeled State Machine with Effects

The system is formalized as a **labeled transition system** (LTS) with side effects:

```
M = (S, A, δ, V, ε, s₀, v₀)
```

Where:
- **S**: Finite set of discrete states (scenarios in AI development)
- **A**: Set of labeled actions (strategic choices, policy decisions)
- **δ: S × A → S**: Transition function (deterministic, partial)
- **V**: Continuous state variables (R⁶ vector space)
- **ε: A → (V → V)**: Effect function mapping actions to variable transformations
- **s₀ ∈ S**: Initial state (S0, "2024 baseline")
- **v₀ ∈ V**: Initial variable values

### State Variables (V ∈ R⁶)

The continuous state is a 6-dimensional vector:

```
v = (compute, rnd, sec, hack, align, gov)
```

Where:
- **compute** ∈ R₊: Compute availability relative to 2024 baseline (multiplicative, no upper bound)
- **rnd** ∈ R₊: AI R&D productivity multiplier (multiplicative, no upper bound)
- **sec** ∈ [0, 5]: Security level (discrete levels 0-5, integer-valued in practice)
- **hack** ∈ [0, 1]: Probability of model weights theft/espionage
- **align** ∈ [0, 1]: Alignment risk (probability of misalignment)
- **gov** ∈ [0, 1]: Government centralization (0 = distributed, 1 = centralized control)

### Effect Functions (ε)

Each action `a ∈ A` applies an effect `ε(a)` that transforms variables:

```
ε(a) = (mul, add)

where:
  mul = { compute: k_c, rnd: k_r }              // Multiplicative effects
  add = { sec: Δs, hack: Δh, align: Δa, gov: Δg }  // Additive effects
```

The effect application follows this order:

```javascript
apply(v, ε(a)):
  v' = v
  v'.compute ← v.compute × ε(a).mul.compute
  v'.rnd ← v.rnd × ε(a).mul.rnd
  v'.sec ← clamp([0,5], v.sec + ε(a).add.sec)
  v'.hack ← clamp([0,1], v.hack + ε(a).add.hack)
  v'.align ← clamp([0,1], v.align + ε(a).add.align)
  v'.gov ← clamp([0,1], v.gov + ε(a).add.gov)
  return v'
```

**Design rationale:**
- **Multiplicative** for compute/R&D: Exponential growth (e.g., Moore's Law, compound progress)
- **Additive** for probabilities/risks: Linear changes more interpretable for risks
- **Clamping**: Prevents nonsensical values (negative probabilities, security > level 5)

### Transition Function (δ)

The transition function is **partial** (not defined for all state-action pairs):

```
δ(s, a) = s'  if  (s, a, s') ∈ Transitions
          undefined  otherwise
```

Example transitions from implementation:

```
δ(S0, "Deploy Agent-1 internally") = S1
δ(S1, "Push to 100M+ consumer release") = S2
δ(S1, "Keep as internal research tool") = S3
```

States may have **multiple outgoing actions** (branching) or **no outgoing actions** (terminal states).

## Tuple Structure (History Entries)

The system maintains a **trajectory history** as a sequence of tuples:

```
H = [(h₀, h₁, h₂, ..., hₙ)]
```

Each history entry `hᵢ` is a tuple:

```
hᵢ = (step, state, from, actionLabel, edgeId, compute, rnd, sec, hack, align, gov)
```

**Tuple components:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `step` | ℕ | Step number in trajectory | 0, 1, 2, ... |
| `state` | S | Current discrete state | "S0", "S1", ... |
| `from` | S ∪ {null} | Previous state (null for initial) | "S0", null |
| `actionLabel` | String ∪ {null} | Human-readable action description | "Deploy Agent-1 internally" |
| `edgeId` | String ∪ {null} | Unique transition identifier | "S0-0", "S1-1" |
| `compute` | R₊ | Compute at this step | 1.0, 1.2, 2.4 |
| `rnd` | R₊ | R&D productivity at this step | 1.0, 1.3, 2.7 |
| `sec` | [0,5] | Security level | 2.5, 3.0, 2.0 |
| `hack` | [0,1] | Hacking risk | 0.3, 0.35, 0.5 |
| `align` | [0,1] | Alignment risk | 0.2, 0.15, 0.1 |
| `gov` | [0,1] | Gov centralization | 0.2, 0.3, 0.5 |

**Initial tuple** (h₀):
```javascript
h₀ = {
  step: 0,
  state: "S0",
  from: null,
  actionLabel: null,
  edgeId: null,
  compute: 1.0,
  rnd: 1.0,
  sec: 2.5,
  hack: 0.3,
  align: 0.2,
  gov: 0.2
}
```

**Example trajectory after 2 steps:**

```javascript
[
  // Step 0: Initial state
  {
    step: 0, state: "S0", from: null, actionLabel: null, edgeId: null,
    compute: 1.0, rnd: 1.0, sec: 2.5, hack: 0.3, align: 0.2, gov: 0.2
  },

  // Step 1: Deploy Agent-1 internally
  {
    step: 1, state: "S1", from: "S0",
    actionLabel: "Deploy Agent-1 internally (stumbling agents)",
    edgeId: "S0-0",
    compute: 1.0, rnd: 1.2, sec: 2.5, hack: 0.35, align: 0.25, gov: 0.2
    // Effect: ε = { mul: {rnd: 1.2}, add: {hack: 0.05, align: 0.05} }
  },

  // Step 2: Scale agents to 1M+ employees
  {
    step: 2, state: "S4", from: "S1",
    actionLabel: "Scale agents to 1M+ employees using",
    edgeId: "S1-2",
    compute: 1.2, rnd: 1.68, sec: 2.0, hack: 0.4, align: 0.35, gov: 0.2
    // Effect: ε = { mul: {compute: 1.2, rnd: 1.4}, add: {sec: -0.5, hack: 0.05, align: 0.1} }
  }
]
```

## Example: Complete State Transition

Let's trace a complete transition from **S0 → S1** via action "Deploy Agent-1 internally":

**Initial state:**
```javascript
discrete_state = S0
variables = { compute: 1.0, rnd: 1.0, sec: 2.5, hack: 0.3, align: 0.2, gov: 0.2 }
```

**Action definition:**
```javascript
{
  label: "Deploy Agent-1 internally (stumbling agents)",
  to: "S1",
  effect: {
    mul: { compute: 1.0, rnd: 1.2 },  // 20% R&D boost
    add: { sec: 0, hack: 0.05, align: 0.05, gov: 0 }  // Slightly more risk
  }
}
```

**Effect application:**
```javascript
// Multiplicative first
compute' = 1.0 × 1.0 = 1.0
rnd' = 1.0 × 1.2 = 1.2

// Additive (with clamping)
sec' = clamp([0,5], 2.5 + 0) = 2.5
hack' = clamp([0,1], 0.3 + 0.05) = 0.35
align' = clamp([0,1], 0.2 + 0.05) = 0.25
gov' = clamp([0,1], 0.2 + 0) = 0.2
```

**New state:**
```javascript
discrete_state = S1
variables = { compute: 1.0, rnd: 1.2, sec: 2.5, hack: 0.35, align: 0.25, gov: 0.2 }
```

**History entry added:**
```javascript
{
  step: 1,
  state: "S1",
  from: "S0",
  actionLabel: "Deploy Agent-1 internally (stumbling agents)",
  edgeId: "S0-0",
  compute: 1.0, rnd: 1.2, sec: 2.5, hack: 0.35, align: 0.25, gov: 0.2
}
```

## Progressive Revelation

The visualizer implements **progressive state revelation**: only visited states appear in the graph. This creates a sense of exploration and prevents spoilers about future branches.

**Algorithm:**
```javascript
visitedStates = { s ∈ S | ∃ hᵢ ∈ H : hᵢ.state = s }
visibleNodes = { node(s) | s ∈ visitedStates }
visibleEdges = { edge(a) | δ(s, a) ∈ visitedStates ∧ s ∈ visitedStates }
```

## Alternative Model: Finite State Transducer

### What is a Transducer?

A **finite state transducer** (FST) is a generalization of finite automata that produces **output** on each transition:

```
T = (S, Σ, Γ, δ, λ, s₀)
```

Where:
- **S**: States
- **Σ**: Input alphabet (actions)
- **Γ**: Output alphabet (effects, descriptions)
- **δ: S × Σ → S**: Transition function
- **λ: S × Σ → Γ***: Output function (produces sequence of outputs)
- **s₀**: Initial state

### Would Transducer Model Be Better?

**Advantages of transducer formalism:**

1. **Natural output modeling**: The λ function could emit:
   - Narrative descriptions (what happened)
   - Variable deltas (Δcompute, Δhack, etc.)
   - Warning messages (security alerts, risk thresholds)
   - Event logs (espionage incidents, breakthroughs)

2. **Separation of concerns**:
   - `δ` handles state transitions (discrete scenarios)
   - `λ` handles effects (continuous variables, narratives)
   - Current model conflates these in action definitions

3. **Composition**: Transducers can be composed, enabling:
   - Modular scenario building (combine sub-trajectories)
   - Parallel processes (e.g., US and China development paths)
   - Uncertainty modeling (probabilistic transducers)

4. **Formal verification**: Well-studied transducer theory enables:
   - Checking reachability ("Can we reach aligned AGI?")
   - Invariant verification ("Is security always ≥ threshold?")
   - Equivalence checking (do two paths lead to same outcome?)

**Disadvantages/Challenges:**

1. **Overkill for current scope**:
   - Only 16 states, deterministic transitions
   - Transducer machinery (output tapes, composition) unused
   - Current LTS + effects is simpler and sufficient

2. **Implementation complexity**:
   - Need formal output alphabet (currently effects are arbitrary JS objects)
   - Output composition rules unclear (how to combine narrative strings?)
   - UI mapping less obvious (how to display output tape?)

3. **Continuous variables don't fit cleanly**:
   - Transducers emit **discrete symbols** from finite Γ
   - Our effects are **real-valued transformations** (compute × 1.2, hack + 0.05)
   - Would need to discretize or use extended transducer variant

### Recommendation

**Use transducer model IF:**
- Narrative generation becomes central (LLM-generated stories per transition)
- Multiple parallel processes (US vs China development, racing labs)
- Probabilistic outcomes (roll dice for espionage, breakthrough timing)
- Scenario composition (modular sub-plots that combine)

**Stick with current LTS + effects IF:**
- Deterministic user choices remain core interaction
- Variable transformations are primary effects (not narratives)
- Simplicity and understandability are priorities
- No need for formal verification

**Hybrid approach (recommended):**
Extend current model with **output function** without full transducer formalism:

```javascript
action = {
  label: String,           // Human-readable choice
  to: StateId,            // Transition function δ
  effect: Effect,         // Variable transformation ε
  output: {               // Output function λ (NEW)
    narrative: String,    // What happens (could be LLM-generated)
    events: [Event],      // Triggered events (espionage, breakthrough)
    alerts: [Alert]       // Warnings (threshold violations)
  }
}
```

This gives transducer benefits (rich outputs) without complexity (formal composition, verification).

## V1 vs V2 Architecture Comparison

### V1 (research/ai_futures/visualizer)

**Model:**
- 21 states, 29 transitions
- Plotly time-series graphs
- Event system with impact tracking
- Separate data files (JSON format)
- Progressive disclosure infrastructure

**Focus:** Research presentation, epistemic confidence, grounding in AI2027 forecasts

### V2 (visualizer_canvas_simple)

**Model:**
- 16 states, simplified transitions
- Recharts inline graphs
- Direct state variable display
- Modular JS/JSX data layer
- Progressive revelation (visited states only)

**Focus:** Interactive exploration, user-driven trajectories, causal understanding

Both are valid representations optimized for different use cases: V1 for presenting research, V2 for exploring possibilities.

## References

- **Labeled Transition Systems (LTS)**: Keller, R. M. (1976). "Formal verification of parallel programs."
- **Finite State Transducers**: Roche & Schabes (1997). "Finite-State Language Processing."
- **Hybrid Systems**: Alur et al. (1995). "The algorithmic analysis of hybrid systems."
- **AI2027 Research**: https://ai-2027.com (Kokotajlo, Alexander, et al.)

---

## Appendix: Complete State Definitions

The 16 states represent a simplified AI development timeline:

- **S0** (2024): Baseline (frontier LLMs, no AGI)
- **S1** (2024-25): Agent-1 deployed internally (stumbling agents)
- **S2-S3**: Consumer agent releases vs research tools
- **S4**: Scaled agents (1M+ employees using)
- **S5-S6**: Compute/capability branches
- **S7-S10**: AGI variants (different alignment/security profiles)
- **S11-S13**: Superintelligence scenarios
- **S14**: Extinction (terminal, misaligned ASI)
- **S15**: Aligned committee control (terminal, success case)

See `src/data/states.js` for complete definitions with all actions and effects.
