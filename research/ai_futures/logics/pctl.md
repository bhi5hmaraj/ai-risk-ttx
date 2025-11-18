# Probabilistic Computation Tree Logic (PCTL)

## Overview

**Probabilistic CTL (PCTL)** extends CTL with **probabilistic quantification**, enabling reasoning about likelihood of properties in stochastic systems.

**Key addition**: Replace qualitative ∃/∀ with quantitative probability bounds.

**Use case**: Specify risk thresholds for AI2027 under stochastic dynamics (Mealy+MDP, CTMDP).

## Formal Definition

### Syntax

```
State formulas (Φ):
  Φ ::= true
      | p                       (atomic proposition)
      | ¬Φ
      | Φ ∧ Ψ
      | P⋈λ[φ]                   (probabilistic operator)

Path formulas (φ):
  φ ::= X Φ                     (next)
      | Φ U Φ                   (until)
      | Φ U≤k Φ                 (bounded until)

Where:
  ⋈ ∈ {<, ≤, >, ≥}             (comparison)
  λ ∈ [0, 1]                   (probability threshold)
```

**Derived operators**:
```
F Φ      ≡  true U Φ                (eventually)
G Φ      ≡  ¬F ¬Φ                   (globally)
F≤k Φ    ≡  true U≤k Φ              (bounded eventually)
```

### Semantics

PCTL formulas evaluated over **Discrete-Time Markov Chains (DTMC)** or **Markov Decision Processes (MDP)**.

**Probability measure** on paths:
```
Pr_s^σ(ψ) = probability that paths from s satisfy ψ under scheduler σ
```

**Satisfaction relation**:

```
M, s ⊨ true          always
M, s ⊨ p             iff  p ∈ L(s)
M, s ⊨ ¬Φ            iff  M, s ⊭ Φ
M, s ⊨ Φ ∧ Ψ         iff  M, s ⊨ Φ  and  M, s ⊨ Ψ

M, s ⊨ P⋈λ[φ]         iff  Pr_s(φ) ⋈ λ
```

**Path formula semantics**:
```
Pr_s(X Φ) = Σ_{s' ∈ Φ-states} P(s, s')

Pr_s(Φ U Ψ) = probability of reaching Ψ-state via Φ-states

Pr_s(Φ U≤k Ψ) = probability of reaching Ψ within k steps via Φ-states
```

## PCTL vs CTL Comparison

| CTL | PCTL | Meaning |
|-----|------|---------|
| EF φ | P>0[F φ] | Some path reaches φ |
| AF φ | P=1[F φ] | All paths reach φ |
| - | P≥0.95[F φ] | At least 95% probability φ |
| AG φ | P=1[G φ] | All paths always φ |
| EG φ | P>0[G φ] | Some path always φ |

**Key difference**: PCTL expresses **how likely**, not just **whether possible**.

## AI2027 Application

### Stochastic Dynamics

From S4, probabilistic transitions:
```
S4 →^0.15 S5 (theft)
S4 →^0.10 S6 (controls)
S4 →^0.05 S7 (partnership)
S4 →^0.70 S4 (nothing)
```

**PCTL can ask**:
- What's the probability of reaching aligned ASI?
- Is catastrophe risk below 5%?
- With what confidence do we eventually slow down?

### Example Specifications

#### Risk Bounds

**1. Low catastrophe risk**:
```
P≤0.05[F cat]
```
"Probability of eventually reaching catastrophe is at most 5%."

**2. High alignment probability**:
```
P≥0.95[F aligned]
```
"At least 95% chance of reaching aligned ASI."

**3. Near-certain safety**:
```
P≥0.99[G ¬cat]
```
"With 99% probability, catastrophe never occurs."

#### Bounded-Time Properties

**1. Align within 5 years**:
```
P≥0.8[F≤20 aligned]
```
"At least 80% probability aligned ASI within 20 quarters (5 years)."

**2. Avoid theft in near term**:
```
P≥0.9[G≤8 ¬theft]
```
"90% chance no theft in next 8 quarters (2 years)."

