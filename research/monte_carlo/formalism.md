# Monte Carlo Simulation: Formal Specification

**Purpose**: Mathematical formulation and algorithms for Monte Carlo simulation.

---

## Core Formalism

### Problem Setup

**Given**:
- Simulator: $f: \Theta \times \mathbb{R}^n \times \mathbb{U} \to \mathbb{R}^n$
  - $\Theta$: Parameter space (uncertain)
  - $\mathbb{R}^n$: State space
  - $\mathbb{U}$: Action/input space

- Uncertain parameters: $\theta \sim p(\theta)$
- Initial state: $x_0(\theta)$
- Stochastic shocks: $\xi_k \sim p(\xi)$ for $k = 0, \ldots, N-1$

**Discrete-time dynamics**:
$$x_{k+1} = f(x_k, u_k, \xi_k; \theta)$$

**Metric of interest**: $m: \text{Trajectory} \to \mathbb{R}$
- Example: $m(\tau) = \mathbb{1}[\text{final mode} = \text{catastrophe}]$

**Goal**: Estimate $\mathbb{E}[m] = \int m(\tau(\theta, \xi)) p(\theta) p(\xi) d\theta d\xi$

---

## Monte Carlo Estimator

###Basic Monte Carlo

**Algorithm**:
```
FOR r = 1 TO R:
    1. Sample θ_r ~ p(θ)
    2. Sample {ξ_k}_k=0^{N-1} ~ p(ξ)
    3. Simulate trajectory: τ_r = {x_0, x_1, ..., x_N}
    4. Compute metric: m_r = m(τ_r)

RETURN: m̂ = (1/R) Σ m_r
```

**Properties**:
- $\mathbb{E}[\hat{m}] = \mathbb{E}[m]$ (unbiased)
- $\text{Var}(\hat{m}) = \sigma_m^2 / R$ where $\sigma_m^2 = \text{Var}(m)$
- $\text{SE}(\hat{m}) = \sigma_m / \sqrt{R}$ (standard error)

**Confidence interval** (95%):
$$\hat{m} \pm 1.96 \cdot \text{SE}(\hat{m})$$

**Convergence**: By Law of Large Numbers, $\hat{m} \to \mathbb{E}[m]$ as $R \to \infty$

**Rate**: $O(1/\sqrt{R})$ (slow but dimension-independent)

---

### Stratified Sampling (Latin Hypercube)

**Idea**: Partition parameter space into strata, sample one point per stratum

**Algorithm** (LHS):
```
1. For each parameter θ_i, partition [0,1] into R intervals
2. Sample one point uniformly from each interval
3. Randomly permute samples across dimensions
4. Transform to actual parameter distributions
```

**Properties**:
- $\text{Var}_{\text{LHS}}(\hat{m}) \leq \text{Var}_{\text{MC}}(\hat{m})$
- Typically 3-5x variance reduction
- Equivalent to ~3R basic MC samples

**When to use**: Always! No downside for smooth functions.

---

## Sensitivity Analysis

### Sobol Indices

**Decomposition**: 
$$m(\theta) = m_0 + \sum_i m_i(\theta_i) + \sum_{i<j} m_{ij}(\theta_i, \theta_j) + \ldots$$

**First-order index** (main effect of $\theta_i$):
$$S_i = \frac{\text{Var}_{\theta_i}[\mathbb{E}_{\theta_{\sim i}}[m | \theta_i]]}{\text{Var}[m]}$$

**Total-effect index** (including interactions):
$$S_T^i = \frac{\mathbb{E}_{\theta_{\sim i}}[\text{Var}_{\theta_i}[m | \theta_{\sim i}]]}{\text{Var}[m]}$$

**Interpretation**:
- $S_i$: Proportion of variance explained by $\theta_i$ alone
- $S_T^i$: Proportion of variance involving $\theta_i$ (including interactions)
- $S_T^i - S_i$: Interaction effects

