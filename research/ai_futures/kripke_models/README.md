# Kripke Models for AI2027

This directory contains formal specifications using **Kripke structures** - the foundation of model checking and temporal logic verification.

## What are Kripke Structures?

**Kripke structures** are labeled state-transition graphs used as semantic models for temporal logics (LTL, CTL, etc.). They consist of:
- States (nodes)
- Transitions (edges)
- Labeling function (which propositions are true in each state)

**Why Kripke?** Standard semantic model for:
- Model checking (SPIN, NuSMV, PRISM)
- Temporal logic verification
- Formal methods (Vardi, Clarke, Pnueli tradition)

## Time-Indexed Extension

The **time-indexed Kripke structure** extends the classical model by:

1. **Making time explicit**: State = `(world, t)` instead of just `world`
2. **Time guards on edges**: Transitions only allowed when `k₁ ≤ t ≤ k₂`
3. **Standard semantics**: LTL/CTL work unchanged

**Sweet spot**: Discrete time constraints without timed automata complexity.

## Files

### [time_indexed_kripke.md](time_indexed_kripke.md)

Complete specification of time-indexed Kripke structures:

**Contents**:
- Formal definition: K = (W, T, S, S₀, R, AP, L)
- Time guards: k₁ < t < k₂ constraints
- Semantics: LTL/CTL evaluation
- AI2027 examples
- Extensions: Probabilities, MDPs, rewards
- Implementation in JavaScript
- Model checking algorithms

