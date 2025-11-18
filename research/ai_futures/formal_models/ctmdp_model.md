# Continuous-Time Markov Decision Process (CTMDP)

## Motivation

**Problem with discrete-time MDP**: Time is quantized into fixed steps (quarters, months).

**Real-world reality**:
- Events don't happen on a schedule
- Espionage attempts occur at random times
- Policy decisions can be made at any moment
- Different events have different temporal dynamics

**Solution**: Model time as continuous (ℝ₊), transitions fire with **hazard rates**.

## Formal Definition

A **Continuous-Time Markov Decision Process**:

```
M = (S, A, R, γ)

Where:
  S: State space
  A: Action space
  R: Rate functions R^a: S × S → ℝ₊ for each action a
  γ: Discount rate (continuous-time analog of discount factor)
```

## State Space (S)

```
S = S_discrete × V

Where:
  S_discrete = {S0, S1, ..., S15}  (discrete scenarios)
  V ⊆ ℝ⁶  (continuous variables)
```

**Note**: Time is NOT part of state (it's the independent parameter).

State at real time t:
```
s(t) = (σ(t), v(t))
```

## Action Space (A)

Actions available in each state (time-independent):
```
A(s) ⊆ {RACE, SLOWDOWN, INVEST_SECURITY, INVEST_ALIGNMENT, NO_OP, ...}
```

## Rate Functions (R)

**Core idea**: In state s under action a, transitions to s' occur with **rate** R^a(s, s').

