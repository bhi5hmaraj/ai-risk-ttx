# AI2027 Formal Models - EAGX Demo Summary

**Project Status:** Ready for presentation ✅
**Last Updated:** 2025-11-22

---

## What We Built

A complete formal modeling framework for AI2027 risk scenarios, including:

### 1. Focused Demo Scripts (Python)
**Location:** `research/ai_futures/eagx/demo_scripts/`

- ✅ **01_hybrid_automaton_simulator.py** - Single trajectory simulation
  - Discrete governance modes + continuous dynamics (ODE integration via scipy)
  - Guards for mode transitions
  - Real-time visualization of alignment gap

- ✅ **02_monte_carlo_risk_analysis.py** - Probabilistic uncertainty quantification
  - 1000+ simulations with stochastic transitions
  - P(catastrophe), P(aligned) estimates
  - Sensitivity analysis (slowdown probability impact)
  - Statistical plots and distributions

- ✅ **03_property_checker.py** - Temporal logic verification
  - LTL/CTL properties (qualitative: true/false)
  - PCTL properties (quantitative: probabilities)
  - Counterexample generation

**Status:** All scripts tested and working ✅

### 2. Interactive Presentation (Marp)
**Location:** `research/ai_futures/eagx/presentation/`

- ✅ **ai2027_eagx_slides.md** - Markdown source (27 slides)
- ✅ **ai2027_eagx_slides.html** - Generated HTML presentation (135 KB)
- ✅ **EAGX_DEMO_GUIDE.md** - Presenter notes and timing

**Features:**
- Motivation (why formal methods for AI risk)
- Model walkthrough (hybrid automaton architecture)
- Epistemic rigor (assumption tracking)
- Policy implications (intervention comparison)
- Live demo integration points

**To present:** Open `ai2027_eagx_slides.html` in browser

### 3. Documentation
**Location:** `research/ai_futures/eagx/`

- ✅ **README.md** - Full EAGX demo documentation (comprehensive)
- ✅ **QUICKSTART.md** - 5-minute setup guide
- ✅ **models/requirements.txt** - Python dependencies

---

## Key Results from Demos

### Hybrid Automaton Simulation
```
Initial: Baseline (2024)
  compute=25.0, alignment=0.15

Transitions:
  → Race (compute threshold exceeded)
  → Espionage (security breach)
  → Catastrophe (alignment gap > 8)

Outcome: Catastrophe at t=3 months
  Final alignment gap: 37.34 (CRITICAL)
```

### Monte Carlo Analysis (1000 simulations)
```
P(catastrophe) = 0.50 (50%)
P(aligned)     = 0.30 (30%)
P(other)       = 0.20 (20%)

Average epistemic confidence: 0.44 (moderate)
Contested assumptions: 3/8
```

### Property Checking
```
LTL/CTL:
  ✅ AF (aligned ∨ catastrophe) - Eventually reach terminal
  ❌ G ¬catastrophe - Never catastrophe (VIOLATED)
  ✅ G_{t≤12} ¬catastrophe - Safe through 2025

PCTL:
  ❌ P≤0.05[F catastrophe] - ≤5% risk (actual: 50%)
  ❌ P≥0.50[F aligned] - ≥50% success (actual: 30%)
```

---

## Folder Structure

```
research/ai_futures/eagx/
├── README.md                        # Full documentation
├── QUICKSTART.md                    # 5-minute setup guide
├── SUMMARY.md                       # This file
│
├── demo_scripts/
│   ├── 01_hybrid_automaton_simulator.py
│   ├── 02_monte_carlo_risk_analysis.py
│   └── 03_property_checker.py
│
├── models/
│   └── requirements.txt             # Python dependencies
│
└── presentation/
    ├── ai2027_eagx_slides.md        # Marp source
    ├── ai2027_eagx_slides.html      # Generated presentation
    └── EAGX_DEMO_GUIDE.md           # Presenter notes
```

---

## How to Run (Quick Reference)

### 1. Install Dependencies
```bash
cd /path/to/ai-risk-ttx
pip install -r research/ai_futures/eagx/models/requirements.txt
```

### 2. Run Demo Scripts
```bash
# Demo 1: Single trajectory (~10 seconds)
python3 research/ai_futures/eagx/demo_scripts/01_hybrid_automaton_simulator.py

# Demo 2: Monte Carlo (~2 minutes)
python3 research/ai_futures/eagx/demo_scripts/02_monte_carlo_risk_analysis.py

# Demo 3: Property checker (~30 seconds)
python3 research/ai_futures/eagx/demo_scripts/03_property_checker.py
```

### 3. View Presentation
```bash
# Open in browser
open research/ai_futures/eagx/presentation/ai2027_eagx_slides.html

# Or navigate to file in browser
```

---

## Integration with Existing Work

### Research Folder
This EAGX demo builds on top of:
- `research/ai_futures/scripts/` - DAG extraction and visualization
- `research/ai_futures/analysis/` - AI2027 causal DAG (JSON)
- `research/ai_futures/visualizer/` - React + React Flow web app
- `research/ai_futures/mvp_docs/` - Implementation plan

