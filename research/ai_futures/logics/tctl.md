# Timed Temporal Logics (TCTL & MTL)

## Overview

**Timed temporal logics** extend standard temporal logics with **real-time constraints**, enabling specification of properties with explicit time bounds and deadlines.

**Two main variants**:
- **TCTL** (Timed CTL): CTL with time-bounded operators
- **MTL** (Metric Temporal Logic): LTL with metric (real-valued) time

**Use case**: Specify AI2027 properties with calendar deadlines, response time requirements, and time-critical safety constraints.

## TCTL (Timed Computation Tree Logic)

### Syntax

```
φ ::= true
    | p                          (atomic proposition)
    | ¬φ
    | φ ∧ ψ
    | EX^{∼c} φ                   (timed exists next)
    | AX^{∼c} φ                   (timed all next)
    | EF^{∼c} φ                   (timed exists eventually)
    | AF^{∼c} φ                   (timed all eventually)
    | EG^{∼c} φ                   (timed exists globally)
    | AG^{∼c} φ                   (timed all globally)
    | E[φ U^{∼c} ψ]               (timed exists until)
    | A[φ U^{∼c} ψ]               (timed all until)

Where:
  ∼ ∈ {<, ≤, =, ≥, >}
  c ∈ ℝ₊ ∪ {∞}                    (time bound)
```

**Time intervals**:
```
EF^{[a,b]} φ   - Eventually φ within time window [a, b]
AG^{≤c} φ      - Always φ for duration at most c
E[φ U^{<c} ψ]  - φ until ψ in time < c
```

### Semantics

TCTL evaluated over **timed automata** or **timed transition systems**.

**State**: (location, clock valuation)
```
s = (l, v)  where v: Clocks → ℝ₊
```

**Timed paths**: Alternating delays and discrete transitions
```
π = (l₀,v₀) →^{d₀} (l₀,v₀+d₀) →^a₀ (l₁,v₁) →^{d₁} ...
```

**Satisfaction** M, s, t ⊨ φ (at time t):

```
M, s, t ⊨ EF^{≤c} φ     iff  ∃ path π from s:
                               ∃t' ∈ [t, t+c]: M, π(t'), t' ⊨ φ

M, s, t ⊨ AF^{≤c} φ     iff  ∀ path π from s:
                               ∃t' ∈ [t, t+c]: M, π(t'), t' ⊨ φ

M, s, t ⊨ AG^{≤c} φ     iff  ∀ path π from s:
                               ∀t' ∈ [t, t+c]: M, π(t'), t' ⊨ φ

M, s, t ⊨ E[φ U^{≤c} ψ] iff  ∃ path π from s:
                               ∃t' ∈ [t, t+c]: (M, π(t'), t' ⊨ ψ ∧
                                                 ∀t'' ∈ [t, t'): M, π(t''), t'' ⊨ φ)
```

## AI2027 Application: TCTL

### Time Scales

Map AI2027 timeline to real time:
```
1 quarter = 0.25 years = 3 months
Start:      2024-Q1 (t = 0)
AGI:        ~2027   (t ≈ 12 quarters)
ASI:        ~2028   (t ≈ 16 quarters)
```

### Example Specifications

#### Deadlines

**1. Must decide on slowdown by 2027**:
```
AF^{≤12} (race ∨ slowdown)
```
"All paths reach race or slowdown decision within 12 quarters (3 years)."

**2. If no action by 2026, race lock-in inevitable**:
```
AG^{≤8} ¬slowdown → AF^{≤12} race
```
"If slowdown not chosen within 8 quarters, race inevitable by quarter 12."

**3. Alignment must be achieved by 2030**:
```
AF^{≤24} aligned
```
"All paths reach aligned ASI within 24 quarters (6 years)."

#### Response Time Bounds

**1. Misalignment signal requires response within 6 months**:
```
AG (signal → AF^{≤2} (slowdown ∨ govControl))
```
"Whenever signal detected, intervention within 2 quarters (6 months)."

**2. Theft triggers immediate security boost**:
```
AG (theft → EX^{≤1} (sec > prev.sec))
```
"After theft, security improves within 1 quarter."

**3. High risk state can't persist long**:
```
AG (highRisk → AF^{≤4} ¬highRisk)
```
"High risk states resolve within 4 quarters (1 year)."

#### Time Windows

**1. AGI development window is 2-4 years**:
```
EF^{≥8} agi ∧ EF^{≤16} agi
```
"AGI reachable after 8 quarters and before 16 quarters."

**2. Superintelligence within 1 year of AGI**:
```
AG (agi → EF^{≤4} superint)
```
"If AGI achieved, superintelligence possible within 4 quarters."

**3. No catastrophe in next 2 years**:
```
AG^{≤8} ¬cat
```
"Catastrophe impossible for next 8 quarters."

#### Persistent Conditions

**1. Safety maintained for at least 3 years**:
```
EG^{≥12} ¬cat
```
"Exists path where safety holds for at least 12 quarters."

**2. Race lock-in lasts at least 2 years**:
```
AG (race → EG^{≥8} race)
```
"Once race starts, it persists for at least 8 quarters."

