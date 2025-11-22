# AI2027 Formal Models - EAGX Demo Guide

**For Presenters**

Last updated: 2025-11-22

---

## Pre-Demo Setup (15 min before)

### 1. Terminal Setup
```bash
cd /path/to/ai-risk-ttx

# Terminal 1: Python demos
python3 research/ai_futures/eagx/demo_scripts/01_hybrid_automaton_simulator.py

# Terminal 2: Visualizer (if showing web UI)
cd research/ai_futures/visualizer
npm install
npm run dev
# Open http://localhost:3001
```

### 2. Slides
- Have README.md open in preview mode
- Key diagrams from analysis/ folder ready

### 3. Backup Materials
- Screenshots of visualizations (in case live demo fails)
- Pre-computed Monte Carlo results

---

## Demo Flow (60-90 min)

### Part 1: Motivation (10 min)

**Hook:** "Let's make AI risk discourse rigorous"

**Slide 1:** Problem statement
- Show typical qualitative claim: "ASI soon, might be misaligned"
- Ask: How soon? How likely? What assumptions?

**Slide 2:** Formal methods answer
- Timeline: P(ASI by 2027) = 0.5 ± 0.2
- Risk: P(catastrophe | ASI) = 0.5 ± 0.3
- Assumptions: 12 tracked, 3 contested, 2 weak
- Interventions: Slowdown reduces risk 0.7 → 0.3

**Transition:** "Let me show you the model"

---

### Part 2: Model Walkthrough (20 min)

**Slide 3:** Hybrid Automaton Overview
```
Show diagram from README.md:
- Discrete modes: Baseline, Race, Slowdown, Catastrophe, Aligned
- Continuous vars: compute, alignment, trust, security
- Transitions with guards
```

**Slide 4:** Why Hybrid Automata?
- Discrete: Governance regimes (policy, coordination)
- Continuous: Technical dynamics (compute scaling, alignment progress)
- Together: Realistic model of AI development

**Live Demo 1:** Hybrid Automaton Simulator
```bash
python3 research/ai_futures/eagx/demo_scripts/01_hybrid_automaton_simulator.py
```

**Narrate as it runs:**
1. "Starting in Baseline (2024)"
2. "Compute scaling → hits threshold → enter Race mode"
3. "Security degrades → Espionage (China steals weights)"
4. "Alignment gap grows → Catastrophe"

**Show plot:** `ai2027_trajectory.png`
- Point out mode transitions
- Highlight alignment gap widening
- Discuss: "This is ONE trajectory - what about uncertainty?"

---

### Part 3: Epistemic Rigor (15 min)

**Slide 5:** Assumptions Matter
```bash
# Show assumption analysis
cat research/ai_futures/analysis/assumptions_report.md | head -100
```

**Highlight:**
- Recursive self-improvement (conf: 0.15) - VERY speculative
- Slowdown political will (conf: 0.25) - Contested!
- Security breach (conf: 0.65) - Well-grounded

**Q to audience:** "If slowdown assumption is wrong, how does that change conclusions?"

**Slide 6:** Monte Carlo Uncertainty Quantification
```bash
# (Pre-computed or run if time allows)
python3 research/ai_futures/eagx/demo_scripts/02_monte_carlo_risk_analysis.py
```

**Key results to show:**
- P(catastrophe) ≈ 50% (UNACCEPTABLE if true!)
- P(aligned) ≈ 30%
- Sensitivity: Slowdown probability is CRITICAL

**Show plot:** `monte_carlo_results.png`
- Outcome distribution
- Final state scatter (compute vs alignment)
- Sensitivity analysis curve

**Slide 7:** Property Checking
```bash
python3 research/ai_futures/eagx/demo_scripts/03_property_checker.py
```

**Properties to highlight:**
- G ¬catastrophe: VIOLATED (catastrophe is possible)
- G_{t≤12} ¬catastrophe: LIKELY SATISFIED (safe through 2025)
- P≤0.05[F catastrophe]: VIOLATED (50% risk >> 5% acceptable)

---

### Part 4: Policy Implications (15 min)

**Slide 8:** Interventions Compared

| Intervention | Effect | Cost/Challenge |
|--------------|--------|----------------|
| **Slowdown** | P(catastrophe) 0.7 → 0.3 | China may not follow |
| **Security** | P(espionage) 0.5 → 0.2 | Determined adversary hard to stop |
| **Alignment** | Capacity 0.15 → 0.50 | Diverts compute from capabilities |

**Slide 9:** Trade-offs
- Race dynamics: US slows → China catches up → pressure to resume
- Security vs openness: Secure models → less research feedback
- Alignment vs capabilities: Safety work → delayed deployment

