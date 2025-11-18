# Monte Carlo Practical Guide

**Purpose**: How to actually implement MC simulation for your project.

---

## Workflow

**Step 1**: Build deterministic simulator
- Get one run working correctly
- Test edge cases
- Validate against intuition

**Step 2**: Identify uncertainties
- Which parameters are unknown?
- Which processes are stochastic?
- List all sources of uncertainty

**Step 3**: Specify distributions (conservatively)
- Use Uniform if no strong prior: U[low, high]
- Use Normal for measured quantities: N(mean, std)
- Use Beta for probabilities: Beta(α, β)

**Step 4**: Quick MC (100-300 runs with LHS)
- Sanity check distributions
- Debug crashes
- Check if results are reasonable

**Step 5**: Sensitivity analysis (1024-2048 runs)
- Which parameters matter?
- Focus modeling effort on high-sensitivity inputs

**Step 6**: Production MC (1000-5000 runs)
- Generate final distributions
- Statistical tests for policy comparison
- Visualizations

**Step 7**: Conditional analysis
- What differs in catastrophe vs safe runs?
- Identify "paths to catastrophe"

---

## How Many Runs?

**Quick answer**:
- Prototyping: 100-300 (use LHS)
- Production: 1000-5000
- Sensitivity: 1024-8192 (power of 2 for Sobol)
- Rare events (p < 1%): 10,000+ or use importance sampling

**Formula** (probability estimation):
```
Standard error: SE(p̂) ≈ sqrt(p(1-p)/N)

For 95% CI with error ε:
N ≥ (1.96^2 × p(1-p)) / ε^2

Conservative (p=0.5):
N ≥ 1/(4ε^2)
```

**Examples**:
- ε = 0.05 (±5%): N ≥ 400 → use 500
- ε = 0.03 (±3%): N ≥ 1067 → use 1000
- ε = 0.01 (±1%): N ≥ 9604 → use 10000

---

## Variance Reduction Tricks

### 1. Latin Hypercube Sampling (LHS)
**Benefit**: 3x variance reduction
**Cost**: Same as basic MC
**When**: Always! No downside.

```python
from scipy.stats.qmc import LatinHypercube
sampler = LatinHypercube(d=n_params)
samples = sampler.random(n=300)  # 300 LHS ≈ 1000 basic MC
```

### 2. Common Random Numbers
**Benefit**: 2x variance reduction for comparisons
**Use case**: Policy A vs Policy B

```python
np.random.seed(42)
results_A = [simulate(policy_A, seed=r) for r in range(N)]

np.random.seed(42)  # Same seed!
results_B = [simulate(policy_B, seed=r) for r in range(N)]

# Var(A - B) << Var(A) + Var(B)
```

### 3. Importance Sampling
**Benefit**: 10x+ for rare events
**Cost**: Requires choosing good proposal distribution
**Use case**: P(catastrophe) < 1%

---

## Parallelization

**MC is embarrassingly parallel**: Each run is independent

```python
from multiprocessing import Pool

def run_single(seed):
    return simulate(params, seed=seed)

with Pool(n_cores=8) as pool:
    results = pool.map(run_single, range(1000))

# Speedup: ~8x on 8 cores
```

**Note**: Manage random seeds carefully!

---

## Common Pitfalls

### 1. Forgetting Dependence

**Bad**: Assume parameters are independent when they're not

```python
# WRONG if trust and cooperation are correlated!
trust = np.random.uniform(0.5, 0.9)
cooperation = np.random.uniform(0.3, 0.7)
```

**Fix**: Use multivariate distributions or copulas

### 2. Too Few Runs for Rare Events

**Bad**: Estimate P(catastrophe) = 1% with N=100 runs
- SE ≈ 1% → Estimate is ±1% (100% relative error!)

**Fix**: Use N ≥ 10,000 or importance sampling

### 3. Ignoring Sensitivity

**Bad**: Run MC, report mean, never check which parameters matter

**Fix**: Always do sensitivity analysis - might discover some parameters don't matter!

### 4. Over-Precise Input Distributions

**Bad**: "Growth rate ~ N(0.147, 0.0023)" when you actually have no clue

**Fix**: Use wide ranges, sensitivity analysis will show if precision matters

---

## Tools

**Python**:
- numpy: Basic random sampling
- scipy.stats: Probability distributions
- SALib: Sobol sensitivity analysis
- multiprocessing: Parallelization

**R**:
- Built-in distributions
- sensitivity package
- parallel package

**Specialized**:
- StochSD (for System Dynamics models)
- @RISK / Crystal Ball (Excel add-ins)
- GoldSim (environmental risk)

---

## Checklist

Before running production MC:

- [ ] Deterministic simulator works correctly
- [ ] All uncertain parameters identified
- [ ] Distributions specified (documented rationale)
- [ ] Quick MC (100 runs) completed, results reasonable
- [ ] Code reviewed for correctness
- [ ] Random seed management clear
- [ ] Sensitivity analysis planned
- [ ] Output metrics defined
- [ ] Computational resources available
- [ ] Visualization plan ready

---

## Related Documentation

- [README.md](./README.md) - MC overview
- [examples.md](./examples.md) - Full Python examples
- [formalism.md](./formalism.md) - Mathematical details
- [sensitivity_analysis.md](./sensitivity_analysis.md) - Sobol indices