**3. Decide quickly**:
```
P≥0.95[F≤4 (race ∨ slowdown)]
```
"95% chance decision within 4 quarters (1 year)."

#### Conditional Probabilities

**1. Given signal, likely slow down**:
```
signal → P≥0.8[F≤4 slowdown]
```
"If signal detected, 80%+ chance slowdown within 4 quarters."

**2. High risk implies intervention**:
```
highRisk → P≥0.9[F (slowdown ∨ govControl)]
```
"High alignment risk leads to intervention with 90%+ probability."

#### Probabilistic Reachability

**1. Aligned reachable with good odds**:
```
P>0.5[F aligned]
```
"More likely than not to reach alignment."

**2. Race probable but not certain**:
```
P>0.6[F race] ∧ P<1[F race]
```
"Race likely (>60%) but avoidable."

### Threshold Selection

**Risk tolerance**:
```
Stringent:  P≤0.01[F cat]    (1% catastrophe risk)
Moderate:   P≤0.05[F cat]    (5% catastrophe risk)
Permissive: P≤0.10[F cat]    (10% catastrophe risk)
```

**Confidence levels**:
```
High:       P≥0.99[F aligned]
Moderate:   P≥0.95[F aligned]
Low:        P≥0.80[F aligned]
```

## Computing Probabilities

### Reachability Probability

**Problem**: Compute Pr_s(F φ)

**Algorithm** (for DTMC):
```
1. Identify target states: T = {s | s ⊨ φ}
2. Solve linear system:

   For s ∈ T:    Pr_s = 1
   For s ∉ T:    Pr_s = Σ_{s'} P(s, s') · Pr_s'

3. Return Pr_s₀
```

**Example**: Pr_S0(F aligned)

```
States: S0, S1, ..., S15
Target: S15 (aligned)

Linear system:
  Pr_S15 = 1
  Pr_S13 = P(S13, S15) · 1 + P(S13, S13) · Pr_S13
         = 0.3 · 1 + 0.7 · Pr_S13
         → Pr_S13 = 1 (absorbing or will reach S15)

  Pr_S4 = P(S4, S5)·Pr_S5 + P(S4, S6)·Pr_S6 + ...
        = 0.15·Pr_S5 + 0.10·Pr_S6 + ...

Solve system → Pr_S0 = 0.68
```

**Interpretation**: 68% chance of reaching aligned ASI from S0.

### Bounded Reachability

**Problem**: Compute Pr_s(F≤k φ)

**Algorithm**:
```
Initialize: Pr⁰_s = 1 if s ⊨ φ, else 0

Iterate for i = 1 to k:
  Pr^i_s = 1                           if s ⊨ φ
         = Σ_{s'} P(s, s') · Pr^{i-1}_{s'}   otherwise

Return: Pr^k_s₀
```

**Example**: Pr_S4(F≤3 theft)

```
Step 0: Pr⁰_s = 1 if s = S5 (theft state), else 0

Step 1: Pr¹_S4 = P(S4, S5) = 0.15

Step 2: Pr²_S4 = 0.15 + (1-0.15)·0.15 = 0.2775

Step 3: Pr³_S4 = 0.15 + (1-0.15)·0.2775 ≈ 0.386

Result: ~39% chance theft within 3 steps from S4
```

### Expected Steps to Target

**Problem**: Compute E[steps to reach φ]

**Algorithm**:
```
For s ∈ T:    E_s = 0
For s ∉ T:    E_s = 1 + Σ_{s'} P(s, s') · E_s'
```

**Example**: E[steps S0 → aligned]

Solve and get: E_S0 = 14.2 quarters ≈ 3.5 years

## AI2027 Example: Policy Analysis

**Policy π**: "Invest in alignment when risk > 0.4"

**Model**: MDP with policy π applied

**Specifications**:

```
1. Safety:         P≤0.05[F cat]
2. Success:        P≥0.90[F aligned]
3. Timely:         P≥0.80[F≤20 aligned]
4. No theft:       P≥0.95[G≤8 ¬theft]
5. Low risk:       P≥0.99[G (align < 0.6)]
```

