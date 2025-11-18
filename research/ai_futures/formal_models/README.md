# Formal Models for AI2027 State Machine

This directory contains formal specifications for different modeling approaches to the AI2027 causal DAG. Each model offers different trade-offs between expressiveness, realism, and complexity.

## Models Overview

| Model | File | Key Feature | Use Case |
|-------|------|-------------|----------|
| **LTS with Effects** | [current_lts_model.md](current_lts_model.md) | Simple, deterministic | Current visualizer |
| **Mealy + MDP** | [mealy_mdp_model.md](mealy_mdp_model.md) | Stochastic + time as actor | Realistic simulations |
| **CTMDP** | [ctmdp_model.md](ctmdp_model.md) | Continuous time, hazard rates | High-fidelity timing |
| **Timed Automata** | [timed_automata_model.md](timed_automata_model.md) | Hard deadlines, verification | Safety analysis |

## Quick Comparison

### Time Representation

```
LTS:           [implicit] ───→ [step 1] ───→ [step 2] ───→ ...
               No explicit time, just sequence

Mealy+MDP:     t=0 ───→ t=1 ───→ t=2 ───→ t=3 ───→ ...
               Discrete steps (quarters, months)

CTMDP:         ├─────────┤──┤─────────────┤──┤───────→
               Continuous, exponential waiting times

Timed Auto:    x=0 ─[x≤12]→ x=5 ─[x=12]→ forced transition
               Real-valued clocks with guards
```

### Uncertainty Modeling

```
LTS:           Deterministic (a always leads to s')

Mealy+MDP:     Stochastic (a leads to s' with probability p)

CTMDP:         Stochastic + temporal (a leads to s' after time ~Exp(λ))

Timed Auto:    Deterministic (can add probabilities via PTA extension)
```

### Autonomous World Evolution

```
LTS:           ✗ World waits for user
Mealy+MDP:     ✓ Default policy + environment events
CTMDP:         ✓✓ Hazard rates fire continuously
Timed Auto:    ✓ Invariants force transitions
```

## Feature Matrix

|  | LTS | Mealy+MDP | CTMDP | Timed Auto |
|--|-----|-----------|-------|------------|
| **Discrete time** | ✓ | ✓ | ✗ | ✗ |
| **Continuous time** | ✗ | ✗ | ✓ | ✓ |
| **Stochasticity** | ✗ | ✓ | ✓ | PTA only |
| **Outputs on edges** | ✗ | ✓ | ✗ | ✗ |
| **Hard deadlines** | ✗ | ≈ | ≈ | ✓ |
| **Multiple timers** | ✗ | ≈ | ≈ | ✓ |
| **Formal verification** | Limited | Limited | Value iter | Model check |
| **Implementation ease** | ★★★★★ | ★★★★☆ | ★★☆☆☆ | ★★★☆☆ |
| **Math complexity** | ★☆☆☆☆ | ★★☆☆☆ | ★★★★☆ | ★★★☆☆ |
| **Realism** | ★★☆☆☆ | ★★★★☆ | ★★★★★ | ★★★☆☆ |

## Decision Tree: Which Model to Use?

```
Do you need stochastic events? (theft, breakthroughs)
├─ NO: Is simplicity your priority?
│  ├─ YES: → LTS with Effects (current model)
│  └─ NO: Need hard deadlines?
│     ├─ YES: → Timed Automata
│     └─ NO: → LTS with Effects
│
└─ YES: Is continuous time critical?
   ├─ NO: → Mealy + MDP (discrete time)
   │       "Good enough" for quarterly analysis
   │
   └─ YES: Need exact event timing?
      ├─ YES: → CTMDP
      │        High-fidelity hazard modeling
      │
      └─ NO: Need verification? (Can extinction be avoided?)
         ├─ YES: → Timed Automata (PTA variant)
         └─ NO: → Mealy + MDP (simpler)
```

## Recommended Migration Path

### Phase 1: Current (LTS with Effects)
**Status**: ✅ Implemented in `visualizer_canvas_simple`

**Strengths**:
- Simple, works well for exploration
- Clean visualization
- Easy to understand

**Limitations**:
- No stochasticity
- No autonomous world dynamics

### Phase 2: Add Stochasticity (Mealy + MDP)
**Minimal changes** to current implementation:

1. **Add event sampling**:
```javascript
const event = sampleEvent(state, action)  // NEW
const nextState = transition(state, action, event)
```

2. **Add default policy** for NO_OP:
```javascript
if (!userChoseAction) {
  action = defaultPolicy(state)
}
```

3. **Add time to state**:
```javascript
state = {...state, timeStep: t, quarter: "2026-Q1"}
```

