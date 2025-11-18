# Computation Tree Logic (CTL & CTL*)

## Overview

**Computation Tree Logic (CTL)** is a branching-time temporal logic that reasons about **all possible futures** from a given state, not just single paths.

**Key difference from LTL**: Explicitly distinguishes between:
- **∃** "there exists a path where..."
- **∀** "for all paths..."

**Use case**: Reason about possibility vs inevitability in AI2027's branching future.

## CTL Formal Definition

### Syntax

```
φ ::= p                  (atomic proposition)
    | ¬φ                 (negation)
    | φ ∧ ψ              (conjunction)
    | φ ∨ ψ              (disjunction)
    | EX φ               (exists next)
    | AX φ               (all next)
    | EF φ               (exists eventually)
    | AF φ               (all eventually)
    | EG φ               (exists globally)
    | AG φ               (all globally)
    | E[φ U ψ]           (exists until)
    | A[φ U ψ]           (all until)
```

**Path quantifiers**:
- **E**: "there exists a path"
- **A**: "for all paths"

**Temporal operators**:
- **X**: next
- **F**: eventually (future)
- **G**: globally (always)
- **U**: until

**Critical constraint**: Path quantifier must immediately precede temporal operator.
- ✓ Valid: EF φ, AG φ, A[φ U ψ]
- ✗ Invalid: E(φ U ψ) without brackets, F(E φ)

### Semantics

CTL formulas evaluated over **computation trees** (state transition graphs).

**Satisfaction relation** (M, s ⊨ φ):

```
M, s ⊨ p         iff  p ∈ L(s)
M, s ⊨ ¬φ        iff  M, s ⊭ φ
M, s ⊨ φ ∧ ψ     iff  M, s ⊨ φ  and  M, s ⊨ ψ

M, s ⊨ EX φ      iff  ∃s' ∈ succ(s): M, s' ⊨ φ
M, s ⊨ AX φ      iff  ∀s' ∈ succ(s): M, s' ⊨ φ

M, s ⊨ EF φ      iff  ∃ path π from s: ∃i ≥ 0: M, π[i] ⊨ φ
M, s ⊨ AF φ      iff  ∀ path π from s: ∃i ≥ 0: M, π[i] ⊨ φ

M, s ⊨ EG φ      iff  ∃ path π from s: ∀i ≥ 0: M, π[i] ⊨ φ
M, s ⊨ AG φ      iff  ∀ path π from s: ∀i ≥ 0: M, π[i] ⊨ φ

M, s ⊨ E[φ U ψ]  iff  ∃ path π from s: ∃j ≥ 0:
                        (M, π[j] ⊨ ψ  and  ∀0 ≤ k < j: M, π[k] ⊨ φ)

M, s ⊨ A[φ U ψ]  iff  ∀ path π from s: ∃j ≥ 0:
                        (M, π[j] ⊨ ψ  and  ∀0 ≤ k < j: M, π[k] ⊨ φ)
```

## AI2027 Application

### Branching Scenarios

From S4 ("Agents scaled"), multiple futures:

```
         S4
        /  \
       /    \
    S5      S6
  (theft) (controls)
    |        |
   S8       S9
  (race)  (slowdown)
```

**CTL distinguishes**:
- **EF cat**: "Catastrophe is *possible*" (exists some path to S14)
- **AF cat**: "Catastrophe is *inevitable*" (all paths lead to S14)

### Example Specifications

#### Possibility (Existential)

**1. Catastrophe is avoidable**:
```
EF ¬cat
```
"There exists a path where we eventually reach non-catastrophe state."

Equivalently: ¬AF cat ("catastrophe is not inevitable")

**2. Aligned ASI is achievable**:
```
EF aligned
```
"Some policy can reach aligned superintelligence."

**3. Can maintain safety indefinitely**:
```
EG ¬cat
```
"There exists a path staying safe forever."

