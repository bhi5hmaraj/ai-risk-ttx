# Sensitivity Analysis: Finding What Matters

**Purpose**: Identify which uncertain parameters actually drive outcomes.

**Why it matters**: Don't waste effort measuring/controlling parameters that don't affect results!

---

## The Problem

You have 20 uncertain parameters. Which ones actually matter for P(catastrophe)?

**Naive approach**: Run MC, compute correlation between each parameter and outcome
**Problem**: Misses interactions, assumes linearity

**Better approach**: Sobol sensitivity analysis (variance decomposition)

---

## Sobol Indices (Variance-Based Sensitivity)

### First-Order Index (S_i)

**Question**: "How much variance is explained by parameter i **alone**?"

**Formula**: S_i = Var[E[Y | θ_i]] / Var[Y]

**Interpretation**:
- S_i = 0.5 → Parameter i explains 50% of output variance
- S_i = 0 → Parameter i has no individual effect

### Total-Order Index (S_Ti)

**Question**: "How much variance involves parameter i (including interactions)?"

**Formula**: S_Ti = E[Var[Y | θ_{~i}]] / Var[Y]

**Interpretation**:
- S_Ti - S_i = interaction effects
- S_Ti = 0 → Parameter i is completely irrelevant

---

## Example: AI-2027

**Parameters** (simplified):
- initial_trust
- growth_rate_race
- alignment_rate
- incident_prob

**Sobol results**:
```
Parameter          | S1 (first-order) | ST (total) | Interpretation
-------------------|------------------|------------|------------------
initial_trust      | 0.385            | 0.412      | Strongest driver
growth_rate_race   | 0.298            | 0.324      | Important
alignment_rate     | 0.215            | 0.241      | Moderate
incident_prob      | 0.092            | 0.108      | Weak
```

**Key insight**: Initial trust is #1 driver → Focus measurement/intervention there!

---

## How to Compute Sobol Indices

**Python (SALib)**:
```python
from SALib.sample import saltelli
from SALib.analyze import sobol

problem = {
    'num_vars': 4,
    'names': ['initial_trust', 'growth_rate', 'alignment_rate', 'incident_prob'],
    'bounds': [[0.5, 1.0], [0.15, 0.25], [0.03, 0.07], [0.01, 0.04]]
}

# Generate samples (Saltelli scheme)
param_values = saltelli.sample(problem, 1024)  # Generates (2*4+2)*1024 = 10,240 samples

# Run model
Y = np.array([simulate(params) for params in param_values])

# Compute indices
Si = sobol.analyze(problem, Y)

print(Si['S1'])  # First-order
print(Si['ST'])  # Total-order
```

**Cost**: (2d + 2) × N simulations for d parameters

**Recommended**: N = 1024 or 2048 (power of 2)

---

## Interpreting Results

### Scenario 1: High First-Order, Low Interaction

```
initial_trust: S1 = 0.40, ST = 0.42  (ST - S1 = 0.02)
```

**Interpretation**: Trust matters individually, little interaction with other params
**Action**: Measure trust accurately; effect is mostly independent

### Scenario 2: Low First-Order, High Total

```
param_x: S1 = 0.05, ST = 0.25  (ST - S1 = 0.20)
```

**Interpretation**: param_x matters mostly through interactions
**Action**: Can't ignore it, but effect depends on other parameter values

### Scenario 3: Low Total

```
param_y: ST = 0.03
```

**Interpretation**: param_y is irrelevant (< 3% variance explained)
**Action**: Don't waste effort measuring it precisely

---

## Visualization: Tornado Plot

**Horizontal bar chart sorted by total effect**:

```
initial_trust      ████████████████████ 0.42
growth_rate_race   ███████████████ 0.32
alignment_rate     ████████████ 0.24
incident_prob      ████ 0.11
```

**Quick visual ranking** of parameter importance.

---

## Related Documentation

- [examples.md](./examples.md) - Full Python code for Sobol analysis
- [formalism.md](./formalism.md) - Mathematical foundations
- [practical_guide.md](./practical_guide.md) - Computational howto
