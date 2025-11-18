# Monte Carlo Integration with Modeling Formalisms

**Purpose**: How Monte Carlo wraps different modeling approaches (SD, HA, ABM, discrete-time equations).

---

## The Big Picture

**Monte Carlo is formalism-agnostic**: It's an outer loop around ANY simulator.

```
Monte Carlo (outer loop)
    ↓
Simulator (black box)
    ↓
Formalism (SD | HA | ABM | DiffEq)
```

**Key insight**: You can use MC with System Dynamics, Hybrid Automata, Agent-Based Models, or pure difference equations - the MC layer doesn't care!

---

## System Dynamics + Monte Carlo (StochSD)

**Deterministic SD**:
```
Stocks: compute, alignment, trust
Flows: investment → compute growth, research → alignment progress
Run once → one trajectory
```

**Stochastic SD** (MC wrapper):
```
Uncertain parameters: growth_rate ~ U(0.10, 0.15)
Run 1000 times → distribution of trajectories
```

**Tools**: StochSD, Vensim DSS

**Use case**: Macro policy analysis with uncertainty in feedback loop strengths

---

## Hybrid Automata + Monte Carlo (SHA)

**Deterministic HA**:
```
Modes: {baseline, race, catastrophe}
Transitions: deterministic guards
Run once → one mode sequence
```

**Stochastic HA**:
```
Probabilistic transitions: guard satisfied → transition with probability p
Uncertain parameters: guard thresholds ~ distributions
Run 1000 times → distribution over mode sequences
```

**Tools**: UPPAAL-SMC, Modest

**Use case**: Probabilistic verification (P[◇catastrophe] = ?)

---

## Agent-Based Models + Monte Carlo

**Single ABM run**: Stochastic (agents make random choices)

**Ensemble ABM** (MC over initial conditions):
```
Uncertain: agent heterogeneity, network structure, initial beliefs
Run 1000 times → distribution over emergent outcomes
```

**Tools**: NetLogo BehaviorSpace, Mesa batch runner

**Use case**: Understanding emergent phenomena under uncertainty

---

## Pure Difference Equations + Monte Carlo

**Deterministic difference equations**:
```
x[k+1] = f(x[k]; θ) with fixed parameters θ
```

**Stochastic version**:
```
Uncertain parameters: θ ~ p(θ)
Random shocks: x[k+1] = f(x[k]; θ) + ξ[k]
Run MC → distribution of trajectories
```

**Use case**: Simple macro models with parametric uncertainty

---

## Comparison Table

| Formalism | Inner Dynamics | Uncertain Inputs | MC Benefit | Example Tools |
|-----------|----------------|------------------|------------|---------------|
| **SD** | Stocks/flows/feedback | Parameter values, shock magnitudes | Risk analysis for infrastructure | StochSD, Vensim DSS, GoldSim |
| **HA** | Modes + ODEs + guards | Guard thresholds, flow parameters | Probabilistic verification | UPPAAL-SMC, Modest |
| **ABM** | Agent rules | Agent parameters, initial distribution | Emergent phenomena distribution | NetLogo, Mesa |
| **DiffEq** | Difference equations | Parameters, initial conditions | Classic uncertainty propagation | Python/R + numpy/scipy |

---

## When to Use Each Combination

### SD + MC
**When**: Macro-level policy uncertainty, feedback loop strengths unknown
**Example**: "What's P(catastrophe) if we don't know exactly how fast compute grows?"

### HA + MC
**When**: Discrete regime changes with uncertain triggers
**Example**: "Under what parameter ranges do we transition to race mode?"

### ABM + MC
**When**: Micro-level heterogeneity drives macro outcomes
**Example**: "How does distribution of lab strategies affect overall risk?"

### DiffEq + MC
**When**: Simple parametric model, focus on core uncertainties
**Example**: "Sensitivity of AGI timeline to growth rate assumptions"

---

## Our Approach: Discrete-Time Hybrid + MC

**Design choice**:
- **Inner**: Discrete-time simulator (Δt = 1 month) with modes
- **Formalism**: Hybrid (SD-like flows + HA-like mode transitions)
- **Outer**: Monte Carlo over parameters and shocks

**Why**:
- Simple to implement (no ODE solver needed)
- Captures regime changes (race, slowdown, catastrophe)
- Fast enough for 1000+ MC runs
- Matches decision rhythms (monthly/quarterly policies)

**Implementation**: See [examples.md](./examples.md)

---

## Related Documentation

- [README.md](./README.md) - Monte Carlo overview
- [formalism.md](./formalism.md) - Mathematical foundations
- [../simulacra_integration/evals/discrete_time_modeling.md](../simulacra_integration/evals/discrete_time_modeling.md) - Discrete-time focus
- [../matrix/adapters/README.md](../matrix/adapters/README.md) - Adapter implementations for different formalisms