### Air Pollution Comparison
Similar structure to `eagx/air_pollution/`:
- Both have demo scripts (Python)
- Both have presentation materials
- Both use formal models (Hybrid Automata)
- Both integrate LLM narratives

**Key difference:**
- Air pollution: SD + ABM + HA for physical system
- AI2027: HA for sociotechnical governance + compute scaling

---

## Technical Stack Summary

### Python Libraries Used
- **numpy** - Array operations, numerical computing
- **scipy** - ODE integration (`odeint`)
- **matplotlib** - Plotting and visualization
- **pandas** - Data frames and statistics
- **tqdm** - Progress bars for Monte Carlo

### Presentation Tools
- **Marp CLI** - Markdown to HTML/PDF presentations
- **graphviz** - Diagram generation (installed)

### Formal Methods
- **Hybrid Automata** - Discrete modes + continuous dynamics
- **Temporal Logic** - LTL, CTL, PCTL specifications
- **Model Checking** - Property verification (simplified demo)

---

## Presentation Flow (60-90 min)

### Part 1: Motivation (10 min)
- Problem: Qualitative AI risk discourse
- Solution: Formal methods for rigor

### Part 2: Model Walkthrough (20 min)
- Hybrid automaton architecture
- **Live Demo 1:** Run `01_hybrid_automaton_simulator.py`
- Show trajectory plots

### Part 3: Epistemic Rigor (15 min)
- Assumption analysis (contested assumptions)
- **Live Demo 2:** Run `02_monte_carlo_risk_analysis.py`
- Sensitivity analysis results

### Part 4: Policy Implications (15 min)
- Intervention comparison
- Recommendations from model
- Trade-offs discussion

### Part 5: Q&A (20 min)
- Open discussion
- Critique of model
- Collaboration opportunities

---

## Success Metrics (Target)

### Engagement
- [ ] 80%+ rate demo as "valuable"
- [ ] Active Q&A >30 min

### Learning
- [ ] +40% improvement in formal methods understanding (pre/post quiz)
- [ ] Attendees can identify: modes, guards, temporal properties

### Impact
- [ ] 3+ follow-up collaborations
- [ ] EA Forum post >3,000 views
- [ ] 2+ AI safety orgs adopt tools

---

## Next Steps

### Immediate (Day of Demo)
1. Test all scripts one more time
2. Open HTML presentation in browser
3. Have backup screenshots ready
4. Print one-page handout (QR code to GitHub)

### Short-term (Week After)
1. Incorporate feedback from attendees
2. Polish visualizer for public release
3. Write EA Forum post

### Long-term (1-3 Months)
1. Validate assumptions with domain experts
2. Extend to other AI risk scenarios
3. Publish formal methods paper
4. Integrate with Simulacra TTX game

---

## Known Issues & Workarounds

### Issue 1: ODE flows produce unrealistic values
**Problem:** Compute can grow exponentially too fast
**Workaround:** This is a demo - mention parameter tuning needed

### Issue 2: Monte Carlo takes ~2 minutes for 1000 sims
**Workaround:** Pre-run and show results, or use N=100 for live demo

### Issue 3: PDF generation requires browser
**Workaround:** HTML presentation works fine, PDF is optional

---

## Repository Status

### Existing AI2027 Research
- ✅ Scripts tested (`visualize_dag.py` works)
- ✅ Visualizer available (React app in `visualizer/`)
- ✅ Analysis files generated (`assumptions_report.md`, etc.)
- ✅ Formal modeling docs (`mvp_docs/`, `hybrid_automata/`)

### EAGX Demo Added
- ✅ Demo scripts (Python, working)
- ✅ Presentation (Marp, HTML generated)
- ✅ Documentation (README, QUICKSTART, DEMO_GUIDE)
- ✅ Dependencies (requirements.txt)

---

## Contact & Resources

**GitHub:** [Link to repo]/research/ai_futures/eagx
**Presentation:** `presentation/ai2027_eagx_slides.html`
**Scripts:** `demo_scripts/*.py`

**For Questions:**
- Open GitHub issue
- Email: [your email]

**References:**
- AI2027: https://ai-2027.com
- Marp: https://marp.app
- PRISM model checker: https://www.prismmodelchecker.org

---

## Final Checklist

**Before Demo:**
- [ ] Python dependencies installed
- [ ] All 3 demo scripts tested
- [ ] HTML presentation opens in browser
- [ ] Backup screenshots saved
- [ ] Laptop fully charged
- [ ] Projector/screen tested

**During Demo:**
- [ ] Introduce motivation clearly
- [ ] Run live demos (or show pre-computed)
- [ ] Engage audience with questions
- [ ] Handle Q&A professionally

**After Demo:**
- [ ] Collect feedback
- [ ] Share GitHub link
- [ ] Exchange contacts
- [ ] Write follow-up post

---

**Status: Ready for EAGX presentation! 🚀**

All materials tested and working. Good luck with the demo!
