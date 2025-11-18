# Surrogate Models: Fast Approximators for Complex Simulations

**Purpose**: How machine learning (non-LLM) enables practical simulation of complex socio-technical systems via surrogate models and nonparametric estimation.

**Key Insight**: When your model is too slow or too opaque, train a **surrogate** - a cheap approximator that emulates the expensive simulator, enabling Monte Carlo, optimization, and real-time control.

---

## What Are Surrogate Models?

**Definition**: A surrogate model (a.k.a. meta-model, emulator, response surface) is a **cheap approximate model** trained to emulate an **expensive simulator** or **unknown function**.

**Purpose**: Replace costly evaluations with learned approximations for:
- Optimization (design, control)
- Calibration (parameter fitting)
- Monte Carlo (uncertainty quantification)
- Sensitivity analysis (which parameters matter)
- Real-time prediction

**Common surrogates**:
- Gaussian Processes (Kriging)
- Neural Networks
- Random Forests
- Radial Basis Functions (RBF)
- Polynomial Chaos Expansion (PCE)
- Support Vector Regression (SVR)

---

## Where Surrogates Fit in Our Stack

### Inside Discrete-Time Hybrid Automata

**Mode-specific dynamics**:
```
x[k+1] = f_q(x[k], u[k], ξ[k])
```

**When f_q is unknown or expensive**: Learn it!

```python
# Instead of hand-coded equation:
def race_dynamics(x, u):
    c, a, t = x
    c_next = c + 0.20 * c  # Linear growth
    ...

# Use learned surrogate:
def race_dynamics_surrogate(x, u):
    return neural_net(x, u)  # Trained on data
```

### Inside System Dynamics

**Replace expensive submodels**:
- Detailed chip manufacturing simulator → GP surrogate
- High-fidelity incident model → Random Forest
- Complex supply chain → Neural net

**Example**: Urban drainage model replaced 2-hour hydrodynamic sim with GP → 380x speedup

### Inside Agent-Based Models

**Three roles**:
1. **Agent policies**: ML learns decision rules from data
2. **ABM surrogates**: Emulate entire ABM for sensitivity analysis
3. **Calibration**: Fit ABM parameters to match empirical data

**Example**: Traffic ABM → SVM surrogate → sensitivity analysis at 1% of cost

---

## Documentation Structure

### Core Concepts
- **[fundamentals.md](./fundamentals.md)** - Surrogate types, when to use, training workflows
- **[nonparametric.md](./nonparametric.md)** - GP, RF, NN, kernel methods (deep dive)

### Applications by Formalism
- **[applications_sd.md](./applications_sd.md)** - Surrogates in System Dynamics
- **[applications_abm.md](./applications_abm.md)** - Surrogates in Agent-Based Models
- **[applications_ha.md](./applications_ha.md)** - Surrogates in Hybrid Automata

### Practical Guides
- **[examples.md](./examples.md)** - Runnable Python examples (GP, RF, NN surrogates)
- **[workflow.md](./workflow.md)** - End-to-end workflow (train → validate → deploy)
- **[ai_governance.md](./ai_governance.md)** - Application to AI governance modeling

---

## Quick Start: Three Common Patterns

### Pattern 1: GP Surrogate for Expensive Simulator

```python
from sklearn.gaussian_process import GaussianProcessRegressor

# Generate training data (expensive!)
X_train = sample_parameters(n=100)
y_train = [expensive_model(x) for x in X_train]

# Train GP surrogate (cheap!)
gp = GaussianProcessRegressor()
gp.fit(X_train, y_train)

# Predict (instant!)
y_pred, y_std = gp.predict(X_test, return_std=True)
```

**Speedup**: 10 min → 1 ms = **600,000x faster**

---

### Pattern 2: Random Forest for ABM Calibration

```python
from sklearn.ensemble import RandomForestRegressor

# Train RF on ABM runs
rf = RandomForestRegressor(n_estimators=100)
rf.fit(params_train, outcomes_train)

# Optimize using surrogate
def objective(params):
    predicted = rf.predict([params])[0]
    return abs(predicted - empirical_data)

best_params = optimize(objective, bounds)
```

**Benefit**: Find good parameters with **500 ABM runs** instead of 10,000+

---

### Pattern 3: Neural Net for Mode Dynamics

```python
import torch.nn as nn

# Learn race mode dynamics
class RaceDynamics(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(5, 64), nn.ReLU(),
            nn.Linear(64, 3)
        )

# Train on historical trajectories
model = RaceDynamics()
train(model, historical_data)

# Use in discrete-time HA
def race_mode_update(state, action):
    return model(state, action)
```

**Benefit**: Data-driven dynamics when theory is incomplete

---

## Use Cases in AI Governance

### 1. Multi-Scale Architecture

**Problem**: Detailed chip fab model (hours) inside macro policy model (needs seconds)

**Solution**: Train surrogate for chip fab, embed in macro model

**Result**: Full multi-scale simulation at interactive speeds

---

### 2. Policy Optimization

**Problem**: Find best AI safety policy, but each eval needs 1000 MC runs

**Solution**: Train surrogate (policy → expected outcome), optimize surrogate

**Workflow**:
1. Run 100 policies × 1000 MC = 100,000 simulations (expensive, do once)
2. Train RF: policy parameters → P(catastrophe)
3. Optimize RF with Bayesian optimization (cheap!)

**Speedup**: 100,000 sims once, vs millions for direct optimization

---

### 3. Real-Time Risk Assessment

**Problem**: Simulacra game needs live risk estimates (< 500ms)

