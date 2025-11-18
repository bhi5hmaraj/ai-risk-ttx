# Linear Temporal Logic (LTL)

## Overview

**Linear Temporal Logic (LTL)** is a modal logic for specifying properties of **single execution paths** through time. Unlike branching logics, LTL talks about what must hold along one particular timeline.

**Use case**: Specify desired/forbidden behaviors in individual AI2027 trajectories.

## Formal Definition

### Syntax

```
φ ::= p                  (atomic proposition)
    | ¬φ                 (negation)
    | φ ∧ ψ              (conjunction)
    | φ ∨ ψ              (disjunction)
    | φ → ψ              (implication)
    | X φ                (next)
    | F φ                (eventually, future)
    | G φ                (globally, always)
    | φ U ψ              (until)
    | φ R ψ              (release)
```

**Derived operators**:
```
φ ∨ ψ   ≡  ¬(¬φ ∧ ¬ψ)
φ → ψ   ≡  ¬φ ∨ ψ
F φ     ≡  true U φ
G φ     ≡  ¬F ¬φ
φ R ψ   ≡  ¬(¬φ U ¬ψ)
```

### Semantics

LTL formulas are evaluated over **infinite traces**:

```
σ = s₀, s₁, s₂, s₃, ...
```

Where each state sᵢ is labeled with a set of atomic propositions L(sᵢ) ⊆ AP.

**Satisfaction relation** (σ, i ⊨ φ):

```
σ, i ⊨ p         iff  p ∈ L(sᵢ)
σ, i ⊨ ¬φ        iff  σ, i ⊭ φ
σ, i ⊨ φ ∧ ψ     iff  σ, i ⊨ φ  and  σ, i ⊨ ψ

σ, i ⊨ X φ       iff  σ, i+1 ⊨ φ
σ, i ⊨ F φ       iff  ∃j ≥ i: σ, j ⊨ φ
σ, i ⊨ G φ       iff  ∀j ≥ i: σ, j ⊨ φ
σ, i ⊨ φ U ψ     iff  ∃j ≥ i: (σ, j ⊨ ψ  and  ∀i ≤ k < j: σ, k ⊨ φ)
```

**Initial satisfaction**: σ ⊨ φ iff σ, 0 ⊨ φ

## AI2027 Application

### Atomic Propositions

Define propositions over AI2027 states:

**Scenario-based**:
```
cat           - Catastrophe/extinction state (S14)
aligned       - Aligned ASI achieved (S15)
agi           - AGI reached (S7-S10)
superint      - Superintelligence (S11-S13)
race          - US-China race state
slowdown      - Slowdown regime active
govPartner    - Gov-lab partnership
```

**Variable-based** (threshold predicates):
```
highRisk      - align > 0.5
lowSec        - sec < 2.0
highHack      - hack > 0.6
fastTakeoff   - rnd > 3.0
govControl    - gov > 0.7
```

**Event-based**:
```
theft         - Weight theft occurred
controls      - Export controls imposed
signal        - Misalignment signal detected
breakthrough  - Major capability jump
```

### Example Specifications

#### Safety Properties (Something bad never happens)

**1. Catastrophe never occurs**:
```
G ¬cat
```
"Globally (at all time steps), we are not in catastrophe state."

**2. Once aligned, never catastrophe**:
```
G (aligned → G ¬cat)
```
"If we reach aligned ASI, catastrophe is impossible thereafter."

**3. Never simultaneously high alignment risk and low security**:
```
G ¬(highRisk ∧ lowSec)
```

#### Liveness Properties (Something good eventually happens)

**1. Eventually reach aligned ASI**:
```
F aligned
```
"At some future point, aligned ASI is achieved."

**2. If misalignment signal, eventually respond**:
```
G (signal → F slowdown)
```
"Whenever signal is detected, slowdown eventually occurs."

**3. Eventually enter cooperation or accept catastrophe risk**:
```
F (slowdown ∨ cat)
```
"We eventually choose slowdown or catastrophe becomes possible."

#### Response Properties (If A then eventually B)

