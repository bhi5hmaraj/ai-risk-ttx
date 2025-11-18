# Mealy Machine + MDP: Stochastic Mealy Transducer with Time

## Motivation

**Problem with current model**: World doesn't wait for user input. Even without deliberate actions:
- Cyber operations continue
- Labs scale compute
- Governments make decisions
- Espionage attempts occur

**Solution**: Combine Mealy machine (outputs on edges) with MDP (stochastic transitions + time steps).

## Formal Definition

A **Stochastic Mealy Transducer** (discrete-time MDP with output function):

```
M = (S, A, E, P, G, γ, s₀, t₀)
```

**Components:**
- **S**: State space (discrete scenarios × continuous variables)
- **A**: Action space (policy decisions, including NO-OP)
- **E**: Exogenous event space (environmental occurrences)
- **P: S × A × E × S → [0,1]**: Transition probability function
- **G: S × A × E × S → O**: Output function (Mealy-style)
- **γ ∈ (0,1]**: Discount factor (for planning)
- **s₀**: Initial state
- **t₀**: Initial time

## State Space (S)

States combine discrete scenarios and continuous variables:

```
S = S_discrete × V × T

Where:
  S_discrete = {S0, S1, ..., S15}  (scenario labels)
  V ⊆ ℝ⁶  (compute, rnd, sec, hack, align, gov)
  T = ℕ  (time steps, e.g., quarters since 2024-Q1)
```

**Full state:**
```
s = (σ, v, t)  where:
  σ ∈ S_discrete  (scenario)
  v ∈ V           (continuous variables)
  t ∈ T           (time)
```

## Input Alphabet (Σ)

Each time step receives input:

```
Σ = A × E × {τ}

Where:
  A = {RACE, SLOWDOWN, INVEST_SECURITY, INVEST_ALIGNMENT, NO_OP, ...}
  E = {WEIGHT_THEFT, EXPORT_CONTROLS, BREAKTHROUGH, INCIDENT, NOTHING, ...}
  τ = "tick" (time advance)
```

**Interpretation:**
- **User action (a ∈ A)**: Policy decision or NO_OP
- **Environment event (e ∈ E)**: Sampled from distribution P(e | s, a)
- **Tick (τ)**: Time always advances

## Transition Function (P)

**Stochastic transitions** with time evolution:

```
P(s' | s, a, e) = Pr[s_{t+1} = s' | s_t = s, a_t = a, e_t = e]
```

**Decomposition:**
```
s = (σ, v, t)
s' = (σ', v', t')

P(s' | s, a, e) = P_scenario(σ' | σ, a, e) ×
                  P_variables(v' | v, σ, σ', a, e) ×
                  δ(t' = t + 1)
```

