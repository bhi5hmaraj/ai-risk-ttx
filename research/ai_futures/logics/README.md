# Temporal Logics for AI2027

This directory contains specifications of **temporal logics** as **specification layers** over AI2027 models. Temporal logics provide formal languages for expressing properties about system behavior over time.

## What are Temporal Logics?

**Temporal logics** extend classical logic with operators for reasoning about time:
- **Next** (X): Property holds in next state
- **Eventually** (F): Property holds at some future point
- **Globally** (G): Property holds at all future points
- **Until** (U): Property φ holds until ψ becomes true

**Use case**: Specify desired/forbidden behaviors formally, enabling automated verification.

## Logics Documented

| Logic | File | Key Feature | Best For |
|-------|------|-------------|----------|
| **LTL** | [ltl.md](ltl.md) | Linear time (single paths) | Trace properties, simulations |
| **CTL** | [ctl.md](ctl.md) | Branching time (∃/∀ paths) | Possibility vs inevitability |
| **PCTL** | [pctl.md](pctl.md) | Probabilistic CTL | Risk bounds, stochastic systems |
| **TCTL/MTL** | [tctl.md](tctl.md) | Real-time constraints | Deadlines, response times |

## Quick Comparison

### Expressiveness

```
Property: "Catastrophe is avoidable"

LTL:  Cannot express (talks about single paths)
CTL:  EF ¬cat  ("exists path eventually not catastrophe")
PCTL: P>0[F ¬cat]  ("positive probability of avoiding catastrophe")
TCTL: EF^{≤12} ¬cat  ("avoidable within 12 time units")
```

### When to Use Which

```
Decision tree:

Need probabilities?
├─ YES: PCTL
│   "At most 5% risk of catastrophe" → P≤0.05[F cat]
│
└─ NO: Need real-time constraints?
    ├─ YES: TCTL/MTL
    │   "Must decide by 2027" → AF^{≤12} (race ∨ slowdown)
    │
    └─ NO: Need branching (exists vs forall)?
        ├─ YES: CTL
        │   "Can we avoid race?" → EG ¬race
        │
        └─ NO: LTL
            "Eventually aligned" → F aligned
```

## LTL (Linear Temporal Logic)

[Full documentation: ltl.md](ltl.md)

### Syntax
```
φ ::= p | ¬φ | φ ∧ ψ | X φ | F φ | G φ | φ U ψ
```

### Key Operators
- **X φ**: Next - φ holds in next state
- **F φ**: Eventually - φ holds at some future point
- **G φ**: Globally - φ holds at all future points
- **φ U ψ**: Until - φ holds until ψ becomes true

### AI2027 Examples

**Safety**: "Catastrophe never happens"
```
G ¬cat
```

**Liveness**: "Eventually reach aligned ASI"
```
F aligned
```

**Response**: "Signals trigger slowdown"
```
G (signal → F slowdown)
```

**Precedence**: "AGI before superintelligence"
```
¬superint U agi
```

### Strengths & Limitations

✅ Intuitive linear-time reasoning
✅ Mature tools (SPIN, NuSMV)
✅ Trace-based (fits simulations)

❌ Can't distinguish "exists path" vs "all paths"
❌ No probabilities
❌ No real-time constraints

## CTL (Computation Tree Logic)

[Full documentation: ctl.md](ctl.md)

### Syntax
```
φ ::= p | ¬φ | φ ∧ ψ | EX φ | AX φ | EF φ | AF φ | EG φ | AG φ | E[φ U ψ] | A[φ U ψ]
```

### Path Quantifiers
- **E**: "There exists a path..."
- **A**: "For all paths..."

### AI2027 Examples

**Possibility**: "Catastrophe is avoidable"
```
EF ¬cat  or equivalently  ¬AF cat
```

**Inevitability**: "Must eventually decide"
```
AF (race ∨ slowdown)
```

**Reachability**: "Can reach and maintain alignment"
```
EF EG aligned
```

**Safety**: "Always possible to slow down"
```
AG EF slowdown
```

### Strengths & Limitations

✅ Distinguishes possibility vs inevitability
✅ Efficient (polynomial-time model checking)
✅ Natural for branching futures

❌ Less expressive than CTL* (some LTL properties inexpressible)
❌ No probabilities
❌ No real-time constraints