**1. Theft triggers security investment**:
```
G (theft → X F (sec > L(s_prev).sec))
```
"After theft, security eventually improves."

**2. High risk triggers intervention**:
```
G (highRisk → F (slowdown ∨ govControl))
```
"High alignment risk leads to slowdown or government control."

#### Precedence Properties (A before B)

**1. No superintelligence before AGI**:
```
¬superint U agi
```
"We don't reach superintelligence until after AGI."

**2. Must invest in alignment before fast takeoff**:
```
¬fastTakeoff U (align < 0.3)
```
"Can't have fast takeoff until alignment risk is reduced."

#### Commitment Properties (Once A, always A)

**1. Once race starts, no turning back**:
```
G (race → G race)
```
"Race lock-in is irreversible."

**2. Government control is permanent**:
```
G (govControl → G govControl)
```

### Complex Patterns

#### Bounded Response
"Misalignment signal triggers slowdown within 5 steps":
```
G (signal → (F₅ slowdown))
```
Where F₅ is bounded eventually (can encode as nested X operators).

#### Recurrence
"Security audits happen infinitely often":
```
G F audit
```
"Always, eventually another audit occurs."

#### Stability
"Eventually reach stable aligned state":
```
F G aligned
```
"Eventually we reach aligned and stay there forever."

#### Progress
"Alignment risk must eventually decrease or catastrophe":
```
G (highRisk → F (¬highRisk ∨ cat))
```

## Example Trace Evaluation

**Trace**:
```
σ = S0, S1, S4, S6, S7, S10, S13, S15, S15, S15, ...

Labels:
  L(S0)  = {}
  L(S1)  = {agi}
  L(S4)  = {agi, highRisk}
  L(S6)  = {agi, highRisk, signal}
  L(S7)  = {agi, slowdown}
  L(S10) = {superint, slowdown}
  L(S13) = {superint, slowdown, govControl}
  L(S15) = {aligned, slowdown, govControl}
```

**Check**: G (signal → F slowdown)
```
At i=3 (S6): signal ∈ L(S6), so need F slowdown
  At j=4 (S7): slowdown ∈ L(S7) ✓

Conclusion: σ ⊨ G (signal → F slowdown) ✓
```

**Check**: G ¬cat
```
For all i: cat ∉ L(sᵢ) ✓

Conclusion: σ ⊨ G ¬cat ✓
```

**Check**: F aligned
```
At i=7 (S15): aligned ∈ L(S15) ✓

Conclusion: σ ⊨ F aligned ✓
```

**Check**: ¬superint U slowdown
```
Need: superint false until slowdown becomes true

i=0,1,2,3: superint ∉ L(sᵢ), slowdown ∉ L(sᵢ)
  φ holds (waiting)
i=4 (S7): slowdown ∈ L(S7) ✓

But wait: i=5 (S10): superint ∈ L(S10)
This is AFTER slowdown, so formula holds.

Conclusion: σ ⊨ ¬superint U slowdown ✓
```

## LTL Model Checking

### Problem Statement

Given:
- **Model** M (transition system, MDP, etc.)
- **LTL formula** φ
- **Initial state** s₀

**Question**: Do all paths from s₀ in M satisfy φ?

**Notation**: M, s₀ ⊨ φ

### Approach: Büchi Automaton Construction

**Standard algorithm**:

1. **Negate** formula: ¬φ
2. **Translate** ¬φ to Büchi automaton A_¬φ
3. **Product** M × A_¬φ
4. **Check** if product has accepting run

If **no** accepting run: M ⊨ φ ✓
If **yes**: counterexample found ✗

### For AI2027

**Example**: Check if G ¬cat holds from S0

```
1. Negate: ¬(G ¬cat) = F cat
2. Build Büchi automaton for "F cat":
   - Accept traces that eventually see cat
3. Product with AI2027 state graph
4. Search for path to cat state
   - If found: counterexample (path to catastrophe)
   - If not found: property holds ✓
```

## Fairness Constraints

LTL often used with **fairness assumptions**:

**Weak fairness**: If action enabled infinitely often, eventually taken
```
G F enabled(a) → G F taken(a)
```