**Benefits**:
- Models uncertainty (espionage, breakthroughs)
- Time as actor (world doesn't wait)
- Still visualizable

**Cost**: Need to calibrate probabilities

### Phase 3 (Optional): Continuous Time (CTMDP)
**For high-fidelity simulations**:

1. Replace discrete steps with Gillespie algorithm
2. Use hazard rates instead of probabilities
3. Implement event-driven simulation

**Benefits**:
- Realistic temporal dynamics
- "What happens if we wait 6 months?"
- Competing hazards naturally modeled

**Cost**: More complex math and implementation

### Phase 4 (Optional): Verification (Timed Automata)
**For safety analysis**:

1. Model key timing constraints (deadlines, windows)
2. Use model checker (UPPAAL, PRISM)
3. Verify properties: "Can we avoid extinction?"

**Benefits**:
- Formal guarantees
- Systematic exploration of timing

**Cost**: Different paradigm (verification vs simulation)

## Model Details

### 1. LTS with Effects (Current)

**Formal definition**:
```
M = (S, A, δ, V, ε, s₀, v₀)

S: {S0, S1, ..., S15}
δ: S × A → S (deterministic)
ε: A → (V → V) (effect functions)
```

**When to use**:
- Exploration and understanding
- Deterministic "what-if" scenarios
- Clean visualization priority
- No need for uncertainty

**See**: [current_lts_model.md](current_lts_model.md)

---

### 2. Mealy + MDP (Recommended Upgrade)

**Formal definition**:
```
M = (S, A, E, P, G, γ, s₀, t₀)

P: S × A × E × S → [0,1] (stochastic transitions)
G: S × A × E × S → O (Mealy output function)
```

**When to use**:
- Need stochasticity (espionage, breakthroughs)
- Time as actor (world evolves autonomously)
- Quarterly/monthly time scale acceptable
- Want outputs on edges (narratives, events)

**Key insight**: "Mealy on edges + time as an actor"
- Outputs live on transitions (Mealy)
- Default policy + environment events (time as actor)

**See**: [mealy_mdp_model.md](mealy_mdp_model.md)

---

### 3. CTMDP (High-Fidelity Timing)

**Formal definition**:
```
M = (S, A, R, γ)

R^a: S × S → ℝ₊ (rate functions for each action)
Transitions fire with exponential waiting times
```

**When to use**:
- Exact timing matters ("when does theft occur?")
- Competing hazards (multiple risks simultaneously)
- Continuous variable evolution (compute scaling)
- "What if we wait?" analysis

**Key insight**: Multiple clocks racing
- Each possible transition has a hazard rate
- First clock to ring determines what happens
- Natural competition between events

**See**: [ctmdp_model.md](ctmdp_model.md)

---

### 4. Timed Automata (Verification)

**Formal definition**:
```
A = (L, L₀, C, A, E, I)

C: Clocks (real-valued timers)
E: Edges with guards and resets
I: Invariants (must-leave conditions)
```

**When to use**:
- Hard deadlines ("must decide by 2027")
- Verification ("can extinction be avoided?")
- Multiple independent timers
- Safety-critical analysis

**Key insight**: Guards + Invariants
- Guards: "Can take transition if x ≤ 6"
- Invariants: "Must leave location by x = 12"
- Model checkers answer "is it possible?"

**See**: [timed_automata_model.md](timed_automata_model.md)

## Common Patterns Across Models

### State Space

All models use:
```
State = Discrete_Scenario × Continuous_Variables

Discrete: {S0, S1, ..., S15}
Variables: {compute, rnd, sec, hack, align, gov}
```

### Actions

All models have:
```
A = {RACE, SLOWDOWN, INVEST_SECURITY, INVEST_ALIGNMENT, NO_OP, ...}
```

But interpretation differs:
- **LTS**: Deterministic transition trigger
- **Mealy+MDP**: Influences probability distribution
- **CTMDP**: Modulates hazard rates
- **Timed Auto**: Event with clock guards

### Outputs/Observations

What user sees:
- **LTS**: Variable changes
- **Mealy+MDP**: Narratives + metrics + events (Mealy output)
- **CTMDP**: State trajectory over continuous time
- **Timed Auto**: Location + clock valuations

## Implementation Examples

### Current (LTS)
```javascript
// Deterministic transition
function chooseAction(state, action) {
  const nextState = transition(state, action)
  const nextVars = applyEffect(state.vars, action.effect)
  return {state: nextState, vars: nextVars}
}
```

### Mealy + MDP
```javascript
// Stochastic transition with output
function step(state, userAction) {
  const action = userAction || defaultPolicy(state)
  const event = sampleEvent(state, action)
  const nextState = sampleTransition(state, action, event)
  const output = generateOutput(state, action, event, nextState)
  return {nextState, output}
}
```

### CTMDP
```javascript
// Continuous-time simulation (Gillespie)
function simulate(state, policy, maxTime) {
  let t = 0
  while (t < maxTime) {
    const action = policy(state, t)
    const rates = computeRates(state, action)
    const tau = sampleExponential(sum(rates))
    t += tau
    state = sampleTransition(state, rates)
  }
}
```

### Timed Automata
```javascript
// Clocks + guards
function advanceTime(state, delta) {
  // Advance all clocks
  for (let c in state.clocks) {
    state.clocks[c] += delta
  }
  // Check invariants (forced transitions)
  if (!satisfiesInvariant(state)) {
    state = forceTransition(state)
  }
}
```

## Calibration and Parameters

### LTS
**Parameters**: Effect magnitudes
```
ε("Deploy Agent-1") = {mul: {rnd: 1.2}, add: {hack: 0.05}}
```
**Source**: Expert judgment, scenario design

### Mealy + MDP
**Parameters**: Transition probabilities, event rates
```
P(THEFT | S4, NO_OP) = 0.09 per quarter
P(CONTROLS | S4, NO_OP) = 0.05 per quarter
```
**Source**: Historical data, expert elicitation, sensitivity analysis

### CTMDP
**Parameters**: Hazard rates (per unit time)
```
λ_theft(s) = 0.15 × (1 - s.sec/5)² per quarter
```
**Source**: Empirical data, actuarial models, theoretical bounds

### Timed Automata
**Parameters**: Clock bounds, deadlines
```
Invariant: x_decision ≤ 12  (must decide within 12 quarters)
Guard: x_audit ≥ 6  (audit required every 6 months)
```
**Source**: Policy requirements, domain constraints

## Visualization Strategies

### LTS (Current)
- **Graph**: ReactFlow state machine
- **Variables**: Line charts (Recharts)
- **Time**: Step counter

### Mealy + MDP
- **Graph**: Same as LTS
- **Variables**: Line charts + confidence intervals
- **Time**: Calendar quarter display
- **Events**: Event log with narratives
- **Probabilities**: Branching probabilities on edges

### CTMDP
- **Graph**: State trajectory over continuous time
- **Variables**: Continuous line charts
- **Time**: Real-time clock or time slider
- **Events**: Event markers with timestamps

### Timed Automata
- **Graph**: Locations + clock zones (region graph)
- **Clocks**: Progress bars with guards/invariants
- **Time**: Continuous advancement
- **Warnings**: Deadline alerts ("3 months to decide!")

## Testing and Validation

### LTS
✓ Deterministic → easy to test
✓ Verify all transitions defined
✓ Check effect calculations

### Mealy + MDP
✓ Run Monte Carlo simulations
✓ Check probability distributions sum to 1
✓ Verify trajectories are realistic
✓ Sensitivity analysis on probabilities

### CTMDP
✓ Compare with discrete-time approximation
✓ Verify exponential waiting times
✓ Check rate matrix properties (Q diagonal)
✓ Test Gillespie algorithm implementation

### Timed Automata
✓ Model check reachability properties
✓ Verify deadlock freedom
✓ Check clock bounds are respected
✓ Test with UPPAAL or PRISM

## References

### Books
- Baier & Katoen (2008). *Principles of Model Checking*
- Puterman (2005). *Markov Decision Processes*
- Alur (2015). *Principles of Cyber-Physical Systems*

### Papers
- Alur & Dill (1994). "A theory of timed automata"
- Mealy (1955). "A method for synthesizing sequential circuits"
- Gillespie (1977). "Exact stochastic simulation"

### Tools
- **UPPAAL**: Timed automata model checker
- **PRISM**: Probabilistic model checker (MDPs, CTMDPs, PTAs)
- **ReactFlow**: Graph visualization (current implementation)
- **D3.js**: Advanced timeline visualizations

## Contributing

When adding new formal models:

1. Create `model_name.md` in this directory
2. Follow structure:
   - Motivation
   - Formal definition
   - Semantics with examples
   - Comparison with others
   - Strengths/limitations
   - Implementation strategy
   - When to use
3. Update this README with comparison tables
4. Add to decision tree

## Future Directions

### Hybrid Models
Combine strengths of multiple approaches:
- **MDP + Timed Automata** = Probabilistic timed automata (PTA)
- **CTMDP + Continuous Variables** = Hybrid Markov chains
- **LTS + Probabilities** = Probabilistic labeled transition systems

### Multi-Agent Extensions
Model US, China, labs as separate actors:
- **Game theory**: Nash equilibria in timing games
- **Concurrent processes**: Process algebras (CSP, CCS)
- **Synchronization**: Timed automata networks

### Learning and Adaptation
Unknown parameters learned from data:
- **Reinforcement learning**: Learn optimal policies
- **Bayesian inference**: Update probabilities with observations
- **Inverse RL**: Infer objectives from behavior

## Questions?

For questions about:
- **Current implementation**: See `visualizer_canvas_simple/DESIGN.md`
- **Research grounding**: See AI2027 documentation at https://ai-2027.com
- **Formal methods**: Consult references in individual model files