### Complex Timing Patterns

**1. Rapid takeoff scenario** (AGI to ASI in < 6 months):
```
EF (agi ∧ EF^{≤2} superint)
```

**2. Slow takeoff scenario** (AGI to ASI takes > 2 years):
```
EF (agi ∧ ¬superint U^{≥8} superint)
```

**3. Policy window** (must act between months 6-18):
```
AG^{<6} ¬slowdown → EF^{[6,18]} slowdown
```
"If no slowdown in first 6 months, it must occur in months 6-18."

## MTL (Metric Temporal Logic)

### Syntax

MTL extends LTL with time-bounded operators:

```
φ ::= p
    | ¬φ
    | φ ∧ ψ
    | φ U_I ψ                    (until within interval I)
    | F_I φ                      (eventually within I)
    | G_I φ                      (globally within I)

Where I ⊆ ℝ₊ is a time interval:
  I = [a, b], (a, b), [a, b), (a, ∞), etc.
```

**Derived operators**:
```
F_{[a,b]} φ    ≡  true U_{[a,b]} φ     (eventually in [a,b])
G_{[a,b]} φ    ≡  ¬F_{[a,b]} ¬φ        (always in [a,b])
```

### Semantics

MTL evaluated over **timed traces**: (timestamp, state) pairs

```
ρ = (s₀, t₀), (s₁, t₁), (s₂, t₂), ...
```

**Satisfaction** ρ, i ⊨ φ:

```
ρ, i ⊨ F_{[a,b]} φ    iff  ∃j ≥ i: tⱼ - tᵢ ∈ [a,b] ∧ ρ, j ⊨ φ

ρ, i ⊨ G_{[a,b]} φ    iff  ∀j: tⱼ - tᵢ ∈ [a,b] → ρ, j ⊨ φ

ρ, i ⊨ φ U_{[a,b]} ψ  iff  ∃j ≥ i: (tⱼ - tᵢ ∈ [a,b] ∧ ρ, j ⊨ ψ ∧
                                     ∀i ≤ k < j: ρ, k ⊨ φ)
```

### AI2027 Application: MTL

**1. Catastrophe never occurs in next 3 years**:
```
G_{[0,12]} ¬cat
```

**2. Alignment achieved between years 2 and 4**:
```
F_{[8,16]} aligned
```

**3. Theft occurs within 2 years of agent deployment**:
```
deployed → F_{[0,8]} theft
```

**4. Persistent high risk for at least 1 year**:
```
highRisk → G_{[0,4]} highRisk
```

**5. Response within 6 months of signal**:
```
G (signal → F_{[0,2]} slowdown)
```

## TCTL vs MTL Comparison

| Feature | TCTL | MTL |
|---------|------|-----|
| **Base logic** | CTL (branching) | LTL (linear) |
| **Paths** | Multiple (∃/∀) | Single |
| **Time** | Bounds on operators | Metric intervals |
| **Decidability** | Decidable (region graph) | Undecidable (general) |
| **Fragments** | - | MITL (decidable) |
| **Tools** | UPPAAL, Kronos | - |

**MITL** (Metric Interval Temporal Logic): Decidable fragment of MTL
- Forbids singular intervals like [a,a]
- Allows [a,b], (a,b), [a,∞)

## Model Checking Timed Logics

### Region Graph Construction

**Problem**: Infinite state space (real-valued clocks)

**Solution**: Partition clock space into finitely many **regions**

**Region**: Equivalence class of clock valuations

**Example**:
```
Clocks: {x, y}
Max constants: x ≤ 3, y ≤ 2

Regions:
  x = 0 ∧ y = 0
  0 < x < 1 ∧ y = 0
  x = 1 ∧ 0 < y < 1
  ...
```

**Region automaton**: Finite quotient of timed automaton

**TCTL model checking**:
1. Construct region automaton
2. Model check CTL on region automaton
3. Lift result back to timed automaton

**Complexity**: PSPACE-complete

### UPPAAL Workflow

```
1. Model timed automaton:

   clock x, y;

   process AI2027 {
     state S0, S4, S5;

     S0 -> S4 { guard: x <= 2; sync: deploy!; assign: x := 0; }
     S4 -> S5 { guard: x >= 6; sync: theft!; }
   }

2. Specify TCTL properties:

   A[] not (loc == S14)                    // Never catastrophe
   E<> (loc == S15 and x <= 20)            // Aligned within 20
   A[] (signal imply A<> x<=2 slowdown)    // Response in 2 quarters

3. Verify:

   verifyta ai2027.xml ai2027.q

4. Results:

   A[] not (loc == S14)              ✓
   E<> (loc == S15 and x <= 20)      ✓
   ...
```

## AI2027 Example: Deadline Analysis

**Scenario**: US must choose slowdown by 2027-Q1 or race lock-in occurs

