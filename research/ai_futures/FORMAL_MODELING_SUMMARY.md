# AI2027 Formal Modeling: Summary & MVP Recommendations

## TL;DR

We've built a **formal modeling stack** for AI2027 scenarios spanning:
- **4 formalisms** (LTS, MDP, CTMDP, Timed Automata)
- **4 temporal logics** (LTL, CTL, PCTL, TCTL)
- **Time-indexed Kripke structures** (the sweet spot)
- **Complete specification libraries** for AI risk analysis

**Recommendation**: Start with **Time-Indexed Kripke + Basic MDP**, progressively add complexity.

## The Stack

```
┌─────────────────────────────────────────────────────────┐
│ SPECIFICATION LAYER (What properties do we want?)       │
│ LTL, CTL, PCTL, TCTL                                   │
│ "G ¬cat", "P≤0.05[F cat]", "AF^{≤12} decide"           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ SEMANTIC MODEL (What do paths/states mean?)            │
│ Time-Indexed Kripke Structure                          │
│ S = W × T, transitions with k₁ < t < k₂ guards        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ DYNAMICS MODEL (How does world evolve?)                │
│ LTS → MDP → CTMDP → Timed Automata                    │
│ (deterministic → stochastic → continuous → real-time)  │
└─────────────────────────────────────────────────────────┘
```

## Quick Decision Guide

### What formalism?

**Need probabilities?**
- ✅ → MDP + PCTL
- ❌ → LTS or Kripke + LTL/CTL

**Need continuous time?**
- ✅ → CTMDP + CSL
- ❌ → Discrete-time MDP

**Need hard deadlines?**
- ✅ → Timed Automata + TCTL
- ❌ → Time-indexed Kripke

**Need partial observability?**
- ✅ → POMDP + belief-state logic
- ❌ → Standard MDP

### What logic?

**Single path or branching?**
- Single → LTL
- Branching → CTL

**Qualitative or quantitative?**
- Qualitative → LTL/CTL
- Quantitative → PCTL

**Discrete or real time?**
- Discrete → LTL/CTL/PCTL
- Real → TCTL/MTL

## MVP Recommendation

### Phase 1: Time-Indexed Kripke (✅ Quick wins)

**What**: Discrete-time Kripke structure with time guards

```
State: s = (world_state, time_step)
       = (S4, 8)  "Scaled agents at quarter 8"

Edges: S4 → S5 with guard t ∈ [6, 16]
       "Theft only possible quarters 6-16"
```

**Why**:
- ✅ Simple (just add time to state)
- ✅ Standard LTL/CTL work unchanged
- ✅ Time windows naturally expressed
- ✅ Easy to implement
- ✅ Tool-friendly (PRISM, NuSMV, SPIN)

**Deliverables**:
1. Model AI2027 as Kripke structure
2. Add time component to states
3. Define time windows on edges
4. Write LTL/CTL properties
5. Verify with model checker

**Effort**: 1-2 weeks for working prototype

### Phase 2: Add Stochasticity (MDP) (📈 Realism)

**What**: Extend with probabilities

```
P(S4 → S5 | NO_OP) = 0.15  (15% theft per quarter)
P(S4 → S6 | NO_OP) = 0.10  (10% controls)
P(S4 → S4 | NO_OP) = 0.75  (75% nothing)
```

**Why**:
- ✅ Realistic uncertainty
- ✅ Risk quantification
- ✅ PCTL properties
- ✅ Policy optimization possible

**Deliverables**:
1. Calibrate transition probabilities
2. Add PCTL specifications
3. Compute P(F catastrophe)
4. Sensitivity analysis

**Effort**: 2-3 weeks (includes calibration)

### Phase 3: Add Mealy Outputs (🎨 UX)

**What**: Edge labels for narrative

```
G(s, a, e, s') = {
  narrative: "APT successfully stole model weights.",
  events: [{type: "THEFT", quarter: 8}],
  metrics: {compute: 1.2, sec: 1.5, ...}
}
```

**Why**:
- ✅ Rich UI feedback
- ✅ Interpretable transitions
- ✅ Event logging
- ✅ Story generation

**Deliverables**:
1. Define output function
2. Generate narratives
3. Event visualization
4. Metric deltas display