**Slide 10:** Policy Recommendations (from analysis)

Based on model:
1. ✅ **Increase P(slowdown | trust collapse) from 0.35 to >0.60**
   - Current: 35% chance of pause given evidence
   - Needed: 60%+ to get P(catastrophe) < 10%
   - How: Prenegotiated triggers, international coordination

2. ✅ **Triple alignment research investment**
   - Current: 0.15 alignment capacity
   - Target: 0.50 by time of slowdown
   - How: Compute allocation, talent pipeline, research agenda

3. ✅ **Strengthen model security**
   - Current: 50% baseline, degrades in race
   - Target: 80% maintained
   - How: Mandatory security standards, weight protection

**Q to audience:** "What confidence threshold should trigger regulation?"
- If P(catastrophe) = 50%, is that enough?
- What about 10%? 5%? 1%?

---

### Part 5: Q&A and Discussion (20 min)

**Common questions:**

**Q: Isn't this too simplified?**
A: Yes! But useful. Models make assumptions explicit, enable systematic comparison. Use alongside qualitative analysis, not instead of it.

**Q: What if AI2027 is wrong?**
A: We track epistemic confidence. Contested assumptions are flagged. Model is a tool for exploring "if X, then Y", not "X is definitely true".

**Q: Can policymakers use this?**
A: Cautiously yes. Models quantify trade-offs, but need context (political feasibility, enforcement, unintended consequences). Decision support, not oracle.

**Q: Why not just use regular MDPs or ABMs?**
A: Hybrid automata give us both:
- Discrete governance regimes (policy, coordination)
- Continuous dynamics (compute, alignment)
- Formal verification (temporal logic, model checking)
MDPs lack continuous state; ABMs lack formal guarantees.

**Q: What about multi-agent dynamics?**
A: Current model abstracts to single US "OpenBrain" vs China. Future work: explicit multi-agent game theory (Nash equilibria, mechanism design).

---

## Backup Slides

### If Live Demo Fails
- Use pre-generated plots
- Walk through code on screen
- Show GitHub repo

### If Time is Short
- Skip Monte Carlo demo (show results only)
- Skip property checker (mention it exists)
- Focus on hybrid automaton simulator

### If Audience is Technical
- Dive deeper into ODE equations
- Show temporal logic formulas
- Discuss PRISM/Storm integration plans

### If Audience is Policy
- Focus on Part 4 (interventions, trade-offs)
- Skip technical details of model checking
- Emphasize uncertainty quantification

---

## Post-Demo Actions

### Immediate
1. Share slides and demo code (GitHub link)
2. Collect feedback (Google Form or in-person)
3. Exchange contacts with interested attendees

### Follow-up (within 1 week)
1. Write EA Forum post summarizing demo
2. Create polished version of visualizer for public use
3. Reach out to collaborators

### Long-term (1-3 months)
1. Incorporate feedback into models
2. Validate assumptions with domain experts
3. Publish formal methods paper

---

## Materials Checklist

**Presentation:**
- [ ] README.md (main presentation doc)
- [ ] Mermaid diagrams from analysis/
- [ ] Key plots (pre-generated as backup)

**Demo Code:**
- [ ] 01_hybrid_automaton_simulator.py
- [ ] 02_monte_carlo_risk_analysis.py
- [ ] 03_property_checker.py
- [ ] Visualizer (research/ai_futures/visualizer/)

**Data:**
- [ ] ai2027_causal_dag.json
- [ ] assumptions_report.md
- [ ] epistemic_confidence.md

**Handouts:**
- [ ] One-page summary of AI2027 formal model
- [ ] QR code to GitHub repo
- [ ] Contact info for follow-up

---

## Technical Notes

### Dependencies
```bash
pip install numpy scipy matplotlib pandas tqdm
# Optional: transitions (for FSM library demo)
```

### Known Issues
1. Hybrid automaton flows sometimes lead to unrealistic compute values
   - **Fix:** Tune differential equation parameters
2. Monte Carlo takes ~2 min for 1000 sims
   - **Fix:** Pre-run and save results
3. Visualizer requires Node.js 20+
   - **Fix:** Have backup screenshots

### Performance Tips
- Pre-compute Monte Carlo results (save to CSV)
- Use smaller N for live demos (100-200 sims)
- Close other browser tabs to avoid memory issues

---

## Contact

**Demo Lead:** [Your Name]
**Email:** [your email]
**GitHub:** github.com/[your-org]/ai-risk-ttx/research/ai_futures/eagx

**Feedback:** Open an issue or email directly!

---

*Good luck with the demo! 🚀*
