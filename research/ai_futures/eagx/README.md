# AI2027 Formal Models - EAGX Demo

**A Rigorous Analysis of AI Risk Timelines Using Formal Methods**

> *"From narratives to mathematics: Can we prove safety properties about AI futures?"*

## Overview

This EAGX demonstration showcases formal modeling approaches for AI risk scenarios, complementing the narrative-driven Simulacra TTX game with mathematical rigor. We use **hybrid automata** to model discrete governance regimes combined with continuous dynamics (compute scaling, alignment capacity, security level).

**Target Audience:** EAGX attendees from AI safety, EA research, policy, and technical backgrounds

**Duration:** 60-90 minutes

**Format:** Presentation + Interactive Demo

---

## Why Formal Models for AI Risk?

### The Challenge

AI risk scenarios involve:
- **Complex dynamics**: Compute scaling, algorithmic progress, geopolitical competition
- **Regime shifts**: Normal development → Race → Slowdown/Catastrophe
- **Uncertainty**: Probabilistic transitions, contested assumptions
- **Critical decisions**: When to regulate? How much safety investment?
- **Verifiable properties**: "Can we guarantee safety?" vs "Will we likely be safe?"

### The Opportunity

Formal methods provide:
1. **Precise specification** of scenarios and assumptions
2. **Mathematical guarantees** via model checking ("Prove: catastrophe probability < 5%")
3. **Quantitative comparison** of policy interventions
4. **Assumption tracking** with epistemic confidence scores
5. **Reproducible analysis** (vs hand-wavy arguments)

---

## Model Architecture

### Hybrid Automaton Framework

```
┌─────────────────────────────────────────────────────────────┐
│                    AI2027 SCENARIO AS HA                    │
│                                                             │
│  Discrete Modes (Governance Regimes):                      │
│  ┌──────────┐  ┌──────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Baseline │→ │ Race │→ │ Slowdown │→ │ Aligned ASI  │  │
│  └──────────┘  └──────┘  └──────────┘  └──────────────┘  │
│       ↓                       ↓                            │
│  ┌──────────────┐      ┌─────────────┐                    │
│  │ Espionage    │      │ Catastrophe │                    │
│  └──────────────┘      └─────────────┘                    │
│                                                             │
│  Continuous Variables (evolve via ODEs):                   │
│  - compute(t): Log10(FLOP) [24 → 28]                      │
│  - alignment(t): Alignment capacity [0 → 1]               │
│  - trust(t): Public/regulatory trust [0 → 1]              │
│  - security(t): Model weight security [0 → 1]             │
│                                                             │
│  Transitions (with guards and epistemic scores):           │
│  - Baseline → Race: compute ≥ 26 ∧ evidence_count ≥ 2     │
│    Epistemic confidence: 0.65                              │
│  - Race → Slowdown: trust < 0.4 ∧ political_will          │
│    Epistemic confidence: 0.35 (contested!)                 │
│  - Race → Catastrophe: alignment_gap > 8 ∧ deployment     │
│    Epistemic confidence: 0.50                              │
└─────────────────────────────────────────────────────────────┘
```

### Why Hybrid Automata?

**Discrete modes** capture governance regimes:
- Baseline (current slow progress)
- Race (US-China competition, safety shortcuts)
- Slowdown (pause, oversight, alignment research)
- Espionage (China steals weights)
- Catastrophe (misaligned ASI takeover)
- Aligned (committee-controlled ASI)

**Continuous dynamics** capture key variables:
- **Compute**: Exponential scaling (3.4x/year per AI2027)
- **Alignment**: Research progress (faster in Slowdown mode)
- **Trust**: Public/regulatory confidence (erodes in Race)
- **Security**: Decreases with model size, improves with investment

**ODEs per mode**:
```python
# Race mode flows
dcompute/dt = 1.5 * compute          # Aggressive scaling
dalignment/dt = 0.05 * (1 - alignment)  # Minimal safety work
dtrust/dt = -0.05 * trust            # Public concern grows
dsecurity/dt = -0.1 * (compute - 26) # Harder to secure

# Slowdown mode flows
dcompute/dt = 0.3 * compute          # Slower scaling
dalignment/dt = 0.3 * (1 - alignment)  # Focused safety research
dtrust/dt = 0.1 * (1 - trust)        # Rebuild confidence
dsecurity/dt = 0.2 * (1 - security)  # Invest in security
```

---

## Demo Components

### 1. Interactive Visualizer (React + React Flow)