**Key concepts**:
- **World states (W)**: AI2027 scenarios {S0, S1, ..., S15}
- **Time domain (T)**: Discrete steps {0, 1, 2, ..., T_max}
- **State space (S)**: W × T (world-time pairs)
- **Time windows**: I_{w,w'} ⊆ T (when edge allowed)

## Why Time-Indexed Kripke?

### Compared to Plain Kripke Structure

| Feature | Plain Kripke | Time-Indexed |
|---------|--------------|--------------|
| Time representation | Implicit | Explicit (part of state) |
| Time constraints | No | Yes (window guards) |
| State space | \|W\| | \|W\| × \|T\| |
| Deadlines | Hard to express | Natural |
| LTL/CTL semantics | Standard | Standard (unchanged!) |

### Compared to Timed Automata

| Feature | Timed Automata | Time-Indexed Kripke |
|---------|----------------|---------------------|
| Time | Real-valued clocks | Discrete integer T |
| Complexity | PSPACE (region graphs) | P (standard graphs) |
| Expressiveness | Continuous time | Discrete steps |
| Tools | UPPAAL, Kronos | Any Kripke tool |
| Learning curve | Steep | Gentle |

### Compared to MDPs

| Feature | MDP | Time-Indexed Kripke |
|---------|-----|---------------------|
| Probabilities | Native | Extension |
| Time | Implicit steps | Explicit in state |
| Time guards | Via state encoding | Native |
| Logic | PCTL | LTL/CTL (PCTL with probs) |

## Use Cases

Use time-indexed Kripke when:

✓ **Discrete time** sufficient (quarters, years, phases)
✓ **Time windows** matter ("deploy before 2026")
✓ **Deadlines** critical ("decide by Q12 or race lock-in")
✓ **Standard tools** desired (NuSMV, PRISM, SPIN)
✓ **Simple implementation** priority
✓ **Future extensions** to probabilities/rewards

## AI2027 Application Example

### Scenario: Slowdown Deadline

**Model**:
```
Worlds: {PRE_RACE, SLOWDOWN, RACE_LOCKED}
Time: T = {0, 1, ..., 24}  (quarters 2024-2030)

Edges:
  PRE_RACE → SLOWDOWN:    t ∈ [0, 12]  (choose slowdown by 2027)
  PRE_RACE → RACE_LOCKED: t ∈ [12, ∞)  (after deadline, forced race)
  SLOWDOWN → SLOWDOWN:    t ∈ [0, ∞)   (slowdown persists)
  RACE_LOCKED → RACE_LOCKED: t ∈ [0, ∞) (race irreversible)
```

**Properties**:
```
LTL:  G (signal → F slowdown)          // Signals enable slowdown
CTL:  EF slowdown                      // Slowdown achievable
      ¬AF RACE_LOCKED                  // Race not inevitable
```

**Analysis**:
- From `(PRE_RACE, 6)`: Can reach slowdown ✓
- From `(PRE_RACE, 12)`: Too late, forced to race ✗
- From `(PRE_RACE, 0)`: 12 quarters to decide

## Integration with Temporal Logics

Time-indexed Kripke structures are the **semantic models** for logics documented in `../logics/`:

```
Time-Indexed Kripke  ──semantics for──>  LTL (ltl.md)
                                     ──>  CTL (ctl.md)
                                     ──>  PCTL (pctl.md)
                                     ──>  TCTL (tctl.md)
```

**Workflow**:
1. **Model**: Build time-indexed Kripke structure
2. **Specify**: Write properties in LTL/CTL/PCTL
3. **Verify**: Use model checker (PRISM, NuSMV, SPIN)
4. **Analyze**: Examine counterexamples

## Implementation Notes

### Encoding in PRISM

```prism
mdp

module AI2027
  w: [0..15] init 0;     // World state
  t: [0..24] init 0;     // Time

  // Deploy agents (only if t ≤ 8)
  [deploy] w=0 & t<=8 -> (w'=1) & (t'=t+1);

  // Scale agents (only if 2 ≤ t ≤ 12)
  [scale] w=1 & t>=2 & t<=12 -> (w'=4) & (t'=t+1);

  // Theft (only if 6 ≤ t ≤ 16)
  [theft] w=4 & t>=6 & t<=16 -> 0.15:(w'=5) & (t'=t+1)
                              + 0.85:(w'=4) & (t'=t+1);

  // Time passes
  [tick] t<24 -> (t'=t+1);
endmodule

label "cat" = (w=14);
label "aligned" = (w=15);
```

### Encoding in NuSMV

```smv
MODULE main
VAR
  w: {S0, S1, S4, S5, S14, S15};
  t: 0..24;

ASSIGN
  init(w) := S0;
  init(t) := 0;

  next(t) := t + 1;

  next(w) := case
    w = S0 & t <= 8: {S0, S1};          -- Deploy window
    w = S1 & t >= 2 & t <= 12: {S1, S4};  -- Scale window
    w = S4 & t >= 6 & t <= 16: {S4, S5};  -- Theft window
    TRUE: w;                             -- Stay
  esac;

DEFINE
  cat := (w = S14);
  aligned := (w = S15);

LTLSPEC G !cat
CTLSPEC EF aligned
```

## Extensions

### Add Probabilities (→ DTMC)

Replace nondeterministic R with probability P(s, s'):

```javascript
K.addProbabilisticEdge('S4', 'S5', [6, 16], 0.15)  // 15% theft
K.addProbabilisticEdge('S4', 'S4', [6, 16], 0.85)  // 85% no theft
```

Now use PCTL: `P_≤0.05[F cat]`

### Add Actions (→ MDP)

Add action parameter to edges:

```javascript
K.addEdge('S4', 'S5', [6, 16], {action: 'NO_OP'})
K.addEdge('S4', 'S4', [6, 16], {action: 'INVEST_SECURITY', probTheft: 0.05})
```

Now synthesize optimal policy.

### Add Variables (→ Hybrid)

Extend state to `(w, t, v)`:

```javascript
state = {w: 'S4', t: 8, vars: {compute: 1.2, sec: 2.0, ...}}

K.addEdge('S4', 'S5', [6, 16], {
  guard: (s) => s.vars.sec < 2.5,  // Only if security low
  effect: (s) => ({...s.vars, sec: s.vars.sec - 0.5})
})
```

## Comparison with Other Formalisms

### Relation to Formal Models (../formal_models/)

| Formalism | Time | Probabilistic | Kripke-Based? |
|-----------|------|---------------|---------------|
| **LTS** (current_lts_model.md) | Implicit | No | Kripke without time |
| **Mealy+MDP** (mealy_mdp_model.md) | Discrete | Yes | Kripke + probabilities |
| **CTMDP** (ctmdp_model.md) | Continuous | Yes | Continuous-time Kripke |
| **Timed Automata** (timed_automata_model.md) | Real clocks | No | Kripke + clock zones |
| **Time-Indexed Kripke** | Discrete (explicit) | Extension | Pure Kripke + time |

**Time-indexed Kripke** is the bridge between LTS and MDPs/timed systems.

## Further Reading

### Internal References
- [../formal_models/](../formal_models/) - Dynamics models (LTS, MDP, CTMDP)
- [../logics/](../logics/) - Temporal logics (LTL, CTL, PCTL, TCTL)
- [../visualizer_canvas_simple/DESIGN.md](../visualizer_canvas_simple/DESIGN.md) - Current implementation

### External References
- Kripke (1963). "Semantical analysis of modal logic"
- Clarke, Grumberg, & Peled (1999). "Model Checking"
- Baier & Katoen (2008). "Principles of Model Checking"
- Vardi & Wolper (1986). "Automata-theoretic approach to temporal logic"

## Tooling

**Model checkers accepting Kripke structures**:
- **PRISM**: Probabilistic model checker (PCTL, LTL)
- **NuSMV**: Symbolic model checker (CTL, LTL)
- **SPIN**: Explicit-state model checker (LTL)
- **UPPAAL**: Timed automata verifier (can encode time-indexed)
- **MRMC**: Markov reward model checker

## Questions?

For questions about:
- **Temporal logics**: See `../logics/README.md`
- **Dynamics models**: See `../formal_models/README.md`
- **AI2027 scenarios**: See AI2027 documentation at https://ai-2027.com
- **Implementation**: See `time_indexed_kripke.md` examples