**4. Possible to avoid race while reaching AGI**:
```
E[¬race U agi]
```
"Exists path: no race until AGI achieved."

#### Inevitability (Universal)

**1. All paths eventually decide**:
```
AF (race ∨ slowdown)
```
"No matter what, we eventually commit to race or slowdown."

**2. Catastrophe unavoidable**:
```
AF cat
```
"All paths lead to extinction."

**3. Always possible to slow down**:
```
AG EF slowdown
```
"At every state, there exists a future where slowdown occurs."

**4. Safety margin inevitably degrades**:
```
AF lowSec
```
"All paths eventually hit low security."

#### Reachability vs Stability

**1. Can reach and maintain alignment**:
```
EF EG aligned
```
"Exists path: eventually reach aligned and stay there forever."

**2. Cannot avoid high risk states**:
```
AG ¬EG ¬highRisk
```
"At every state, no path avoids high risk forever."

#### Response Properties

**1. Every misalignment signal can be addressed**:
```
AG (signal → EF slowdown)
```
"Whenever signal appears, slowdown is possible."

**2. Theft always enables security improvement**:
```
AG (theft → EX (sec > prev.sec))
```
"After theft, all next states have better security."

### CTL vs LTL Comparison

| LTL | CTL | Meaning |
|-----|-----|---------|
| F φ | AF φ | Eventually φ (on all paths) |
| G φ | AG φ | Always φ (on all paths) |
| - | EF φ | Possibly eventually φ |
| - | EG φ | Possibly always φ |
| X φ | AX φ | Next φ (all successors) |
| - | EX φ | Next φ (some successor) |

**LTL F φ ≠ CTL AF φ** in general! LTL is path-based, CTL is state-based.

## CTL* (Superset of LTL and CTL)

**CTL*** combines LTL and CTL, allowing arbitrary nesting of path quantifiers and temporal operators.

### Syntax

```
State formulas (Φ):
  Φ ::= p | ¬Φ | Φ ∧ Ψ | E φ | A φ

Path formulas (φ):
  φ ::= Φ | ¬φ | φ ∧ ψ | X φ | F φ | G φ | φ U ψ
```

**Key difference**: Path formulas can contain state formulas.

### Examples Beyond CTL

**1. On all paths, eventually a state where catastrophe is avoidable**:
```
AF EF ¬cat
```
CTL*: ✓ Valid
CTL: ✓ Valid (special case)

**2. On all paths, always eventually recovery is possible**:
```
AG EF lowRisk
```
CTL*: ✓ Valid
CTL: ✓ Valid

**3. There exists a path where eventually always safe**:
```
E (F G ¬cat)
```
CTL*: ✓ Valid (arbitrary nesting)
CTL: Can encode as EF EG ¬cat

**4. Fair property: If action enabled infinitely often, taken infinitely often**:
```
A (G F enabled → G F taken)
```
CTL*: ✓ Valid
CTL: ✗ Cannot express (requires nested path operators)

### When CTL* Matters

**Fairness constraints** often need CTL*:
```
A G F φ  (infinitely often φ)
```

CTL can't express "infinitely often" directly. CTL* adds this expressiveness at cost of harder model checking.

## AI2027 Branching Examples

### Example 1: S4 Decision Point

**State S4**: Agents scaled to 1M+ employees

**Possible transitions**:
```
S4 → S5 (weight theft, 15% probability)
S4 → S6 (export controls, 10% probability)
S4 → S7 (gov partnership, 5% probability)
S4 → S4 (nothing, 70% probability)
```

**CTL checks**:

**Q1: Is catastrophe inevitable from S4?**
```
S4 ⊨ AF cat?

Check all paths from S4:
  - Path through S5 → ... → S14 (cat) ✓
  - Path through S6 → ... → S15 (¬cat) ✗

Answer: NO (some paths avoid cat)
```