**Sampling scheme** (Saltelli):
- Generate two base samples: $A, B \in \mathbb{R}^{R \times d}$
- For each parameter $i$, create hybrid: $A_B^{(i)} = [A_1, \ldots, A_{i-1}, B_i, A_{i+1}, \ldots, A_d]$
- Total samples: $R \times (2d + 2)$

**Computational cost**: For $d$ parameters, need $(2d+2) \times R$ simulations

**Recommended**: $R = 1024$ or $2048$ (power of 2)

---

### Sensitivity via Regression

**Linear approximation**:
$$m \approx \beta_0 + \sum_i \beta_i \theta_i$$

**Standardized regression coefficients** $\beta_i^*$ ≈ sensitivity

**Advantage**: Cheap (same MC samples used for estimation)

**Disadvantage**: Only captures linear effects, misses interactions

**Use case**: Quick screening of parameters before full Sobol analysis

---

## Variance Reduction

### Common Random Numbers

**For policy comparison**: Use same random seeds for both policies

**Benefit**: Reduces variance in *difference* estimate

**Example**:
```python
# Same random draws for both policies
np.random.seed(42)
results_A = [simulate(policy_A, seed=r) for r in range(R)]

np.random.seed(42)  # Same seed!
results_B = [simulate(policy_B, seed=r) for r in range(R)]

# Var(A - B) << Var(A) + Var(B)
```

**Variance reduction**: Up to 2x for positively correlated outputs

---

### Importance Sampling

**Idea**: Sample more from "important" regions

**Standard MC**: $\mathbb{E}[m] = \int m(x) p(x) dx \approx \frac{1}{R} \sum m(x_r)$ where $x_r \sim p$

**Importance sampling**: $\mathbb{E}[m] = \int m(x) \frac{p(x)}{q(x)} q(x) dx \approx \frac{1}{R} \sum m(x_r) w(x_r)$
- Sample from $q(x)$ instead of $p(x)$
- Weight by $w(x) = p(x) / q(x)$

**Optimal $q^*(x) \propto |m(x)| p(x)$** (but unknown in practice)

**Use case**: Rare events

**Example**: If catastrophe happens in 1% of scenarios under $p$,
- Standard MC: Need ~10,000 runs to get stable estimate
- IS with $q$ focused on near-catastrophe region: Need ~1,000 runs

---

### Antithetic Variates

**Idea**: For each sample $\theta$, also run $-\theta$ (symmetric)

**Works when**: $m(\theta) + m(-\theta) \approx 2\mathbb{E}[m]$ (function is roughly symmetric)

**Variance reduction**: $\text{Var}(\hat{m}_{\text{ant}}) = \frac{1}{2}(1 + \rho) \text{Var}(\hat{m}_{\text{MC}})$ where $\rho = \text{Corr}(m(\theta), m(-\theta))$

**Best case** ($\rho = -1$): 2x variance reduction

**Limitation**: Requires symmetric domains and roughly symmetric function

---

## Sample Size Determination

### For Probability Estimation

**Goal**: Estimate $p = \mathbb{P}(\text{event})$ with error $\epsilon$

**Standard error**: $\text{SE}(\hat{p}) = \sqrt{\frac{p(1-p)}{R}}$

**Sample size** for error $\epsilon$ at 95% confidence:
$$R \geq \frac{1.96^2 \cdot p(1-p)}{\epsilon^2}$$

**Conservative** (worst case $p=0.5$):
$$R \geq \frac{1}{(2\epsilon)^2}$$

**Examples**:
- $\epsilon = 0.10$ (±10% error): $R \geq 96$ → Use 100
- $\epsilon = 0.05$ (±5% error): $R \geq 384$ → Use 500
- $\epsilon = 0.03$ (±3% error): $R \geq 1067$ → Use 1000
- $\epsilon = 0.01$ (±1% error): $R \geq 9604$ → Use 10000