**Effort**: 1 week

### Phase 4 (Optional): Continuous Time (CTMDP) (🔬 High fidelity)

**Only if** temporal dynamics critical:
- Hazard rates (exponential waiting times)
- "What happens if we wait 6 months?"
- Competing risks

**Effort**: 3-4 weeks (complex math, Gillespie algorithm)

## Key Insights

### 1. MDP is the Core, Mealy is Cosmetic

**Confusion**: "Do I use Mealy machine or MDP?"

**Answer**: **MDP is the dynamics model**, Mealy outputs are labels.
- State updates in MDP: `s' ~ P(· | s, a)`
- Side-effects = state changes (already in MDP!)
- Output function `G(s, a, s')` = interpretive layer for UI

**Don't** build separate Mealy formalism - just add `G` to MDP.

### 2. Time Guards Without Timed Automata

**Insight**: Time-indexed Kripke gives you time windows **without** clock machinery.

**How**: Make time part of state `(w, t)`, guard edges with `t ∈ [k₁, k₂]`

**Result**: Standard Kripke + time constraints, no region graphs!

### 3. Progressive Complexity

**Start simple**: Deterministic Kripke
**Add probabilities**: → MDP + PCTL
**Add real time**: → CTMDP (only if needed)
**Add partial observability**: → POMDP (for epistemic analysis)

Each step is an **extension**, not rewrite.

## Implementation Priorities

### Must Have (Phase 1-2)
1. Time-indexed Kripke structure
2. Basic MDP with probabilities
3. LTL/CTL properties
4. Model checker integration (PRISM)

### Should Have (Phase 3)
5. Mealy-style outputs
6. PCTL risk bounds
7. Narrative generation
8. Interactive visualization

### Could Have (Phase 4+)
9. CTMDP continuous time
10. POMDP partial observability
11. Timed automata verification
12. Multi-agent game theory

## Tool Recommendations

| Phase | Tool | Purpose |
|-------|------|---------|
| 1 | NuSMV | LTL/CTL model checking |
| 2 | PRISM | PCTL, MDPs, probabilities |
| 3 | Custom | Narrative generation |
| 4 | Storm/UPPAAL | CTMDP or timed verification |

## Resources Created

### Documentation
- `formal_models/` - 4 dynamics models (1,855 lines)
- `logics/` - 4 temporal logics (3,443 lines)
- `kripke_models/` - Time-indexed Kripke (2,200 lines)

### Total: ~7,500 lines of formal specifications

## Success Metrics

**MVP success** if we can answer:
1. "Can catastrophe be avoided?" → CTL: `EF ¬cat`
2. "What's probability of catastrophe?" → PCTL: `P(F cat)`
3. "Must we decide by 2027?" → Time guard: `t ∈ [0, 12]`
4. "What if theft occurs early?" → MDP trajectories

## Next Steps

### Immediate (Week 1-2)
1. Build time-indexed Kripke in PRISM
2. Define 10-15 key AI2027 states
3. Write 5-10 core properties (safety, liveness)
4. Run model checker

### Short-term (Week 3-6)
5. Calibrate probabilities (expert elicitation)
6. Add PCTL risk bounds
7. Sensitivity analysis
8. Documentation + examples

### Medium-term (Month 2-3)
9. Narrative generation (Mealy outputs)
10. Interactive UI with property checking
11. Integration with existing visualizer
12. User study / validation

## Bottom Line

**The sweet spot**: Time-indexed Kripke + MDP + PCTL

- **Simple enough** to implement quickly
- **Expressive enough** for meaningful analysis
- **Standard enough** for tool support
- **Extensible enough** for future needs

**Avoid**: Jumping straight to CTMDP, timed automata, POMDPs
**Instead**: Build foundation, add complexity incrementally

**Estimated time to MVP**: 4-6 weeks full-time

## References

- This summary: `/research/ai_futures/FORMAL_MODELING_SUMMARY.md`
- Full docs: `/research/ai_futures/{formal_models,logics,kripke_models}/`
- Implementation: `/research/ai_futures/visualizer_canvas_simple/`

---

**Questions?** See detailed docs in subdirectories or AI2027 research at https://ai-2027.com