## PCTL (Probabilistic CTL)

[Full documentation: pctl.md](pctl.md)

### Syntax
```
Φ ::= p | ¬Φ | Φ ∧ Ψ | P⋈λ[φ]

φ ::= X Φ | Φ U Φ | Φ U≤k Φ

⋈ ∈ {<, ≤, >, ≥}
λ ∈ [0, 1]
```

### Probabilistic Operator
```
P⋈λ[φ]  "Probability of φ satisfies ⋈ λ"
```

### AI2027 Examples

**Risk bound**: "Low catastrophe risk"
```
P≤0.05[F cat]
```
"At most 5% probability of catastrophe."

**Success confidence**: "High alignment probability"
```
P≥0.95[F aligned]
```
"At least 95% chance of reaching aligned ASI."

**Bounded time**: "Align within 5 years"
```
P≥0.8[F≤20 aligned]
```
"At least 80% probability aligned ASI within 20 quarters."

**Response**: "Signals likely trigger slowdown"
```
signal → P≥0.9[F≤4 slowdown]
```
"If signal detected, 90%+ chance slowdown within 4 quarters."

### Strengths & Limitations

✅ Quantitative (probabilities, not just yes/no)
✅ Risk thresholds natural
✅ Mature tools (PRISM, Storm)

❌ Discrete time only (use CSL for continuous)
❌ Numerical issues for complex models
❌ State space explosion

## TCTL/MTL (Timed Logics)

[Full documentation: tctl.md](tctl.md)

### TCTL Syntax
```
φ ::= p | ¬φ | φ ∧ ψ | EX^{∼c} φ | AX^{∼c} φ | EF^{∼c} φ | AF^{∼c} φ | ...

∼ ∈ {<, ≤, =, ≥, >}
c ∈ ℝ₊ ∪ {∞}
```

### MTL Syntax
```
φ ::= p | ¬φ | φ ∧ ψ | φ U_I ψ | F_I φ | G_I φ

I ⊆ ℝ₊  (time interval)
```

### AI2027 Examples

**Deadline**: "Must decide by 2027"
```
AF^{≤12} (race ∨ slowdown)
```
"All paths reach decision within 12 quarters (3 years)."

**Response time**: "Signal requires response within 6 months"
```
AG (signal → AF^{≤2} slowdown)
```
"Whenever signal, intervention within 2 quarters."

**Time window**: "AGI between 2026-2028"
```
EF^{[8,16]} agi
```
"AGI reachable in quarters 8-16."

**Persistence**: "Safety for at least 3 years"
```
EG^{≥12} ¬cat
```
"Exists path where safety holds for ≥12 quarters."

### Strengths & Limitations

✅ Real-time constraints (calendar deadlines)
✅ Time windows natural
✅ Verification tools (UPPAAL)

❌ Complexity (region graphs for TCTL)
❌ MTL undecidable (use MITL fragment)
❌ No built-in probabilities

## Integration with Models

Temporal logics are **specification layers** over formal models:

```
Models (../formal_models/):
  - LTS with Effects     ─┐
  - Mealy + MDP          ─┼─→ Kripke Structure ─→ LTL/CTL/PCTL/TCTL
  - CTMDP                ─┤      (semantic model)     (properties)
  - Timed Automata       ─┘
```

**Workflow**:
1. **Model**: Build transition system (MDP, Kripke, etc.)
2. **Specify**: Write properties in temporal logic
3. **Verify**: Use model checker
4. **Analyze**: Examine counterexamples

## AI2027 Specification Library

### Safety Properties

```
LTL:
  G ¬cat                              // Never catastrophe
  G (deployed → ¬cat)                 // Deployment safe

CTL:
  AG ¬cat                             // Always safe (all paths)
  EG ¬cat                             // Can stay safe forever

PCTL:
  P≤0.05[F cat]                       // Low catastrophe risk
  P≥0.99[G ¬cat]                      // High confidence safety

TCTL:
  AG^{≤24} ¬cat                       // Safe for 6 years
```

### Liveness Properties

```
LTL:
  F aligned                           // Eventually aligned
  F (race ∨ slowdown)                 // Eventually decide

CTL:
  AF aligned                          // Alignment inevitable
  EF aligned                          // Alignment possible

PCTL:
  P≥0.9[F aligned]                    // Likely alignment
  P≥0.95[F≤20 aligned]                // Timely alignment

TCTL:
  AF^{≤24} aligned                    // Aligned by 2030
  EF^{[16,24]} aligned                // Aligned 2028-2030
```