**For rare events** ($p \ll 0.5$):
$$R \approx \frac{1.96^2 \cdot (1-p)}{p \cdot \epsilon_{\text{rel}}^2} \approx \frac{4}{p \cdot \epsilon_{\text{rel}}^2}$$

where $\epsilon_{\text{rel}} = \epsilon / p$ is relative error.

**Example**: Estimate $p = 0.01$ (1% catastrophe rate) with 10% relative error
$$R \approx \frac{4}{0.01 \cdot 0.1^2} = 40,000$$

**Practical workaround**: Use importance sampling or conditional MC

---

### For Mean Estimation

**Goal**: Estimate $\mu = \mathbb{E}[m]$ with error $\epsilon$

**Standard error**: $\text{SE}(\hat{\mu}) = \sigma_m / \sqrt{R}$

**Sample size**:
$$R \geq \frac{1.96^2 \cdot \sigma_m^2}{\epsilon^2}$$

**Problem**: We don't know $\sigma_m$ beforehand!

**Solution**: Pilot study
1. Run small MC ($R_{\text{pilot}} = 100$)
2. Estimate $\hat{\sigma}_m$
3. Compute required $R$ for target $\epsilon$
4. Run additional samples if needed

---

## Convergence Diagnostics

### Visual: Trace Plot

Plot $\hat{m}_R$ vs $R$ (cumulative mean)

**Good**: Stabilizes after some $R^*$
**Bad**: Still wandering at max $R$

### Quantitative: Effective Sample Size

**Autocorrelation** in MC samples (for MCMC, not basic MC):
$$\rho_k = \text{Corr}(m_t, m_{t+k})$$

**Effective sample size**:
$$R_{\text{eff}} = \frac{R}{1 + 2 \sum_{k=1}^{\infty} \rho_k}$$

**For independent MC**: $R_{\text{eff}} = R$ (no autocorrelation)

---

## Parallelization

**Embarrassingly parallel**: Each MC run is independent

**Speedup**: Linear in number of cores (ideal)

**Implementation** (Python):
```python
from multiprocessing import Pool

def run_single(seed):
    np.random.seed(seed)
    return simulate(params, horizon)

with Pool(n_cores) as pool:
    results = pool.map(run_single, range(R))
```

**Consideration**: Random seed management
- Each worker needs different seed
- Use: $\text{seed}_r = \text{base}_{\text{seed}} + r$

---

## Statistical Tests

### Comparing Two Policies

**Setup**: Policy A vs Policy B, binary outcome (catastrophe or not)

**Contingency table**:
|        | Catastrophe | Safe | Total |
|--------|-------------|------|-------|
| Policy A | $n_{A,C}$ | $n_{A,S}$ | $R$ |
| Policy B | $n_{B,C}$ | $n_{B,S}$ | $R$ |

**Chi-squared test**: Tests if $p_A = p_B$

**Test statistic**:
$$\chi^2 = \sum_{i,j} \frac{(O_{ij} - E_{ij})^2}{E_{ij}}$$

**Degrees of freedom**: $(r-1)(c-1) = 1$

**p-value**: $p = \mathbb{P}(\chi^2_1 > \chi^2_{\text{obs}})$

**Reject $H_0$** if $p < 0.05$

### Comparing Continuous Outcomes

**Setup**: Policy A vs Policy B, continuous metric (e.g., time to AGI)

**Two-sample t-test**:
$$t = \frac{\bar{m}_A - \bar{m}_B}{\sqrt{s_A^2/R_A + s_B^2/R_B}}$$

**Degrees of freedom** (Welch):
$$\nu = \frac{(s_A^2/R_A + s_B^2/R_B)^2}{\frac{(s_A^2/R_A)^2}{R_A-1} + \frac{(s_B^2/R_B)^2}{R_B-1}}$$

**Alternative**: Mann-Whitney U test (non-parametric, more robust)

---

## Mathematical Properties

