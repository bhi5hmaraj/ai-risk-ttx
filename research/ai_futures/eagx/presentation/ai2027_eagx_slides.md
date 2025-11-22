---
marp: true
theme: default
paginate: true
header: 'AI2027 Formal Models - EAGX 2025'
footer: 'From Narratives to Mathematics | github.com/[your-org]/ai-risk-ttx'
style: |
  section {
    background-color: #fafafa;
  }
  h1 {
    color: #2c3e50;
  }
  .columns {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
---

# AI2027 Formal Models
## From Narratives to Mathematics

**A Rigorous Analysis of AI Risk Timelines Using Formal Methods**

EAGX 2025

---

## The Problem

**Typical AI risk discourse:**
> "ASI will arrive soon and might be misaligned"

**Questions we can't answer:**
- How soon? (months? years? decades?)
- How likely is misalignment? (10%? 50%? 90%?)
- What assumptions underlie this?
- What interventions help? (by how much?)

**Result:** Hand-wavy arguments, hard to verify, difficult to act on

---

## Formal Methods Answer

<div class="columns">
<div>

### Precise Timeline
- P(ASI by 2027) = **0.5 ± 0.2**
- Based on compute scaling + algorithmic progress

### Risk Quantification
- P(catastrophe | ASI by 2027) = **0.5 ± 0.3**
- Catastrophe = misaligned ASI takeover

</div>
<div>

### Assumption Tracking
- **12 key assumptions**
- **3 contested** (esp. slowdown political will)
- **2 weak** (recursive self-improvement)

### Intervention Effects
- **Slowdown**: catastrophe risk 0.7 → 0.3
- **Security**: espionage risk 0.5 → 0.2
- **Alignment**: success rate 0.3 → 0.5

</div>
</div>

---

## What is a Hybrid Automaton?

**Combines discrete modes + continuous dynamics**

### Discrete Modes (Governance Regimes)
- Baseline (current development)
- Race (US-China competition)
- Slowdown (pause, oversight)
- Espionage (model weights stolen)
- Catastrophe (misaligned ASI)
- Aligned (safe ASI)

### Continuous Variables (evolve via ODEs)
- `compute(t)`: AI compute (log10 FLOP)
- `alignment(t)`: Alignment capacity [0-1]
- `trust(t)`: Public/regulatory trust [0-1]
- `security(t)`: Model weight security [0-1]

---

## AI2027 as Hybrid Automaton

```
┌──────────┐  compute ≥ 26.5   ┌──────┐  trust < 0.4    ┌──────────┐
│ Baseline │──────────────────→│ Race │────────────────→│ Slowdown │
└──────────┘                   └──────┘                 └──────────┘
      │                            │                          │
      │ security < 0.3             │ alignment_gap > 8       │ alignment ≥ 0.85
      ↓                            ↓                          ↓
┌──────────┐                  ┌─────────────┐          ┌──────────────┐
│Espionage │─────────────────→│ Catastrophe │          │ Aligned ASI  │
└──────────┘  alignment_gap>6  └─────────────┘          └──────────────┘
```

**Guards:** Conditions that trigger transitions
**Flows:** ODEs governing continuous evolution

---

## Flow Equations: Race vs Slowdown

<div class="columns">
<div>

### Race Mode
```python
dcompute/dt = 1.5 * compute
# Aggressive scaling

dalignment/dt = 0.05 * (1 - alignment)
# Minimal safety work

dtrust/dt = -0.05 * trust
# Public concern grows

dsecurity/dt = -0.1 * (compute - 26)
# Harder to secure
```

</div>
<div>

### Slowdown Mode
```python
dcompute/dt = 0.3 * compute
# Slower scaling

dalignment/dt = 0.3 * (1 - alignment)
# Focused safety research

dtrust/dt = 0.1 * (1 - trust)
# Rebuild confidence

dsecurity/dt = 0.2 * (1 - security)
# Security investment
```

</div>
</div>

**Key insight:** Different modes → different dynamics

---

## Live Demo 1: Single Trajectory

**Running:** `01_hybrid_automaton_simulator.py`

**What we'll see:**
1. Start in **Baseline** (2024)
2. Compute scaling → **Race** mode
3. Security degrades → **Espionage**
4. Alignment gap grows → **Catastrophe**

**Key metric: Alignment Gap**
```
alignment_gap = (compute - 24) - 10 × alignment
```
- \> 8 = danger zone
- \> 10 = likely catastrophe

---

## Epistemic Rigor: Assumptions Matter

### Weakest Assumptions (from AI2027)

| Assumption | Confidence | Status |
|------------|------------|--------|
| Recursive self-improvement (FOOM) | **0.15** | 🔴 Very speculative |
| Slowdown political will | **0.25** | 🔴 Contested |
| Security breach risk | **0.65** | 🟢 Well-grounded |
| Compute scaling continues | **0.80** | 🟢 Strong evidence |

**Average epistemic confidence: 0.44** (moderate)

**Question:** If slowdown assumption is wrong, what happens to conclusions?

---

## Monte Carlo: Quantifying Uncertainty

**1000 simulations** with stochastic transitions

### Results
- **P(catastrophe) = 0.50** (50%)
- **P(aligned) = 0.30** (30%)
- **P(other) = 0.20** (still in race, etc.)

### Interpretation
- **50% catastrophe risk** >> 5% acceptable threshold
- **Critical parameter:** P(slowdown | trust collapse) = 0.35
  - Increasing to 0.60 reduces catastrophe risk to ~20%

---

## Sensitivity Analysis

**What matters most?**

### P(Slowdown) Impact
```
P(slowdown | trust) = 0.10 → P(catastrophe) = 0.68
P(slowdown | trust) = 0.35 → P(catastrophe) = 0.50 (baseline)
P(slowdown | trust) = 0.60 → P(catastrophe) = 0.22
P(slowdown | trust) = 0.80 → P(catastrophe) = 0.08
```

**Policy implication:** Political will for slowdown is **CRITICAL**

---

## Property Checking

### LTL/CTL (Qualitative)
- ✅ `AF (aligned ∨ catastrophe)` - Eventually reach terminal state
- ❌ `G ¬catastrophe` - Never catastrophe (VIOLATED!)
- ✅ `G_{t≤12} ¬catastrophe` - Safe through 2025

### PCTL (Probabilistic)
- ❌ `P≤0.05[F catastrophe]` - ≤5% catastrophe risk
  - **Actual: 50%** (VIOLATED)
- ❌ `P≥0.50[F aligned]` - ≥50% alignment success
  - **Actual: 30%** (VIOLATED)

**Verdict:** Under AI2027 assumptions, **unacceptable risk**

---

## Policy Interventions Compared

| Intervention | Effect | Cost / Challenge |
|--------------|--------|------------------|
| **Slowdown** | P(catastrophe): 0.7 → 0.3 | China may not follow |
| **Security** | P(espionage): 0.5 → 0.2 | Determined adversary hard to stop |
| **Alignment** | Capacity: 0.15 → 0.50 | Diverts compute from capabilities |

### Trade-offs
- **Race dynamics:** US slows → China catches up → pressure to resume
- **Security vs openness:** Secure models → less research feedback
- **Alignment vs capabilities:** Safety work → delayed deployment

---

## Recommendations (from Model)

### 1. Increase Slowdown Probability ⬆
**From:** 35% chance of pause given evidence
**To:** 60%+ to get P(catastrophe) < 10%
**How:** Prenegotiated triggers, international coordination

### 2. Triple Alignment Research 🔬
**From:** 0.15 alignment capacity
**To:** 0.50 by time of slowdown
**How:** Compute allocation, talent pipeline, research agenda

### 3. Strengthen Model Security 🔒
**From:** 50% baseline, degrades in race
**To:** 80% maintained
**How:** Mandatory security standards, weight protection

---

## FAQ

**Q: Isn't this too simplified?**
**A:** Yes! But useful. Models make assumptions explicit, enable systematic comparison. Use alongside qualitative analysis.

**Q: What if AI2027 is wrong?**
**A:** We track epistemic confidence. Contested assumptions are flagged. Model explores "if X, then Y".

**Q: Can policymakers use this?**
**A:** Cautiously yes. Models quantify trade-offs, but need context (political feasibility, enforcement).

**Q: Why hybrid automata vs MDPs?**
**A:** HA gives both discrete governance + continuous dynamics + formal verification.

---

## What You Can Do

### Use the Tools 🛠
- Visualizer and scripts are **open-source**
- Run your own scenarios, test assumptions
- github.com/[your-org]/ai-risk-ttx/research/ai_futures/eagx

### Critique the Model 🔍
- Where are we wrong? What's missing?
- Challenge the assumptions (especially contested ones)
- Propose alternative formulations

### Collaborate 🤝
- **Researchers:** Formal verification papers
- **Engineers:** Better model checkers, visualizers
- **Policy experts:** Apply to regulation, compute governance
- **Funders:** Full buildout needs resources

---

## Summary

<div class="columns">
<div>

### What We Built
- ✅ **Hybrid automaton** framework
- ✅ **Monte Carlo** uncertainty quantification
- ✅ **Property checking** (LTL/CTL/PCTL)
- ✅ **Assumption tracking** with confidence scores

### Key Findings
- ❌ P(catastrophe) = **50%** (too high!)
- ⚠️ Slowdown political will is **critical**
- 📊 Sensitivity analysis shows leverage points

</div>
<div>

### Contributions
- **Formalized AI2027** scenario
- **Quantified** risks and uncertainties
- **Identified** key assumptions
- **Compared** interventions systematically

### Next Steps
- Validate with domain experts
- Extend to other scenarios
- Integrate with policy tools
- Publish research findings

</div>
</div>

---

## Contact & Resources

**Repository:** github.com/[your-org]/ai-risk-ttx
**Demo Code:** research/ai_futures/eagx/demo_scripts/
**Visualizer:** research/ai_futures/visualizer/

**Feedback:** Submit issues or email directly

**Learn More:**
- AI2027: https://ai-2027.com
- Formal Methods: PRISM, Storm, NuSMV model checkers
- Hybrid Automata: See research/hybrid_automata/README.md

---

# Thank You!

## Questions?

**Formal rigor for AI risk analysis.**
**Open-source tools for the safety community.**

---

<!-- This presentation uses Marp: https://marp.app -->