**What it shows:**
- State machine graph with current state highlighted
- Time-series plots of continuous variables
- Epistemic confidence color-coding (green = strong, red = contested)
- User can trigger transitions, explore counterfactuals

**Live during demo:**
- Start in Baseline mode (2024)
- Watch compute scale exponentially
- Trigger Race mode when threshold met
- Show branching point: Slowdown vs Catastrophe
- Compare outcomes

**Location:** `research/ai_futures/visualizer/`

### 2. Assumption Analysis (Python Scripts)

**What it shows:**
- All assumptions underlying AI2027 scenario
- Epistemic confidence scores (-1 to 1)
- Citations from research
- Contested assumptions flagged

**Key findings:**
- Average confidence: 0.44 (moderate)
- Contested links: 3/8 (significant disagreement)
- Weakest assumptions: Recursive self-improvement (0.15), Slowdown political will (0.25)

**Location:** `research/ai_futures/scripts/visualize_dag.py`

### 3. Formal Properties (Temporal Logic)

**Questions we can answer:**

**Safety properties (LTL/CTL):**
- `G ¬catastrophe` - "Never catastrophe" (unprovable! counterexample exists)
- `AF (aligned ∨ catastrophe)` - "Eventually reach end state" (true)
- `G (race → F (slowdown ∨ catastrophe))` - "Race always resolves" (true)

**Probabilistic properties (PCTL):**
- `P≤0.05[F catastrophe]` - "≤5% catastrophe risk" (FALSE: P ≈ 0.5 per AI2027)
- `P=?[F aligned]` - "Probability of alignment success" (≈0.3 baseline)
- `P=?[F catastrophe | race]` - "Catastrophe given race" (≈0.7)

**Time-bounded properties:**
- `F_{t≤36} superintelligence` - "ASI by 2027" (P ≈ 0.5)
- `G_{t≤12} (alignment_gap < 5)` - "Safe through 2025" (likely true)

---

## EAGX Presentation Structure

### Part 1: Motivation (10 min)

**Problem:** AI risk discourse is often qualitative, hand-wavy, hard to verify

**Example:** "ASI will arrive soon and might be misaligned"
- How soon? (months? years? decades?)
- How likely is misalignment? (10%? 50%? 90%?)
- What assumptions underlie this? (can we check them?)
- What interventions help? (by how much?)

**Formal models answer:**
- Precise timeline: P(ASI by 2027) = 0.5 ± 0.2
- Risk quantification: P(catastrophe | ASI by 2027) = 0.5 ± 0.3
- Assumption tracking: 12 key assumptions, 3 contested, 2 weak
- Intervention effects: Slowdown reduces catastrophe risk 0.7 → 0.3

### Part 2: Model Walkthrough (20 min)

**AI2027 as Hybrid Automaton:**
1. Show state machine diagram
2. Explain discrete modes (Baseline, Race, Slowdown, etc.)
3. Explain continuous variables (compute, alignment, trust, security)
4. Show flow equations per mode
5. Demonstrate transitions with guards

**Live Demo:**
- Run visualizer
- Start in Baseline (2024)
- Trigger compute scaling → Race mode
- Show branching: Slowdown vs Catastrophe
- Compare trajectories

### Part 3: Epistemic Rigor (15 min)

**Assumption Analysis:**
- Show full assumption list (from visualize_dag.py)
- Highlight contested assumptions:
  - Recursive self-improvement (conf: 0.15) - VERY speculative
  - Slowdown political will (conf: 0.25) - Unlikely given race dynamics
  - Security vulnerability (conf: 0.65) - Well-grounded
- Discuss: How do weak assumptions affect conclusions?

**Property Checking:**
- Show temporal logic specs
- Run model checker (demo: NuSMV or PRISM)
- Interpret results: "Can we guarantee safety?" → NO
- Quantify: "How likely is catastrophe?" → P ≈ 0.5 ± 0.3

### Part 4: Policy Implications (15 min)

**Interventions Modeled:**
1. **Slowdown** (pause, oversight)
   - Effect: Catastrophe risk 0.7 → 0.3
   - Cost: Delayed benefits, China may not follow
2. **Security investment**
   - Effect: Espionage risk 0.5 → 0.2
   - Cost: Resources, may not stop determined adversary
3. **Alignment research**
   - Effect: Alignment capacity growth 0.05 → 0.3 per year
   - Cost: Compute diverted from capabilities

**Trade-offs:**
- Race dynamics: US slowdown → China catches up → US pressured to resume
- Security vs openness: Secure models → less research feedback
- Alignment vs capabilities: Safety research slows deployment → economic cost

