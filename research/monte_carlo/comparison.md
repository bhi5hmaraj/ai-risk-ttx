# Monte Carlo vs Model Checking

**TL;DR**: Monte Carlo samples state space, Model Checking exhaustively explores it.

---

## Key Differences

| Aspect | Monte Carlo | Model Checking |
|--------|-------------|----------------|
| **Approach** | Sample representative trajectories | Exhaustively explore all reachable states |
| **Result** | Approximate probability (with CI) | Exact probability (for abstraction) |
| **State space** | Works for huge/continuous spaces | Limited to discrete, finite spaces |
| **Guarantees** | Statistical (confidence intervals) | Logical (yes/no verification) |
| **Speed** | O(# runs) | O(# states), often exponential |
| **Typical size** | 1000-10,000 runs | 10^6-10^9 states (with abstraction) |

---

## When to Use Model Checking

✅ **Use model checking when**:
- State space is small enough to discretize
- You need formal guarantees ("provably safe")
- Properties are critical (medical devices, aerospace)
- Can build reasonable abstraction

**Example**: Discretize AI-2027 HA to grid:
- Compute: 10 levels
- Alignment: 10 levels
- Trust: 10 levels
- Modes: 5
- **State space**: 5 × 10^3 = 5000 states → PRISM can handle

**Check**: P[◇catastrophe] < 0.1 with exact answer

---

## When to Use Monte Carlo

✅ **Use Monte Carlo when**:
- State space is large or continuous
- You need distributions, not just yes/no
- Model is stochastic with complex uncertainties
- Rapid iteration more important than guarantees

**Example**: AI-2027 with continuous state
- Compute ∈ ℝ, alignment ∈ [0,1], trust ∈ [0,1]
- Uncertain parameters (growth rates, incident probabilities)
- **State space**: Infinite → MC samples representative subset

**Get**: P(catastrophe) = 33% ± 3% (approximate but fast)

---

## Hybrid Approach

**Best of both worlds**:
1. Build high-fidelity continuous model (SD/HA)
2. Abstract to small discrete model
3. Model-check abstraction → bounds
4. Monte Carlo on full model → distributions
5. Cross-validate

**Example**:
- **Model checking**: "At least 20% of states lead to catastrophe" (lower bound)
- **Monte Carlo**: "In practice, 33% of realistic scenarios lead to catastrophe" (empirical)

**Benefit**: Rigorous bounds + practical distributions

---

## Related Documentation

- [formalism.md](./formalism.md) - MC mathematics
- [../simulacra_integration/evals/comparison_matrix.md](../simulacra_integration/evals/comparison_matrix.md) - Broader formalism comparison