**Verification**:
```
PRISM model checker:

P(F cat) = 0.03        → ✓ Satisfies spec 1
P(F aligned) = 0.92    → ✓ Satisfies spec 2
P(F≤20 aligned) = 0.76 → ✗ Fails spec 3
P(G≤8 ¬theft) = 0.97   → ✓ Satisfies spec 4
P(G align<0.6) = 0.88  → ✗ Fails spec 5
```

**Conclusion**: Policy ensures safety but too slow (fails timeliness).

## MDPs vs DTMCs

### DTMC (Fully Stochastic)
- No actions, only probabilities
- Single probability measure
- P⋈λ[φ] is well-defined

### MDP (Nondeterministic + Stochastic)
- Actions + probability distributions
- Multiple possible schedulers
- Need to resolve nondeterminism

**PCTL on MDPs**:
```
P^min_⋈λ[φ]  - Minimum probability over all schedulers
P^max_⋈λ[φ]  - Maximum probability over all schedulers
```

**Example**: S4 with choice: {INVEST_SEC, NO_OP}

```
Under INVEST_SEC:  P(F theft) = 0.05
Under NO_OP:       P(F theft) = 0.25

P^min_≤0.1[F theft]  ✓ (choose INVEST_SEC)
P^max_≤0.1[F theft]  ✗ (NO_OP violates)
```

**Interpretation**:
- P^min: "Can we keep risk below λ?" (∃ scheduler)
- P^max: "Is risk guaranteed below λ?" (∀ scheduler)

## Rewards and Costs

PCTL can be extended with **reward structures**:

```
R⋈λ[F φ]          - Expected reward until φ
R⋈λ[C≤k]          - Expected reward over k steps
R⋈λ[I=k]          - Instantaneous reward at step k
```

### AI2027 Rewards

**Negative rewards (costs)**:
```
- Cost of catastrophe: -1000
- Cost of theft:       -50
- Cost per quarter in race: -5
- Cost of high alignment risk: -10 per quarter
```

**Positive rewards**:
```
+ Reward for aligned ASI: +1000
+ Reward for slowdown:    +100
+ Reward for low risk:    +5 per quarter
```

**Example specification**:
```
R^min_≤50[F aligned]
```
"Can reach aligned ASI with expected cost ≤ 50?"

**Compute**:
```
Path costs:
  S0 → S4 → S6 → S9 → S12 → S15:  cost = 20
  S0 → S4 → S5 → S8 → S14:        cost = 1070 (catastrophe!)

Expected cost over all paths: 38

Result: ✓ Satisfies specification
```

## Model Checking Algorithm

### PCTL Model Checking (DTMC)

**Input**: DTMC M, state s, PCTL formula φ

**Algorithm**:
```
CheckPCTL(M, s, φ):
  case φ = p:           return p ∈ L(s)
  case φ = ¬ψ:          return ¬CheckPCTL(M, s, ψ)
  case φ = ψ₁ ∧ ψ₂:     return CheckPCTL(M, s, ψ₁) ∧ CheckPCTL(M, s, ψ₂)

  case φ = P⋈λ[ψ]:
    1. Compute Pr_s(ψ) using fixpoint/linear system
    2. Return Pr_s(ψ) ⋈ λ
```

**Complexity**: Polynomial in |M| and |φ|
- Computing Pr_s(F φ): O(|S|³) (linear system solution)
- Faster with specialized algorithms (graph-based)

### PRISM Workflow

```
1. Model specification:

   dtmc
     module AI2027
       s: [0..15] init 0;

       [deploy] s=0 -> (s'=1);
       [scale]  s=1 -> 0.15:(s'=5) + 0.85:(s'=4);
       ...
     endmodule

2. Properties specification:

   P<=0.05 [F s=14]              // Low catastrophe risk
   P>=0.95 [F s=15]              // High alignment prob
   P>=0.8  [F<=20 s=15]          // Timely alignment
   R{"cost"}<=50 [F s=15]        // Low-cost path

3. Verification:

   prism ai2027.pm ai2027.props

4. Results:

   P(F s=14) = 0.037             ✓
   P(F s=15) = 0.924             ✓
   P(F<=20 s=15) = 0.761         ✗
   R(F s=15) = 42.3              ✓
```

