# AI2027 Formal Modeling: Summary & MVP Recommendations

## TL;DR

We've built a **formal modeling stack** for AI2027 scenarios spanning:
- **4 formalisms** (LTS, MDP, CTMDP, Timed Automata)
- **4 temporal logics** (LTL, CTL, PCTL, TCTL)
- **Time-indexed Kripke structures** (the sweet spot)
- **Complete specification libraries** for AI risk analysis

**Recommendation**: Start with **Deterministic LTS**, add time and stochasticity progressively.

**Implementation**: JavaScript SPA for quick wins → Python "matrix" service for experimentation.

**👉 Detailed implementation plan**: See [MVP_IMPLEMENTATION_PLAN.md](MVP_IMPLEMENTATION_PLAN.md)

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

**See [MVP_IMPLEMENTATION_PLAN.md](MVP_IMPLEMENTATION_PLAN.md) for detailed implementation guide.**

### Phase 1: Deterministic LTS (✅ Maximum simplicity)

**Timeline**: 1 week

**What**: Plain Labeled Transition System - deterministic state machine with no probabilities

**Why start here**:
- ✅ Dead simple (just states + labeled edges)
- ✅ Immediate visualization with existing tools
- ✅ Clear semantics, easy to understand
- ✅ Fast iteration cycle
- ✅ LTL/CTL ready out of the box

**Tech Stack**: JSSM/FSL or XState + React Flow + Dagre

### Phase 2: Add Time Guards (📅 Temporal constraints)

**Timeline**: 3-5 days

**What**: Make time explicit, add temporal window constraints

**Why**: Calendar deadlines, time windows, still deterministic

**Implementation**: Extend state to `(world, t)` with guards `t ∈ [k₁, k₂]`

### Phase 3: Add Stochasticity (MDP) (📈 Realism)

**Timeline**: 2-3 weeks

**What**: Extend with transition probabilities and actions

**Why**: Realistic uncertainty, risk quantification, PCTL properties, policy optimization

**Implementation**: Python "matrix" FastAPI service (stormpy, pyModelChecking)

### Phase 4 (Optional): Continuous Time (CTMDP) (🔬 High fidelity)

**Timeline**: 3-4 weeks

**Only if**: Temporal dynamics critical (hazard rates, competing risks)

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

**For detailed breakdown, see [MVP_IMPLEMENTATION_PLAN.md](MVP_IMPLEMENTATION_PLAN.md)**

### Must Have (Phase 1-2)
1. Deterministic LTS (week 1)
2. Time guards (week 2)
3. LTL/CTL properties
4. Interactive visualization

### Should Have (Phase 3)
5. MDP with probabilities
6. PCTL risk bounds
7. Model checker integration (PRISM/Storm)
8. Python matrix service

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

**See [MVP_IMPLEMENTATION_PLAN.md](MVP_IMPLEMENTATION_PLAN.md) for complete implementation roadmap.**

### Immediate (Week 1)
1. Set up JavaScript FSM (JSSM/XState)
2. Define 10-15 key AI2027 states (deterministic)
3. Build React Flow visualization
4. Write 5-10 LTL/CTL properties

### Short-term (Week 2-3)
5. Add time to state (Phase 2)
6. Implement time guards
7. Basic property checker (G, F)
8. UI enhancements

### Medium-term (Month 2)
9. Python matrix service setup (FastAPI)
10. Add probabilities (MDP)
11. PCTL checking (stormpy/PRISM)
12. Simulacra integration

## Bottom Line

**Start simple, add complexity progressively**

**Phase 1 (MVP)**: Deterministic LTS + basic temporal logic
- ✅ Simple enough to build in 1 week
- ✅ Expressive enough for meaningful properties
- ✅ Visualizable with existing React Flow
- ✅ Foundation for all future extensions

**Phase 2-3 (Full)**: Time-indexed Kripke + MDP + PCTL
- ✅ Standard enough for tool support (PRISM, Storm)
- ✅ Extensible enough for future needs (POMDP, CTMDP)

**Avoid**: Jumping straight to CTMDP, timed automata, POMDPs
**Instead**: Build foundation, validate, then extend

**Estimated time**:
- **MVP (Deterministic)**: 1-2 weeks
- **With probabilities (MDP)**: 1.5 months
- **Full stack (CTMDP)**: 2-3 months

**👉 Ready to code?** See [MVP_IMPLEMENTATION_PLAN.md](MVP_IMPLEMENTATION_PLAN.md)

## References

- **This summary**: [FORMAL_MODELING_SUMMARY.md](FORMAL_MODELING_SUMMARY.md)
- **Implementation plan**: [MVP_IMPLEMENTATION_PLAN.md](MVP_IMPLEMENTATION_PLAN.md) 👈 **Start here for coding**
- **Simulacra integration**: [SIMULACRA_INTEGRATION.md](SIMULACRA_INTEGRATION.md)
- **Formal models**: [formal_models/README.md](formal_models/README.md)
- **Temporal logics**: [logics/README.md](logics/README.md)
- **Kripke structures**: [kripke_models/README.md](kripke_models/README.md)
- **Current visualizer**: [visualizer_canvas_simple/DESIGN.md](visualizer_canvas_simple/DESIGN.md)

---

**Questions?** See detailed docs in subdirectories or AI2027 research at https://ai-2027.com
