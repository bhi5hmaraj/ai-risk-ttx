# Simulacra + Formal Methods Integration

**Bridging LLM-driven narrative gameplay with hybrid automata and formal verification**

**Status**: Design proposal | Last updated: 2025-11-18

---

## What This Is

This folder contains the **complete integration plan** for adding formal methods (hybrid automata, temporal logic, probabilistic model checking) to the Simulacra TTX game.

**Goal**: Keep the engaging LLM narrative while adding:
- Real-time risk quantification ("P(catastrophe): 15%")
- Formal property checking ("⚠️ Deployed without sufficient alignment")
- Counterfactual analysis ("If you had paused: P(success) +23%")
- Optimal policy suggestions ("Model recommends: coordinate slowdown")

**Philosophy**: Don't replace the narrative—enhance it with rigor!

---

## Why Add Formal Methods to a Narrative Game?

### Current Simulacra
- ✅ Rich emergent narratives (LLM-generated)
- ✅ Natural language interactions
- ✅ Flexible, creative scenarios
- ❌ No quantitative risk tracking
- ❌ No formal guarantees of consistency
- ❌ Hard to extract general lessons

### Enhanced Simulacra
- ✅ Everything from current version
- ✅ Real-time formal state tracking (compute, alignment, trust)
- ✅ Governance mode detection (Race, Slowdown, Pause)
- ✅ Temporal logic property checking
- ✅ Probabilistic risk analysis
- ✅ Educational about formal verification

**Result**: Best of both worlds—**rich** narratives + **rigorous** verification

---

## Integration Levels

We propose **four progressive levels** of integration:

| Level | Name | Effort | Value | Description |
|-------|------|--------|-------|-------------|
| **0** | None (current) | 0 | Baseline | Pure LLM, no formal tracking |
| **1** | State Tracking | 1 week | High | Track compute, alignment, trust in real-time |
| **2** | Mode Detection | 2-3 weeks | High | Detect governance regimes (Race/Slowdown/Pause) |
| **3** | Property Checking | 4-6 weeks | Medium | Check temporal logic formulas |
| **4** | Probabilistic Analysis | 2-3 months | Medium | Full MDP, P(catastrophe), optimal policies |

**Recommended path**: Start with Level 1 → add Level 2 → experiment with Level 3 → consider Level 4 based on player interest

See [Implementation Levels](levels.md) for detailed code examples.

---

## Quick Navigation

### 📐 Architecture & Design
- **[Architecture](architecture.md)**: Current vs enhanced stack, integration patterns
- **[Implementation Levels](levels.md)**: Detailed specs for Levels 1-4 with TypeScript code
- **[UI Components](ui_components.md)**: Component designs and progressive disclosure

### 🤖 LLM Integration
- **[LLM Strategies](llm_strategies.md)**: How to combine formal analysis with LLM prompts
  - Parallel (loose coupling)
  - Guided (tight coupling)
  - Validation (post-hoc checking)

### 🎮 Practical Examples
- **[Example Round](example_round.md)**: Complete walkthrough of formal processing during gameplay
- **[Implementation Roadmap](roadmap.md)**: Week-by-week plan with milestones

### 🔧 Technical Details
- **[Technical Choices](technical_choices.md)**: TypeScript vs Python backend, tooling options

---

## Example: What Players See

### Casual Player (Level 1)
```
┌─────────────────────────────────────┐
│ Round 8: Critical Decision          │
│ [LLM-generated narrative...]        │
└─────────────────────────────────────┘

📊 Quick Stats
Trust: 45% | Alignment: 62% | Risk: 6.2
```

### Engaged Player (Level 2)
```
📊 Quick Stats
Trust: 45% | Alignment: 62% | Risk: 6.2

▼ Formal Analysis (expanded)
Mode: REGULATION_WINDOW (Round 2)
  ✓ Trust above threshold
  ✗ Alignment lagging compute
  ⚠️ If no action, will enter CRISIS mode
```

### Power User (Level 4)
```
📊 Full Risk Analysis
P(Catastrophe): 18.3%
P(Aligned AGI): 41.2%

Counterfactual: "What if we had paused?"
  P(Catastrophe): 12.1% (vs current 18.3%)
  P(Success): 52.7% (vs current 41.2%)

Model Recommendation: COORDINATE_SLOWDOWN
  Reasoning: Current alignment gap critical...
```

---

## Key Principles

1. **Progressive Disclosure**: Casual players see basics, power users see everything
2. **Non-Intrusive**: Formal layer enhances, doesn't interrupt narrative
3. **Educational**: Learn temporal logic and formal methods by playing
4. **Consistent**: LLM narrative respects formal constraints
5. **Actionable**: Metrics lead to better strategy, not just numbers

---

## What Makes This Different

Traditional approaches:
- Either pure narrative (no rigor) OR pure formal (no engagement)
- Formal methods seen as "post-game analysis" only

Our approach:
- **Real-time integration**: Formal properties checked during gameplay
- **Hybrid coupling**: LLM generates narrative, formal model ensures consistency
- **Educational gaming**: Learn verification concepts through play
- **Bidirectional**: Formal analysis can guide LLM prompts

---

## Connection to Hybrid Automata Framework

This integration builds directly on the [hybrid automata framework](../ai_futures/hybrid_automata/):

```
Hybrid Automaton Framework (ai_futures/hybrid_automata/)
         ↓
    Formal Backbone
    (modes, flows, guards, properties)
         ↓
    Integration Layer (this folder)
         ↓
    Simulacra TTX Game
    (React + TypeScript + LLM)
```

The hybrid automaton serves as the **formal spine** that:
- Tracks continuous variables (SD layer)
- Detects mode transitions (discrete dynamics)
- Checks temporal logic properties (FM-Logic)
- Guides agent interactions (ABM layer)

See [AI-2027 Hybrid Automaton](../ai_futures/hybrid_automata/examples/04_ai_governance.md) for the formal specification this implements.

---

## Success Metrics

### Player Engagement
- Time spent viewing formal analysis
- Use of counterfactual "what-if" feature
- Strategy improvement over repeated plays

### Educational Impact
- Pre/post understanding of temporal logic
- Ability to predict mode transitions
- Grasp of probabilistic risk reasoning

### Technical Quality
- LLM consistency (% generations passing validation)
- Formal model performance (< 100ms per round)
- Property coverage (all critical properties checked)

---

## Getting Started

**For implementers**: Start with [Implementation Levels](levels.md) → Level 1

**For designers**: Read [UI Components](ui_components.md) for UX patterns

**For researchers**: See [Example Round](example_round.md) for detailed mechanics

**For LLM engineers**: Check [LLM Strategies](llm_strategies.md) for prompt design

---

## Status & Next Steps

**Current status**: Design complete, ready for prototyping

**Recommended next steps**:
1. Prototype Level 1 in a feature branch
2. User test with small group
3. Iterate based on feedback
4. Add Level 2 once Level 1 is solid
5. Evaluate Level 3/4 based on player interest

See [Implementation Roadmap](roadmap.md) for detailed timeline.

---

## Related Documentation

- [Hybrid Automata Framework](../ai_futures/hybrid_automata/README.md) - Theoretical foundation
- [AI-2027 Formal Model](../ai_futures/hybrid_automata/examples/04_ai_governance.md) - Complete specification
- [Simulacra Game](../../) - Current TTX implementation
- [ELI Explainers](../ai_futures/eli/) - Teaching formal concepts at multiple levels

---

**Questions?** See individual documents for details, or check the main [AI Futures README](../ai_futures/README.md).