## Quantitative Patterns

### Safety with Confidence
```
highConfidenceSafety   = P≥0.99[G ¬cat]
moderateSafety         = P≥0.95[G ¬cat]
possibleSafety         = P>0[G ¬cat]
```

### Probabilistic Liveness
```
likelyAlignment        = P≥0.8[F aligned]
probablyDecide         = P≥0.9[F (race ∨ slowdown)]
eventualDecision       = P=1[F (race ∨ slowdown)]
```

### Response with Probability
```
signalResponseLikely   = P≥0.9[signal → F≤4 slowdown]
theftImprovesSec       = P≥0.8[theft → F (sec > prev.sec)]
```

## Comparison with CTL

| Property | CTL | PCTL |
|----------|-----|------|
| "Catastrophe possible" | EF cat | P>0[F cat] |
| "Catastrophe inevitable" | AF cat | P=1[F cat] |
| "Likely catastrophe" | - | P>0.5[F cat] |
| "Low risk catastrophe" | - | P≤0.05[F cat] |
| "Always safe" | AG ¬cat | P=1[G ¬cat] |
| "Probably safe" | - | P≥0.95[G ¬cat] |

**CTL**: Qualitative (yes/no)
**PCTL**: Quantitative (how likely)

## Tools

**Probabilistic Model Checkers**:
- **PRISM**: Leading PCTL model checker (DTMCs, MDPs, CTMCs)
- **Storm**: High-performance probabilistic checker
- **MRMC**: Markov Reward Model Checker
- **ePMC**: Extendable probabilistic model checker

**PRISM Features**:
- PCTL, CSL (continuous-time)
- Reward properties
- Strategy synthesis for MDPs
- Parametric model checking

## Strengths

✅ **Quantitative**: Specifies probabilities, not just possibility
✅ **Risk thresholds**: Natural for safety-critical systems
✅ **Stochastic systems**: Designed for MDPs/DTMCs
✅ **Efficient**: Polynomial-time model checking
✅ **Tool support**: PRISM, Storm mature and fast

## Limitations

❌ **Discrete time**: Bounded steps, not real time (use CSL for continuous)
❌ **Finite horizon**: Bounded properties easier than unbounded
❌ **State explosion**: Large MDPs intractable
❌ **Numerical issues**: Floating-point errors for complex models

## When to Use PCTL

Use PCTL when you want to:

✓ Specify **risk bounds** (P≤0.05[F catastrophe])
✓ Analyze **stochastic models** (Mealy+MDP, DTMC)
✓ Compute **probabilities** of outcomes
✓ Set **confidence levels** for success
✓ Optimize **policies** in MDPs (P^max)

**Don't use** when you need:
- Real-time constraints: Use CSL
- Qualitative only: Use CTL
- Path properties: Use LTL
- No probabilities: Use CTL

## AI2027 Specification Library

**Safety**:
```
lowCatastropheRisk    = P≤0.05[F cat]
highConfidenceSafe    = P≥0.99[G ¬cat]
noNearTermTheft       = P≥0.9[G≤8 ¬theft]
```

**Success**:
```
likelyAlignment       = P≥0.9[F aligned]
probablyDecide        = P≥0.95[F (race ∨ slowdown)]
timelyAlignment       = P≥0.8[F≤20 aligned]
```

**Response**:
```
signalTriggersAction  = P≥0.9[signal → F≤4 slowdown]
theftImprovesSec      = P≥0.8[theft → F (sec > prev)]
riskTriggersGov       = P≥0.95[highRisk → F govControl]
```

## References

- Hansson & Jonsson (1994). "A logic for reasoning about time and reliability"
- Bianco & de Alfaro (1995). "Model checking of probabilistic and nondeterministic systems"
- Baier & Katoen (2008). "Principles of Model Checking" (Chapter 10: PCTL)
- Kwiatkowska et al. (2011). "PRISM 4.0: Verification of probabilistic real-time systems"
- Dehnert et al. (2017). "A Storm is coming: A modern probabilistic model checker"