**Model**:
```
Clocks: x_start (time since start)

States:
  S_PRE_RACE:     Before decision point
  S_RACE_LOCKED:  Race irreversible
  S_SLOWDOWN:     Cooperative regime

Transitions:
  S_PRE_RACE → S_SLOWDOWN   [guard: x_start < 12]
  S_PRE_RACE → S_RACE_LOCKED [guard: x_start ≥ 12]

Invariant:
  S_PRE_RACE: x_start ≤ 12
```

**TCTL Properties**:

**1. Slowdown possible if acted soon**:
```
S_PRE_RACE ∧ x_start < 6 ⟹ EF^{≤6} slowdown
```
Verification: ✓ (if at 6 months, can still choose slowdown within 6 months)

**2. After deadline, race inevitable**:
```
S_PRE_RACE ∧ x_start = 12 ⟹ AF^{=0} race
```
Verification: ✓ (invariant forces transition to race)

**3. Cannot delay decision indefinitely**:
```
S_PRE_RACE ⟹ AF^{≤12} (race ∨ slowdown)
```
Verification: ✓ (must decide by 12 quarters)

## Calendar Time Mapping

### Absolute Deadlines

Map TCTL formulas to calendar dates:

```
t = 0:  2024-Q1
t = 4:  2025-Q1
t = 8:  2026-Q1
t = 12: 2027-Q1
t = 16: 2028-Q1
t = 20: 2029-Q1
```

**Example**: "AGI by 2027" → AF^{≤12} agi

### Relative Time

**From event occurrence**:

```
AG (theft → AF^{≤4} (sec > prev))
```
"Within 4 quarters *after* theft, security improves."

**Clock resets** model "time since event":
```
theft occurs → reset clock x_audit
```

## Comparison with Other Logics

| Logic | Time | Branching | Decidability |
|-------|------|-----------|--------------|
| **LTL** | Step count | No | PSPACE-complete |
| **CTL** | Step count | Yes (∃/∀) | P (efficient) |
| **PCTL** | Step count | Yes + probabilities | P |
| **TCTL** | Real-valued | Yes (∃/∀) | PSPACE-complete |
| **MTL** | Real-valued | No | Undecidable |
| **MITL** | Real-valued | No | EXPSPACE-complete |

## Strengths

✅ **Real time**: Calendar deadlines, not just step counts
✅ **Time windows**: Specify [a, b] intervals naturally
✅ **Urgency**: Model "must happen soon"
✅ **Response time**: Bound reaction delays
✅ **Verification**: Decidable (TCTL via regions)

## Limitations

❌ **Complexity**: Region graph exponential in clocks
❌ **No probabilities**: Need probabilistic timed logics
❌ **Discrete transitions**: Assumes instantaneous actions
❌ **Tool maturity**: UPPAAL powerful but learning curve
❌ **Dense time**: Infinite behaviors (vs discrete steps)

## When to Use Timed Logics

Use TCTL/MTL when you want to:

✓ Specify **calendar deadlines** ("by 2027")
✓ Model **response times** ("within 6 months")
✓ Reason about **time windows** ("[2-4 years]")
✓ Check **urgent** properties ("must act soon")
✓ Verify **timing constraints** formally

**Don't use** when you need:
- Probabilistic time: Use CSL (continuous stochastic logic)
- Discrete steps sufficient: Use LTL/CTL/PCTL
- No timing constraints: Simpler logics suffice

## AI2027 Specification Library

**Deadlines**:
```
decideBy2027          = AF^{≤12} (race ∨ slowdown)
agiBy2027            = EF^{≤12} agi
alignBy2030          = AF^{≤24} aligned
```

**Response Times**:
```
signalResponse6mo    = AG (signal → AF^{≤2} slowdown)
theftResponseImmed   = AG (theft → EX^{≤1} secInvest)
riskResponseQuick    = AG (highRisk → AF^{≤4} intervention)
```

**Windows**:
```
agiWindow2to4yrs     = EF^{[8,16]} agi
takeoffUnder6mo      = EF (agi ∧ EF^{≤2} superint)
noNearTermCat        = AG^{≤8} ¬cat
```

**Persistence**:
```
safetyFor3yrs        = EG^{≥12} ¬cat
racePersists         = AG (race → EG^{≥8} race)
```

## Tools

**Timed Automata Model Checkers**:
- **UPPAAL**: Industry-standard for TCTL
  - Graphical editor
  - Symbolic model checking
  - Diagnostic traces

- **Kronos**: Academic tool for timed automata
  - Region-based verification
  - TCTL model checking

- **RED**: Real-time systems verifier
  - CDD-based (Clock Difference Diagrams)
  - Efficient for large clocks

**Probabilistic Timed**:
- **PRISM**: Supports CSL (continuous-time stochastic logic)
- **UPPAAL SMC**: Statistical model checking for timed systems

## References

- Alur, R. & Dill, D. (1994). "A theory of timed automata"
- Alur, R. et al. (1996). "The benefits of relaxing punctuality"
- Koymans, R. (1990). "Specifying real-time properties with metric temporal logic"
- Bengtsson, J. & Yi, W. (2004). "Timed automata: Semantics, algorithms and tools"
- Larsen et al. (1997). "UPPAAL in a nutshell"
