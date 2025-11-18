# Monte Carlo Simulation for AI Governance Models

**One sentence**: Run your model 1000 times with different random inputs to get distributions of futures instead of single point estimates.

**Why it matters**: Turns "this scenario leads to catastrophe" into "there's a 33% chance of catastrophe with 95% confidence interval [30%, 36%]".

---

## Quick Start

```python
# 1. Build your simulator
def simulate_ai_governance(params, horizon=120):
    # Your discrete-time model
    return trajectory

# 2. Define uncertainties
param_distributions = {
    'initial_trust': stats.beta(7, 3, loc=0.5, scale=0.5),
    'growth_rate': stats.uniform(0.10, 0.15),
    # ...
}

# 3. Run Monte Carlo
results = monte_carlo(simulate_ai_governance, param_distributions, n_runs=1000)

# 4. Analyze
print(f"P(catastrophe) = {results['catastrophe'].mean():.1%}")
print(f"Time to AGI: {results['time_to_agi'].median():.1f} months")
```

Full working example: [examples.md](./examples.md)

---

## What You Get

### Before Monte Carlo
```
Input: growth_rate = 0.15
Model: [deterministic simulation]
Output: "Catastrophe in 2035"
```

### After Monte Carlo
```
Input: growth_rate ~ N(0.15, 0.03)
Model: [run 1000 times]
Output:
  - P(catastrophe) = 33% (95% CI: 30-36%)
  - Median time to AGI: 68 months
  - 5th-95th percentile: [38, 108] months
  - Key driver: initial_trust (Sobol index = 0.41)
```

---

## Documentation

### Core Concepts
- **[formalism.md](./formalism.md)** - Mathematical formulation, algorithms, pseudocode
- **[eli5.md](./eli5.md)** - Explain like I'm 5 (accessible explanations)

### How It Fits
- **[integration.md](./integration.md)** - How MC works with SD, HA, ABM, discrete-time models
- **[comparison.md](./comparison.md)** - MC vs model checking, when to use each

### Practical Usage
- **[examples.md](./examples.md)** - Full AI-2027 example with runnable Python code and visualizations
- **[sensitivity_analysis.md](./sensitivity_analysis.md)** - Sobol indices, variance decomposition, identifying key parameters
- **[practical_guide.md](./practical_guide.md)** - Computational costs, variance reduction, how many runs, workflow

### Integration with Our Stack
- **[../simulacra_integration/monte_carlo_for_ttx.md](../simulacra_integration/monte_carlo_for_ttx.md)** - How MC fits into Simulacra TTX game
- **[../matrix/adapters/README.md](../matrix/adapters/README.md)** - Matrix adapters expose `monte_carlo()` method

---

## At a Glance

### What Monte Carlo Does
- **Input**: Simulator (deterministic or stochastic) + distributions over uncertain parameters
- **Process**: Sample parameters, run simulation, repeat N times
- **Output**: Distributions, statistics, probabilities, sensitivities

### The Stack
```
┌─ Monte Carlo Layer ────────────────────┐
│ Outer loop: sample inputs, aggregate   │
└────────────────────────────────────────┘
                ↓
┌─ Discrete-Time Simulator ──────────────┐
│ Inner loop: x[k+1] = F(x[k], u[k])     │
└────────────────────────────────────────┘
                ↓
┌─ Formalism (choose one) ───────────────┐
│ SD | HA | ABM | Difference Equations   │
└────────────────────────────────────────┘
```

### What You Get
1. **Risk quantification**: P(catastrophe | policy) with confidence intervals
2. **Distributional outcomes**: Full distribution of time to AGI, not just mean
3. **Scenario comparison**: Statistical tests comparing policies
4. **Sensitivity analysis**: Which parameters actually matter (Sobol indices)
5. **Conditional analysis**: What differs in catastrophe runs vs safe runs

### Computational Cost
- Basic MC: 1000 runs, ~2 minutes (for fast simulators)
- Sensitivity analysis: 2048-8192 runs, ~15-60 minutes
- Rare event focus: 10,000+ runs or variance reduction needed

### Standard Tools
- **StochSD** (System Dynamics + MC)
- **GoldSim** (SD + MC for environmental risk)
- **UPPAAL-SMC** (Stochastic model checking)
- **NetLogo BehaviorSpace** (ABM ensembles)
- **Custom Python/R** with numpy/scipy (our approach)