**Q2: Is aligned ASI achievable from S4?**
```
S4 ⊨ EF aligned?

Check if any path from S4 reaches S15:
  - Path: S4 → S6 → S9 → S12 → S15 ✓

Answer: YES (aligned is reachable)
```

**Q3: Can we avoid race lock-in?**
```
S4 ⊨ EG ¬race?

Check if path exists staying out of race states:
  - All infinite paths eventually hit decision point
  - Some decision points force race or slowdown

Answer: Depends on graph structure
```

### Example 2: Signal Response

**State S6**: Misalignment signal detected

**CTL specification**: "Can respond within 2 steps"
```
S6 ⊨ EF≤2 slowdown
```

**Check**:
```
Immediate successors of S6:
  - S6 → S9 (slowdown) ✓ [1 step]
  - S6 → S8 (ignore) → S10 (slowdown) ✓ [2 steps]

Answer: YES
```

### Example 3: Race Irreversibility

**Claim**: Once race starts, can never escape

**CTL formula**:
```
AG (race → AG race)
```

**Verification on AI2027 graph**:
```
Check all race states (S8, S9, S11):
  From S8: all future states maintain race ✓
  From S9: exists path to S15 (¬race) ✗

Answer: NO (counterexample: S9 → ... → S15)
```

## CTL Model Checking Algorithm

### Fixpoint Computation

CTL model checking uses **fixpoint iteration**:

**EF φ** (exists eventually):
```
Initialize: X₀ = {s | s ⊨ φ}
Iterate:    Xᵢ₊₁ = Xᵢ ∪ {s | ∃s' ∈ succ(s): s' ∈ Xᵢ}
Fixpoint:   X* = ∪ᵢ Xᵢ

Result: s ⊨ EF φ iff s ∈ X*
```

**EG φ** (exists globally):
```
Initialize: X₀ = {s | s ⊨ φ}
Iterate:    Xᵢ₊₁ = {s ∈ Xᵢ | ∃s' ∈ succ(s): s' ∈ Xᵢ}
Fixpoint:   X* = ∩ᵢ Xᵢ

Result: s ⊨ EG φ iff s ∈ X*
```

**Complexity**: O(|φ| · (|S| + |→|))
- Linear in formula size
- Linear in model size
- **Much faster** than LTL model checking!

### AI2027 Example

**Check**: S0 ⊨ EF aligned

```
Iteration 0:
  X₀ = {S15}  (states where aligned holds)

Iteration 1:
  X₁ = X₀ ∪ {s | ∃s' ∈ succ(s): s' ∈ X₀}
     = {S15} ∪ {S13}  (S13 → S15)
     = {S13, S15}

Iteration 2:
  X₂ = {S13, S15} ∪ {S10, S12}  (S10 → S13, S12 → S15)
     = {S10, S12, S13, S15}

... continue until fixpoint ...

Iteration n:
  X* = {S0, S1, ..., S15}

Result: S0 ∈ X*, so S0 ⊨ EF aligned ✓
```

## Comparison: CTL vs LTL vs CTL*

| Feature | LTL | CTL | CTL* |
|---------|-----|-----|------|
| **Paths** | Single | All from state | Both |
| **Nesting** | No path quantifiers | Fixed E/A + temporal | Arbitrary |
| **"Exists path"** | No | Yes (E) | Yes |
| **"All paths"** | Implicit | Yes (A) | Yes |
| **Model checking** | PSPACE-complete | P (fixpoint) | PSPACE-complete |
| **Expressiveness** | Some properties | Some properties | Most expressive |
| **Fairness** | Yes | Limited | Yes |

**Incomparable**:
- LTL can express: F G φ ("eventually stable")
- CTL cannot express this!
- But CTL can express: AG EF φ ("always possible")
- LTL cannot express this!

## Patterns and Idioms

### Possibility Patterns

```
canReach(φ)           = EF φ
canMaintain(φ)        = EG φ
canStabilize(φ)       = EF EG φ
canAvoid(φ)           = EG ¬φ
canReachAvoid(φ, ψ)   = E[¬ψ U φ]
```