### Response Properties

```
LTL:
  G (signal → F slowdown)             // Signals enable slowdown
  G (theft → F (sec > prev))          // Theft improves security

CTL:
  AG (signal → EF slowdown)           // Signals make slowdown possible
  AG (highRisk → AF intervention)     // Risk forces intervention

PCTL:
  signal → P≥0.9[F≤4 slowdown]        // Likely timely response
  P≥0.95[G (signal → F slowdown)]     // Confident response

TCTL:
  AG (signal → AF^{≤2} slowdown)      // Response within 6 months
```

## Tool Support

### Model Checkers

| Tool | Logics | Model Types | Highlights |
|------|--------|-------------|------------|
| **SPIN** | LTL | Promela models | Explicit-state, fast |
| **NuSMV** | LTL, CTL | SMV models | Symbolic, BDDs |
| **PRISM** | PCTL, LTL, CSL | DTMCs, MDPs, CTMCs | Probabilistic, rewards |
| **Storm** | PCTL, LTL | DTMCs, MDPs | High-performance |
| **UPPAAL** | TCTL | Timed automata | Real-time, graphical |

### Typical Workflow

```bash
# 1. Model in tool language (PRISM example)
cat > ai2027.pm << EOF
mdp
  module AI2027
    s: [0..15] init 0;
    [deploy] s=0 -> (s'=1);
    [scale]  s=1 -> 0.15:(s'=5) + 0.85:(s'=4);
    ...
  endmodule
EOF

# 2. Properties file
cat > ai2027.props << EOF
P<=0.05 [F s=14]              // Low catastrophe risk
P>=0.95 [F s=15]              // High alignment prob
P>=0.8  [F<=20 s=15]          // Timely alignment
EOF

# 3. Verify
prism ai2027.pm ai2027.props

# 4. Results
# P(F s=14) = 0.037   ✓
# P(F s=15) = 0.924   ✓
# P(F<=20 s=15) = 0.761   ✗
```

## Learning Path

### Beginner

Start with **LTL** (simplest):
1. Read [ltl.md](ltl.md)
2. Practice writing safety/liveness properties
3. Try SPIN model checker with simple examples

### Intermediate

Add **CTL** (branching):
1. Read [ctl.md](ctl.md)
2. Understand ∃ vs ∀ quantifiers
3. Try NuSMV with branching scenarios

### Advanced

Add **probabilities** (PCTL):
1. Read [pctl.md](pctl.md)
2. Learn probability bounds
3. Try PRISM with AI2027 MDP

### Expert

Add **real-time** (TCTL):
1. Read [tctl.md](tctl.md)
2. Model deadlines and time windows
3. Try UPPAAL with timed scenarios

## References

### Foundational Papers
- Pnueli (1977). "The temporal logic of programs" (LTL)
- Clarke & Emerson (1981). "Design and synthesis using branching time" (CTL)
- Hansson & Jonsson (1994). "A logic for reasoning about time and reliability" (PCTL)
- Alur & Dill (1994). "A theory of timed automata" (TCTL)

### Textbooks
- Baier & Katoen (2008). "Principles of Model Checking"
- Clarke et al. (1999). "Model Checking"
- Huth & Ryan (2004). "Logic in Computer Science"

### Tool Documentation
- SPIN: http://spinroot.com/
- NuSMV: http://nusmv.fbk.eu/
- PRISM: http://www.prismmodelchecker.org/
- UPPAAL: http://www.uppaal.org/

## Related Documentation

- [../formal_models/](../formal_models/) - Dynamics models (LTS, MDP, CTMDP, TA)
- [../kripke_models/](../kripke_models/) - Semantic models (time-indexed Kripke)
- [../visualizer_canvas_simple/DESIGN.md](../visualizer_canvas_simple/DESIGN.md) - Current implementation

## Questions?

For questions about:
- **Specific logic**: See individual .md files
- **Models**: See ../formal_models/README.md
- **Kripke semantics**: See ../kripke_models/README.md
- **AI2027 scenarios**: See https://ai-2027.com