Where:
- **P_scenario**: Scenario transition probabilities
- **P_variables**: Variable evolution (can be deterministic or stochastic)
- **δ(t' = t+1)**: Time always advances by 1

## Output Function (G) - Mealy Style

**Outputs live on edges** (transitions), not states:

```
G: S × A × E × S → O

o_t = G(s_t, a_t, e_t, s_{t+1})
```

**Output space (O):**
```
O = Narrative × Metrics × Events

Where:
  Narrative: String (what happened this step)
  Metrics: ℝ⁶ (current variable values)
  Events: List[Event] (espionage, breakthrough, etc.)
```

**Example output:**
```
G((S4, v₄, 2), INVEST_SECURITY, WEIGHT_THEFT, (S5, v₅, 3)) = {
  narrative: "Despite security investment, sophisticated APT group
              successfully exfiltrated model weights.",
  metrics: {compute: 1.2, rnd: 1.68, sec: 2.0, hack: 0.5, ...},
  events: [{type: "THEFT", severity: "HIGH", actor: "APT-42"}]
}
```

## Time as an Actor

**Key insight**: Even with a = NO_OP, events still happen.

**Environment event distribution:**
```
P(e_t | s_t, a_t = NO_OP) = categorical({
  WEIGHT_THEFT: λ_theft(s_t),
  EXPORT_CONTROLS: λ_controls(s_t),
  BREAKTHROUGH: λ_breakthrough(s_t),
  NOTHING: 1 - Σλᵢ(s_t)
})
```

**Hazard rates** depend on state:
```
λ_theft(σ, v, t) = base_rate × (1 - v.sec/5) × time_factor(t)

Example:
  In S4 with sec=2.0 at t=8 (2026-Q1):
  λ_theft = 0.1 × (1 - 2.0/5) × 1.5 = 0.09 per quarter
```

**Autonomous evolution:**
Even with NO_OP, variables can change:
```
v'.compute = v.compute × growth_rate(t)  # Compute scaling
v'.hack = min(1, v.hack + drift(t))       # Risk accumulation
```

## Execution Semantics

### Step Execution
```
At time step t:

1. Observe current state: s_t = (σ_t, v_t, t)

2. Choose action: a_t ∈ A
   (User decision or default policy π(s_t))

3. Environment samples event: e_t ~ P(e | s_t, a_t)

4. Transition to next state: s_{t+1} ~ P(· | s_t, a_t, e_t)

5. Generate output: o_t = G(s_t, a_t, e_t, s_{t+1})

6. Advance time: t ← t + 1
```

### Trajectory
```
τ = (s₀, a₀, e₀, o₀) → (s₁, a₁, e₁, o₁) → ... → (sₙ, aₙ, eₙ, oₙ)
```

**Probability of trajectory:**
```
Pr[τ] = Π_{t=0}^{n-1} P(s_{t+1} | s_t, a_t, e_t) × P(e_t | s_t, a_t)
```

## Example: S4 with NO_OP

**State at t=8 (2026-Q1):**
```
s₈ = (S4, {compute: 1.2, rnd: 1.4, sec: 2.0, hack: 0.35, align: 0.25, gov: 0.2}, 8)
```

**User action:**
```
a₈ = NO_OP  (user does nothing)
```

**Environment event distribution:**
```
P(e₈ | s₈, NO_OP) = {
  WEIGHT_THEFT: 0.09,
  EXPORT_CONTROLS: 0.05,
  BREAKTHROUGH: 0.12,
  NOTHING: 0.74
}
```

**Sample event:**
```
e₈ = WEIGHT_THEFT  (sampled with probability 0.09)
```

**Transition:**
```
s₉ = (S5, {compute: 1.2, rnd: 1.4, sec: 1.5, hack: 0.50, align: 0.30, gov: 0.2}, 9)

Scenario: S4 → S5 (theft occurred)
Variables: sec decreased, hack increased
Time: 8 → 9
```

**Output:**
```
o₈ = {
  narrative: "State-sponsored APT successfully stole model weights.
              Security posture degraded.",
  metrics: {compute: 1.2, rnd: 1.4, sec: 1.5, hack: 0.50, ...},
  events: [{type: "THEFT", quarter: "2026-Q1", impact: "MAJOR"}]
}
```

**Key observation**: World evolved despite NO_OP action!

## Policy (Strategy)

A **policy** maps states to action distributions:

```
π: S → Δ(A)

Where Δ(A) is probability distribution over actions.
```

**Deterministic policy example:**
```
π(s) = INVEST_SECURITY     if s.sec < 2.0
       INVEST_ALIGNMENT    if s.align > 0.4
       SLOWDOWN            if s.hack > 0.6 ∧ s.align > 0.3
       NO_OP               otherwise
```

**Default policy** (when user doesn't act):
```
π_default(s) = sample based on s.gov:
  High centralization → RACE with prob 0.7
  Low centralization → cautious policies
```

## Comparison with Current Model

| Aspect | Current LTS | Mealy + MDP |
|--------|-------------|-------------|
| **Transitions** | Deterministic | Stochastic |
| **Time** | Implicit (step count) | Explicit (part of state) |
| **Autonomy** | User-driven only | Environment + default policy |
| **Outputs** | Implicit (variable changes) | Explicit (narratives, events) |
| **Realism** | Simplified | Captures uncertainty |

## Strengths

✅ **Time as actor**: World evolves autonomously
✅ **Stochasticity**: Models uncertainty (espionage, breakthroughs)
✅ **Mealy outputs**: Rich feedback (narratives, events, metrics)
✅ **Policies**: Can model different actors (US, China, labs)
✅ **Standard framework**: Well-understood MDP theory

## Limitations

❌ **Discrete time**: Time is quantized (quarters, not continuous)
❌ **Fixed time step**: Can't model "wait for 6 months"
❌ **Complexity**: More parameters (transition probabilities, hazard rates)
❌ **Implementation**: Requires probability distributions, sampling

## Implementation Strategy

### Minimal changes to current codebase:

1. **Add event sampling** in transition logic:
```javascript
// Before transition
const event = sampleEvent(currentState, action)
const nextState = transition(currentState, action, event)
const output = generateOutput(currentState, action, event, nextState)
```

2. **Add default policy** for NO_OP:
```javascript
if (timerExpired && !userChoseAction) {
  action = defaultPolicy(currentState)
}
```

3. **Add time to state**:
```javascript
state = {
  scenario: "S4",
  variables: {...},
  timeStep: 8,  // NEW
  quarter: "2026-Q1"  // NEW (derived)
}
```

4. **Add output generation**:
```javascript
output = {
  narrative: generateNarrative(transition),
  metrics: nextState.variables,
  events: extractEvents(event)
}
```

## When to Use

This model is appropriate when:
- **Realism** matters (world doesn't wait)
- **Uncertainty** is important (espionage, breakthroughs)
- **Time** is a first-class concern
- **Multiple actors** with policies (US, China, labs)
- **Narrative generation** is desired

Recommended for:
- Policy analysis simulations
- Risk assessment tools
- Multi-actor scenarios
- Serious games with time pressure

## References

- Puterman, M.L. (2005). "Markov Decision Processes"
- Sutton & Barto (2018). "Reinforcement Learning: An Introduction"
- Mealy, G.H. (1955). "A Method for Synthesizing Sequential Circuits"
- Alur & Henzinger (1999). "Reactive Modules" (for compositional MDPs)