### Law of Large Numbers

**Weak LLN**: For iid $m_1, \ldots, m_R$ with $\mathbb{E}[|m|] < \infty$,
$$\hat{m} = \frac{1}{R} \sum_{r=1}^R m_r \xrightarrow{P} \mathbb{E}[m]$$

**Interpretation**: MC estimator converges to true mean

### Central Limit Theorem

**CLT**: For iid $m_r$ with $\text{Var}(m) = \sigma_m^2 < \infty$,
$$\sqrt{R} (\hat{m} - \mathbb{E}[m]) \xrightarrow{d} N(0, \sigma_m^2)$$

**Implication**: Approximate 95% CI:
$$\hat{m} \pm 1.96 \cdot \frac{\hat{\sigma}_m}{\sqrt{R}}$$

**Validity**: Usually $R \geq 30$ sufficient

---

## Connection to Other Methods

### Monte Carlo vs Quadrature

**Quadrature** (numerical integration):
- Accuracy: $O(R^{-p/d})$ for $p$-order rule, $d$ dimensions
- **Curse of dimensionality**: Exponential cost in $d$

**Monte Carlo**:
- Accuracy: $O(R^{-1/2})$ regardless of dimension
- **Dimension-free**: Same convergence rate in 2D or 100D

**Break-even**: MC wins for $d > 4$ typically

### Monte Carlo vs Model Checking

**Model checking**:
- Exact probabilities for discrete state space
- $P[\varphi] = \sum_{s \in S} \mathbb{1}[\varphi(s)] \cdot \pi(s)$
- **Limitation**: State space explosion ($|S| = O(2^n)$)

**Monte Carlo**:
- Approximate probabilities for any state space
- $P[\varphi] \approx \frac{1}{R} \sum_{r=1}^R \mathbb{1}[\varphi(\tau_r)]$
- **Advantage**: Scales to large/continuous state spaces

**Hybrid**: Abstract to small discrete model → model check → validate with MC on full model

---

## Advanced Topics

### Quasi-Monte Carlo

**Idea**: Use low-discrepancy sequences instead of random samples
- Sobol sequence
- Halton sequence

**Convergence**: $O((\log R)^d / R)$ (better than $O(1/\sqrt{R})$ for smooth functions)

**Limitation**: Requires smooth integrands; randomization needed for error estimates

### Sequential Monte Carlo

**Idea**: Adaptive sampling - use early runs to guide later runs

**Application**: Rare event estimation
1. Run $R_1$ samples under $p$
2. Identify near-catastrophe region
3. Focus $R_2$ samples in that region
4. Reweight to get unbiased estimate

### Multilevel Monte Carlo

**Idea**: Use cheap low-fidelity model for most samples, expensive high-fidelity for few

**Variance**: $\text{Var}(\hat{m}_{\text{MLMC}}) \approx \text{Var}(\hat{m}_{\text{MC}})$

**Cost**: Much lower (if cheap model is good approximation)

---

## Summary

**Core algorithm**: Sample inputs → run simulation → aggregate

**Properties**:
- Unbiased: $\mathbb{E}[\hat{m}] = \mathbb{E}[m]$
- Converges: $\hat{m} \to \mathbb{E}[m]$ as $R \to \infty$
- Rate: $O(1/\sqrt{R})$
- Dimension-free: Works in high dimensions

**Enhancements**:
- LHS: 3x variance reduction
- Common random numbers: 2x for comparisons
- Importance sampling: 10x+ for rare events
- Parallelization: Linear speedup

**Sample sizes**:
- Quick: 100-300 (with LHS)
- Production: 1000-5000
- Rare events: 10000+ or use importance sampling

**Related docs**:
- [examples.md](./examples.md) - Practical implementations
- [sensitivity_analysis.md](./sensitivity_analysis.md) - Sobol indices in depth
- [practical_guide.md](./practical_guide.md) - Computational howto