**Interpretation**:
- If R^a(s, s') = λ, then:
  - P(transition s → s' in time Δt | action a) ≈ λ · Δt  (for small Δt)
  - Expected waiting time until transition ∼ Exp(λ)

**Total exit rate** from state s under action a:
```
λ^a(s) = Σ_{s'≠s} R^a(s, s')
```

**Holding time** in state s (time until something happens):
```
τ_hold ∼ Exponential(λ^a(s))

P(τ_hold > t) = e^{-λ^a(s) · t}
```

## Transition Probabilities (Embedded DTMC)

When transition occurs from s under a, where does it go?

**Jump probabilities**:
```
P^a(s, s') = R^a(s, s') / λ^a(s)   if s' ≠ s
           = 0                      if s' = s
```

**Interpretation**: Given that we're leaving s, what's the probability of going to s'?

## Execution Semantics

### Continuous-Time Evolution

```
At time t, in state s(t), under action a:

1. Sample holding time: τ ~ Exp(λ^a(s(t)))

2. Remain in s(t) for duration τ

3. At time t + τ, jump to state s' with probability P^a(s(t), s')

4. Update time: t ← t + τ

5. Repeat from step 1 with new state s'
```

### Policy

A **policy** can be:
- **Time-independent**: π: S → A
- **Time-dependent**: π: S × ℝ₊ → A

### Sample Trajectory

```
s(t) = S4  for t ∈ [0, 2.3)
     = S5  for t ∈ [2.3, 7.8)
     = S6  for t ∈ [7.8, 12.1)
     ...
```

Jump times: 0, 2.3, 7.8, 12.1, ... (exponentially distributed intervals)

## Example: Weight Theft Hazard

**State**: S4 (agents scaled to 1M+ employees)

**Variables**: {compute: 1.2, rnd: 1.4, sec: 2.0, hack: 0.35, ...}

**Action**: NO_OP (user doesn't intervene)

**Rate matrix under NO_OP**:

```
R^{NO_OP}(S4, ·) = {
  S4 → S5 (theft):      λ_theft = 0.15 / quarter
  S4 → S6 (controls):   λ_controls = 0.08 / quarter
  S4 → S7 (partnership): λ_partner = 0.05 / quarter
  S4 → S4 (stay):       0 (by convention)
}
```

**Total exit rate**:
```
λ^{NO_OP}(S4) = 0.15 + 0.08 + 0.05 = 0.28 / quarter
```

**Expected holding time**:
```
E[τ_hold] = 1 / 0.28 ≈ 3.57 quarters ≈ 10.7 months
```

**Jump probabilities** (given that we leave S4):
```
P(S4 → S5 | leave) = 0.15 / 0.28 ≈ 0.536  (54% theft)
P(S4 → S6 | leave) = 0.08 / 0.28 ≈ 0.286  (29% controls)
P(S4 → S7 | leave) = 0.05 / 0.28 ≈ 0.179  (18% partnership)
```

**Sample execution**:

```
t = 0: Enter S4
t = 2.1 quarters: Sample τ ~ Exp(0.28) → τ = 2.1
t = 2.1: Leave S4, sample destination:
         Draw from {S5: 0.536, S6: 0.286, S7: 0.179}
         Result: S5 (theft occurred)
t = 2.1+: Enter S5
```

**Interpretation**:
- Stayed in S4 for 2.1 quarters (≈6.3 months)
- Then weight theft occurred (transition to S5)
- This happened **automatically** without user action

## Action Effects on Rates

**Key feature**: Actions modulate hazard rates.

**Example: INVEST_SECURITY action**

```
R^{INVEST_SECURITY}(S4, S5) = λ_theft × (1 - sec/5)²
                             = 0.15 × (1 - 2.0/5)²
                             = 0.15 × 0.36
                             = 0.054 / quarter

vs.

R^{NO_OP}(S4, S5) = 0.15 / quarter
```

**Effect**: Security investment reduces theft rate by 64% (0.15 → 0.054).

**Expected time until theft**:
- With NO_OP: 1/0.15 ≈ 6.7 quarters (20 months)
- With INVEST_SECURITY: 1/0.054 ≈ 18.5 quarters (55 months)

## State-Dependent Rates

Rates can depend on continuous variables:

```
λ_theft(s) = λ_base × vulnerability(s.sec) × sophistication(t)

Where:
  vulnerability(sec) = (1 - sec/5)²
  sophistication(t) = 1 + 0.1 · t  (adversaries improve over time)

Example at t=8 (2026-Q1), sec=2.0:
  λ_theft = 0.15 × (1 - 2.0/5)² × (1 + 0.1·8)
          = 0.15 × 0.36 × 1.8
          = 0.097 / quarter
```

## Time as Actor

**Crucial property**: Even with a = NO_OP, events fire stochastically.

**Autonomous dynamics**:
```
While in state s, multiple "clocks" are running:

Clock 1 (theft):       τ₁ ~ Exp(λ_theft(s))
Clock 2 (controls):    τ₂ ~ Exp(λ_controls(s))
Clock 3 (breakthrough): τ₃ ~ Exp(λ_breakthrough(s))
...

First clock to ring determines next transition.
```

**Competition between clocks**:
```
τ_first = min(τ₁, τ₂, τ₃, ...)

P(transition to s_theft) = λ_theft / (λ_theft + λ_controls + λ_breakthrough + ...)
```

This is exactly the jump probability formula!

## Continuous Variable Evolution

Variables can evolve **continuously** between jumps:

```
ds/dt = f(s, a)

Example (compute scaling):
  d(compute)/dt = α · compute  (exponential growth)

  Solution: compute(t) = compute(0) · e^{αt}
```

**Hybrid system**: Discrete jumps + continuous flows.

**Example**:
```
At t=0: s = (S4, {compute: 1.0, rnd: 1.4, sec: 2.0, ...})

Continuous evolution (while in S4):
  compute(t) = 1.0 · e^{0.3t}  (30% annual growth)

At t=2.1: compute(2.1) = 1.0 · e^{0.3·2.1} = 1.91

Discrete jump at t=2.1: S4 → S5
  sec: 2.0 → 1.5  (discrete decrease)
  hack: 0.35 → 0.50  (discrete increase)
```

## Comparison with Discrete-Time MDP

| Aspect | Discrete-Time MDP | CTMDP |
|--------|-------------------|-------|
| **Time** | Quantized steps | Continuous ℝ₊ |
| **Transitions** | Every step | Exponential waiting times |
| **Multiple events** | One per step | Competition via rates |
| **Realism** | Approximation | High fidelity |
| **Math** | Simpler | Exponential distributions |
| **Implementation** | Easier | Requires event sampling |

## Strengths

✅ **Continuous time**: No artificial discretization
✅ **Realistic timing**: Events fire when they "naturally" would
✅ **Competing hazards**: Multiple simultaneous risks
✅ **Flexible actions**: Can act at any time, not just discrete steps
✅ **Well-studied**: Rich theory (uniformization, value iteration)

## Limitations

❌ **Complexity**: Exponential distributions, rate matrices
❌ **Implementation**: Need event-driven simulation (Gillespie algorithm)
❌ **Visualization**: Harder to show "continuous" time in UI
❌ **Calibration**: Need empirical hazard rates (where to get them?)
❌ **Overkill?**: For quarters-based analysis, discrete-time may suffice

## Implementation Strategy

### Gillespie Algorithm (Exact Simulation)

```javascript
function simulateCTMDP(initialState, policy, maxTime) {
  let s = initialState
  let t = 0
  let trajectory = []

  while (t < maxTime) {
    // 1. Get current action
    const a = policy(s, t)

    // 2. Compute all rates from current state
    const rates = computeRates(s, a)  // {s' -> λ(s, s')}
    const totalRate = sum(rates.values())

    // 3. Sample time until next event
    const tau = sampleExponential(totalRate)

    // 4. Evolve continuous variables during waiting time
    s = evolveContinuous(s, a, tau)

    // 5. Advance time
    t = t + tau

    // 6. Sample which transition occurs
    const nextState = sampleTransition(s, rates)

    // 7. Record trajectory
    trajectory.push({time: t, from: s, to: nextState, action: a})

    // 8. Jump to next state
    s = nextState
  }

  return trajectory
}

function sampleExponential(lambda) {
  return -Math.log(Math.random()) / lambda
}

function sampleTransition(s, rates) {
  const total = sum(rates.values())
  const r = Math.random() * total
  let cumulative = 0

  for (const [s_next, rate] of rates) {
    cumulative += rate
    if (r <= cumulative) return s_next
  }
}
```

### UI Adaptation

**Challenge**: Show continuous time in discrete UI.

**Solutions**:

1. **Real-time mode**: Timer advances continuously, events fire randomly
   ```javascript
   setInterval(() => {
     updateTime(dt)
     checkEventFiring()  // Sample from exponential
   }, 100)  // 10 Hz update
   ```

2. **Time slider**: User scrubs timeline, sees state at any t
   ```javascript
   <input type="range" min="0" max="36" step="0.1"
          value={currentTime} onChange={seekToTime} />
   ```

3. **Accelerated time**: Map real seconds to sim months
   ```javascript
   const simTimePerRealSecond = 1  // 1 month per second
   ```

## When to Use

This model is appropriate when:
- **Temporal realism** is critical
- **Competing hazards** are important (theft vs controls vs partnership)
- **Continuous evolution** of variables matters (compute scaling)
- **Event timing** is a first-class concern
- **"What happens if we wait?"** is a key question

Recommended for:
- High-fidelity risk assessment
- Real-time strategy games
- Policy timing analysis ("when should we regulate?")
- Sensitivity to intervention timing

## References

- Puterman, M.L. (2005). "Markov Decision Processes" (Chapter 11: CTMDPs)
- Guo & Hernández-Lerma (2009). "Continuous-Time Markov Decision Processes"
- Gillespie, D.T. (1977). "Exact stochastic simulation of coupled chemical reactions"
- Alur & Dill (1994). "A theory of timed automata" (for discrete approximations)