**Strong fairness**: If action enabled infinitely often, taken infinitely often
```
G F enabled(a) → G F taken(a)
```

### AI2027 Example

"If export controls are repeatedly proposed, they eventually pass":
```
G F proposed(controls) → F passed(controls)
```

## Relationship to Models

LTL specifications apply to **traces** generated by models:

| Model | Traces | LTL Interpretation |
|-------|--------|-------------------|
| **LTS** | Deterministic paths | All traces satisfy φ? |
| **MDP** | Stochastic paths | Almost surely satisfy φ? |
| **CTMDP** | Continuous-time paths | Discretize, then check |
| **Timed Automata** | Timed paths | Abstract time, then check |

**For MDP/CTMDP**: Need **probabilistic LTL** (see PCTL) for probability bounds.

## Tools

**LTL Model Checkers**:
- **SPIN**: Explicit-state LTL model checker
- **NuSMV**: Symbolic LTL/CTL model checker
- **PRISM**: Probabilistic model checker (supports LTL over MDPs)
- **Spot**: LTL to Büchi automaton translation

**Workflow**:
```
1. Define AI2027 model in tool input language
2. Specify atomic propositions (labeling function)
3. Write LTL formulas
4. Run model checker
5. Analyze counterexamples if property fails
```

## Strengths

✅ **Linear-time reasoning**: Natural for single trajectories
✅ **Intuitive semantics**: "Next", "eventually", "always"
✅ **Mature tools**: SPIN, NuSMV, PRISM
✅ **Trace-based**: Fits simulation/execution paradigm
✅ **Compositional**: Can build complex specs from simple parts

## Limitations

❌ **Linear only**: Can't distinguish "exists path" vs "all paths"
❌ **No probabilities**: Need PCTL for "probably F aligned"
❌ **No real time**: Need TCTL for "within 2 years"
❌ **Infinite traces**: Finite runs need care (lasso, stuttering)
❌ **State explosion**: Large models intractable

## When to Use LTL

Use LTL when you want to:

✓ Specify **trajectory-level** properties
✓ Check **safety** (bad things never happen)
✓ Check **liveness** (good things eventually happen)
✓ Reason about **single execution paths**
✓ Use **simulation-based** verification

**Don't use** when you need:
- Branching (exists vs forall): Use CTL
- Probabilities: Use PCTL
- Real-time constraints: Use TCTL/MTL
- Strategic reasoning: Use ATL

## AI2027 Specification Library

**Safety**:
```
noExtinction           = G ¬cat
onceAlignedSafe        = G (aligned → G ¬cat)
noRaceWithHighRisk     = G ¬(race ∧ highRisk)
```

**Liveness**:
```
eventuallyAligned      = F aligned
eventuallyDecide       = F (slowdown ∨ race)
responseToSignal       = G (signal → F slowdown)
```

**Causality**:
```
agiBeforeSuperint      = ¬superint U agi
alignBeforeTakeoff     = ¬fastTakeoff U (align < 0.3)
```

**Commitment**:
```
raceLockIn             = G (race → G race)
govIrreversible        = G (govControl → G govControl)
```

**Response**:
```
theftImprovesSec       = G (theft → F (sec > prev.sec))
highRiskIntervene      = G (highRisk → F (slowdown ∨ govControl))
```

## Example: Policy Verification

**Policy π**: "Invest in alignment when risk > 0.4, else scale compute"

**Desired property**: Under π, catastrophe is impossible
```
φ = G ¬cat
```

**Verification**:
1. Simulate AI2027 under policy π
2. Generate trace σ_π
3. Check σ_π ⊨ G ¬cat
4. If fails: examine counterexample (path to cat)

## References

- Pnueli, A. (1977). "The temporal logic of programs"
- Baier & Katoen (2008). "Principles of Model Checking" (Chapters 5-6)
- Vardi & Wolper (1994). "Reasoning about infinite computations"
- Clarke et al. (1999). "Model Checking" (Chapter 9: LTL)
- Holzmann (2004). "The SPIN Model Checker"