---

## Quick Reference

### When to Use Monte Carlo

✅ **Use MC when**:
- Model has uncertain parameters
- You need probabilistic outputs (P(catastrophe), distributions)
- Comparing policies statistically
- Model is too large for exhaustive model checking
- Communicating risk to non-technical audiences

❌ **Don't use MC when**:
- All parameters are known with certainty (just run once)
- You need formal guarantees ("provably safe" - use model checking instead)
- Model is so expensive each run takes hours (use surrogate models first)

### Typical Workflow

1. Build deterministic simulator (get one run working)
2. Identify uncertainties (what don't we know?)
3. Specify distributions (conservatively - use Uniform if unsure)
4. Quick MC (100-300 runs with Latin Hypercube Sampling)
5. Sensitivity analysis (which parameters matter?)
6. Production MC (1000-5000 runs for final results)
7. Conditional analysis (what differs in bad outcomes?)

---

## Examples

### Risk Quantification
```python
policy_a_results = monte_carlo(simulator, policy_a_params, n=1000)
policy_b_results = monte_carlo(simulator, policy_b_params, n=1000)

print(f"P(catastrophe | Policy A) = {policy_a_results['catastrophe'].mean():.1%}")
print(f"P(catastrophe | Policy B) = {policy_b_results['catastrophe'].mean():.1%}")

# Statistical test
chi2, p_value = compare_policies(policy_a_results, policy_b_results)
print(f"Difference is significant: {p_value < 0.05}")
```

### Sensitivity Analysis
```python
sobol_indices = sensitivity_analysis(simulator, param_ranges, n=1024)

# Which parameter matters most?
print(f"Most influential: {sobol_indices['ranking'][0]}")
# Output: "initial_trust (Sobol ST = 0.42)"
```

See [examples.md](./examples.md) for full worked examples with code and visualizations.

---

## Key Insights from AI-2027 Example

Based on 1000 Monte Carlo runs of AI governance scenarios:

1. **Initial trust** is the most important parameter (Sobol total effect = 0.41)
   - Dominates over compute growth rate, alignment funding
   - Policy implication: International cooperation efforts may be highest leverage

2. **Policy comparison**: Doubling alignment funding
   - Reduces P(catastrophe) from 33% to 22% (11 percentage point reduction)
   - Increases P(aligned outcome) from 16% to 29%
   - Delays AGI by ~6 months on average

3. **Paths to catastrophe**: Typically occur when
   - Initial trust < 0.68 (vs 0.75 in safe runs)
   - Early incidents (month 24 vs month 39)
   - Higher growth rates in race mode

4. **Uncertainty matters**: Time to AGI ranges from 38 to 108 months (5th-95th percentile)
   - Mean/median predictions miss this spread
   - Tail risk analysis reveals rare but severe scenarios

Full analysis: [examples.md](./examples.md)

---

## Related Documentation

**Within monte_carlo/**:
- [formalism.md](./formalism.md) - Math and algorithms
- [examples.md](./examples.md) - Full Python examples
- [eli5.md](./eli5.md) - Simple explanations
- [sensitivity_analysis.md](./sensitivity_analysis.md) - Sobol indices
- [practical_guide.md](./practical_guide.md) - Computational howto

**Integration**:
- [../simulacra_integration/monte_carlo_for_ttx.md](../simulacra_integration/monte_carlo_for_ttx.md) - MC for Simulacra game
- [../simulacra_integration/evals/discrete_time_modeling.md](../simulacra_integration/evals/discrete_time_modeling.md) - Discrete-time foundation
- [../matrix/adapters/README.md](../matrix/adapters/README.md) - Matrix adapters with MC built-in

---

## Summary

**Monte Carlo** = Run model many times → Get distributions not point estimates

**Gives you**:
- Risk quantification with confidence intervals
- Statistical policy comparison
- Sensitivity analysis (which levers matter)
- Conditional analysis (paths to catastrophe)

**Standard in**: Climate, finance, epidemiology, engineering risk analysis

**Next step**: See [examples.md](./examples.md) for complete runnable code with visualizations.