**Solution**: Pre-train neural surrogate on 100,000 simulations

**Deployment**:
```python
# During gameplay
risk_delta = risk_surrogate(current_state, action)  # < 1ms
display_risk_meter(current_risk + risk_delta)
```

**Enables**: Real-time "what-if" exploration during gameplay

---

### 4. Sensitivity Analysis at Scale

**Problem**: 20 uncertain parameters, want global sensitivity (Sobol indices)

**Direct approach**: 43,008 simulations

**Surrogate approach**:
1. Train GP on 2000 simulations
2. Compute Sobol indices on GP (analytical or cheap sampling)

**Result**: Same insights, 20x fewer expensive simulations

---

## Canonical Examples from Other Domains

| Domain | Expensive Model | Surrogate | Speedup | Application |
|--------|----------------|-----------|---------|-------------|
| **Airfoil design** | 3D CFD (hours) | Kriging/GP | 1000x | Evolutionary optimization |
| **Urban drainage** | 2D hydrodynamics (hours) | GP | 380x | Real-time flood control |
| **Nuclear reactor** | Multi-physics (hours) | Reduced-order | 1000x+ | Safety analysis |
| **COVID-19** | Epidemic ABM (minutes) | ANN | 100x+ | Parameter calibration |
| **Manufacturing** | FEM (hours) | RBF/NN | 500x+ | Process chain simulation |

**AI governance analogs**:
- CFD → Chip design, data center layout
- Drainage → Supply chain, infrastructure
- Reactor → Power grid for AI compute
- COVID → Incident propagation, trust dynamics
- Manufacturing → Multi-scale AI pipeline

---

## Key Advantages

### 1. Speed
**Orders of magnitude faster**: ms instead of minutes/hours

**Enables**: Monte Carlo (10,000+ runs), real-time prediction, interactive exploration

### 2. Uncertainty Quantification
**GP and RF provide uncertainty estimates**

**Use for**: Risk assessment, active learning, confidence intervals

### 3. Differentiability
**Neural surrogates are differentiable**

**Enables**: Gradient-based optimization, backpropagation through system

### 4. Multi-Fidelity
**Combine cheap + expensive models**

**Result**: Accuracy of high-fidelity, cost approaching low-fidelity

---

## Challenges & Mitigations

| Challenge | Mitigation |
|-----------|------------|
| **Training data requirements** | Latin Hypercube Sampling, active learning, transfer learning |
| **Extrapolation risk** | Uncertainty quantification, conservative design, adaptive sampling |
| **Validation** | Hold-out sets, cross-validation, spot checks, error metrics |
| **Interpretability** | Use GP/RF, sensitivity analysis, SHAP values |

---

## Integration with Our Stack

### Matrix Architecture

```
┌─ The Architect ────────────────────────┐
│ Configure → Train surrogate → Explore  │
└────────────────────────────────────────┘
          ↓
┌─ Matrix Core ──────────────────────────┐
│ Adapters with surrogates:              │
│ - SD (GP for submodels)                │
│ - HA (NN for mode dynamics)            │
│ - ABM (RF for whole ABM)               │
└────────────────────────────────────────┘
          ↓
┌─ Views ────────────────────────────────┐
│ Simulacra: Real-time (NN)              │
│ Policy: Optimization (GP/RF)           │
│ Research: Full + surrogate             │
└────────────────────────────────────────┘
```

### Discrete-Time HA + Surrogates

**Pattern**: Learn mode-specific dynamics

```python
class SurrogateHA:
    def __init__(self):
        self.surrogates = {}

    def train_mode_surrogate(self, mode, X, y):
        self.surrogates[mode] = train_gp(X, y)

    def step(self, state, action):
        surrogate = self.surrogates[state.mode]
        x_next = surrogate.predict([state, action])
        new_mode = self.check_guards(x_next)
        return State(mode=new_mode, continuous=x_next)
```

---

## Related Documentation

**Surrogate Models**:
- [fundamentals.md](./fundamentals.md) - Types, training, validation
- [nonparametric.md](./nonparametric.md) - GP, RF, NN deep dive
- [applications_sd.md](./applications_sd.md) - SD use cases
- [applications_abm.md](./applications_abm.md) - ABM use cases
- [applications_ha.md](./applications_ha.md) - HA use cases
- [examples.md](./examples.md) - Code examples
- [workflow.md](./workflow.md) - End-to-end workflow
- [ai_governance.md](./ai_governance.md) - AI governance applications

**Related Frameworks**:
- [../monte_carlo/README.md](../monte_carlo/README.md) - Surrogates enable MC at scale
- [../hybrid_automata/discrete_time_ha.md](../hybrid_automata/discrete_time_ha.md) - Learn mode dynamics
- [../matrix/adapters/README.md](../matrix/adapters/README.md) - Surrogate adapters

---

## Summary

**Surrogate models** = Fast approximators for expensive simulators

**Types**: Gaussian Processes, Random Forests, Neural Networks, RBF, PCE, SVR

**Enable**:
- Monte Carlo at scale (10,000+ runs)
- Real-time prediction (milliseconds)
- Policy optimization (feasible search)
- Sensitivity analysis (global, not local)

**Applications**:
- SD: Replace expensive submodels
- ABM: Emulate entire ABM for calibration
- HA: Learn mode dynamics from data

**For AI governance**:
- Multi-scale modeling (chip fab → macro policy)
- Real-time risk (Simulacra)
- Policy optimization (safety interventions)
- Uncertainty quantification (P(catastrophe) with CI)

**Next**: See detailed guides for your use case and runnable examples.