**Questions for audience:**
- What confidence threshold warrants action? (0.5 catastrophe risk → regulate?)
- How to handle contested assumptions? (defer to experts? ignore extremes?)
- Can formal models inform policy? (or too simplified?)

---

## Technical Stack

### Visualization (Frontend)
- **React 18** + **React Flow** for interactive state machine
- **Plotly.js** for time-series plots
- **Zustand** for state management
- **Vite** for build

**Run:**
```bash
cd research/ai_futures/visualizer
npm install
npm run dev
# Open http://localhost:3001
```

### Analysis (Backend)
- **Python 3.10+** for scripting
- **JSON** for causal DAG representation
- **Mermaid** for diagram generation

**Run:**
```bash
cd research/ai_futures
python3 scripts/visualize_dag.py
# Outputs: dag_diagram.md, assumptions_report.md, etc.
```

### Formal Verification (Future)
- **PRISM** for probabilistic model checking (PCTL)
- **NuSMV** for symbolic model checking (LTL/CTL)
- **Storm** for CTMDP analysis

---

## Learning Objectives

### For EA Researchers
✅ See how formal methods apply to AI risk (not just theory!)
✅ Understand hybrid automata as unifying framework (SD + ABM + FM)
✅ Learn to quantify epistemic uncertainty (confidence scores)
✅ Critique: Where do models fail? (abstraction, simplification, contested assumptions)

### For Policymakers
✅ Translate qualitative claims to quantitative predictions
✅ Compare interventions systematically (slowdown vs security vs alignment)
✅ Understand assumption sensitivity ("If this is wrong, how does it affect conclusions?")

### For Technical Audience
✅ Hybrid automata formalism (discrete + continuous)
✅ Temporal logic properties (LTL, CTL, PCTL)
✅ Model checking workflows (specification → verification → interpretation)
✅ Tool ecosystem (PRISM, NuSMV, Storm)

---

## Key Metrics for Success

### Engagement
- 80%+ attendees rate demo as "valuable" or "very valuable"
- Active Q&A discussion (>30 min)

### Learning
- Pre/post quiz: +40% in formal methods understanding
- Attendees can identify: modes, guards, temporal properties

### Realism
- Domain experts validate model structure
- Contested assumptions match actual EA debate

### Impact
- At least 3 follow-up collaborations (research, funding, deployment)
- EA Forum post reaches 3,000+ views
- Adopted by 2+ AI safety orgs

---

## Call to Action

**For Attendees:**
1. **Use the tools** - Visualizer and scripts are open-source
2. **Critique the model** - Where are we wrong? What's missing?
3. **Extend the model** - Add your own scenarios, assumptions, properties
4. **Collaborate** - Co-author research, improve tooling, apply to your org

**Opportunities:**
- **Researchers**: Formal verification of AI risk scenarios (publishable!)
- **Engineers**: Build better model checkers, visualizers, integrations
- **Policy experts**: Use models to inform regulation, compute governance
- **Funders**: This needs resources for full buildout (tools, validation, deployment)

---

## FAQ

**Q: Is this just AI2027, or your own analysis?**
A: We formalize AI2027's scenario (Kokotajlo, Alexander, et al.) with explicit assumptions and epistemic scores. The hybrid automaton structure is our contribution.

**Q: Aren't formal models too simplified?**
A: Yes! But useful. They make assumptions explicit, enable systematic comparison, and provide mathematical guarantees (when possible). Complement with narrative analysis.

**Q: What if key assumptions are wrong?**
A: We track epistemic confidence and highlight contested assumptions. Sensitivity analysis shows which assumptions matter most. Models fail gracefully (show uncertainty ranges).

**Q: Can this inform actual policy?**
A: Cautiously yes. Models quantify trade-offs, but policymakers need context (political feasibility, enforcement, unintended consequences). Use as decision support, not oracle.

**Q: Why hybrid automata vs pure MDPs or ABMs?**
A: Hybrid automata naturally combine discrete governance regimes with continuous dynamics (compute, alignment). MDPs lack continuous state; ABMs lack formal verification. HA gives us both.

---

## Contact

**Project Lead:** [Your Name]
**Repository:** github.com/[your-org]/ai-risk-ttx/research/ai_futures/eagx
**EAGX Session:** [Room, Time]

**Feedback:** Submit issues on GitHub or discuss after the demo!

---

*Formal rigor for AI risk analysis. Open-source tools for the safety community.*