### Inevitability Patterns

```
mustReach(φ)          = AF φ
mustAlways(φ)         = AG φ
cannotAvoid(φ)        = AF φ
mustDecide(φ, ψ)      = AF (φ ∨ ψ)
```

### Reachability Patterns

```
reachableFrom(s, φ)   = s ⊨ EF φ
deadlockFree(s)       = s ⊨ AG EX true
livelock(s, φ)        = s ⊨ AG EF φ
```

## AI2027 Specification Library

**Achievability**:
```
alignedAchievable      = EF aligned
safetyMaintainable     = EG ¬cat
canAvoidRace           = E[¬race U aligned]
```

**Inevitability**:
```
mustEventuallyDecide   = AF (race ∨ slowdown)
alwaysSomeRisk         = AG (highRisk ∨ lowSec)
cannotMaintainLead     = AG EF (usChina < 0.2)
```

**Safety**:
```
noInevitableExtinct    = ¬AF cat
alwaysCanRecover       = AG EF lowRisk
```

**Fairness**:
```
allOptionsConsidered   = AG (EX action₁ ∧ EX action₂ ∧ ...)
noDeadEnd             = AG EX true
```

## Tools

**CTL Model Checkers**:
- **NuSMV**: Symbolic CTL/LTL model checker
- **SPIN**: Can check some CTL properties via never claims
- **PRISM**: CTL over MDPs (PCTL variant)
- **CADP**: Verification toolbox with CTL support

**Workflow**:
```
1. Model AI2027 in input language (SMV, Promela, etc.)
2. Define atomic propositions
3. Write CTL specifications
4. Run model checker
5. Analyze witness/counterexample paths
```

## Strengths

✅ **Branching time**: Distinguishes exists vs forall
✅ **Efficient**: Polynomial-time model checking (fixpoint)
✅ **Possibility reasoning**: "Can we avoid X?"
✅ **Inevitability**: "Must Y happen?"
✅ **Game-theoretic**: Natural for adversarial scenarios

## Limitations

❌ **Less expressive than CTL***: Some LTL properties inexpressible
❌ **State-based**: Doesn't capture all path properties
❌ **No probabilities**: Need PCTL
❌ **No real time**: Need TCTL
❌ **Fairness**: Limited compared to LTL/CTL*

## When to Use CTL

Use CTL when you want to:

✓ Distinguish **possibility** vs **inevitability**
✓ Ask "Can we avoid X?" (EG ¬X)
✓ Ask "Is Y unavoidable?" (AF Y)
✓ Efficient model checking (large state spaces)
✓ Reason about **branching futures**

**Don't use** when you need:
- Fair paths: Use CTL* or LTL
- Probabilities: Use PCTL
- Real-time: Use TCTL
- Linear-time properties: Use LTL

## AI2027 Analysis Questions

**Strategic**:
- "Can we reach aligned ASI while avoiding race?" → E[¬race U aligned]
- "Is slowdown eventually necessary?" → AF slowdown
- "Can safety be maintained indefinitely?" → EG ¬cat

**Risk**:
- "Is catastrophe avoidable?" → EF ¬cat (or ¬AF cat)
- "Must we eventually face high risk?" → AF highRisk
- "Can we recover from any state?" → AG EF lowRisk

**Policy**:
- "Does this policy guarantee alignment?" → AG EF aligned
- "Can policy avoid race lock-in?" → AG EF ¬race
- "Is intervention always possible?" → AG EX slowdown

## References

- Clarke & Emerson (1981). "Design and synthesis of synchronization skeletons using branching time temporal logic"
- Emerson & Halpern (1986). "Sometimes and not never revisited: On branching versus linear time temporal logic"
- Baier & Katoen (2008). "Principles of Model Checking" (Chapter 6: CTL)
- Cimatti et al. (2002). "NuSMV 2: An opensource tool for symbolic model checking"
