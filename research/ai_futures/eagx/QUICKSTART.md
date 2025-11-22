# AI2027 Formal Models - Quick Start Guide

Get up and running with the AI2027 formal modeling demos in 5 minutes.

---

## Installation

### 1. Install Python Dependencies
```bash
cd /path/to/ai-risk-ttx
pip install -r research/ai_futures/eagx/models/requirements.txt
```

Or manually:
```bash
pip install numpy scipy matplotlib pandas tqdm
```

### 2. (Optional) Install Node.js for Visualizer
```bash
cd research/ai_futures/visualizer
npm install
```

---

## Run the Demos

### Demo 1: Hybrid Automaton Simulator
**What it does:** Simulates one trajectory of AI development with discrete governance modes + continuous dynamics

```bash
python3 research/ai_futures/eagx/demo_scripts/01_hybrid_automaton_simulator.py
```

**Output:**
- Terminal: Simulation log with mode transitions
- Plot: `research/ai_futures/eagx/ai2027_trajectory.png`

**Time:** ~10 seconds

---

### Demo 2: Monte Carlo Risk Analysis
**What it does:** Runs 1000 simulations to estimate P(catastrophe), P(aligned), and sensitivity

```bash
python3 research/ai_futures/eagx/demo_scripts/02_monte_carlo_risk_analysis.py
```

**Output:**
- Terminal: Probability estimates and statistics
- Plot: `research/ai_futures/eagx/monte_carlo_results.png`

**Time:** ~2 minutes

---

### Demo 3: Property Checker
**What it does:** Checks temporal logic properties (LTL/CTL/PCTL) on simulated trajectories

```bash
python3 research/ai_futures/eagx/demo_scripts/03_property_checker.py
```

**Output:**
- Terminal: Property satisfaction results and counterexamples

**Time:** ~30 seconds

---

### Interactive Visualizer (Optional)
**What it does:** Web-based interactive state machine with real-time simulation

```bash
cd research/ai_futures/visualizer
npm run dev
```

Open http://localhost:3001

**Time:** Instant (once dependencies installed)

---

## Understanding the Output

### Hybrid Automaton Simulator
```
🚀 Starting AI2027 Hybrid Automaton Simulation
Duration: 36.0 months (3.0 years)
Initial state: baseline
  compute=25.00, alignment=0.15

  ⚡ TRANSITION: baseline → race (compute threshold)
  💀 TRANSITION: race → CATASTROPHE (alignment gap: 8.50)

📊 Simulation complete!
Final mode: catastrophe
```

**Key metrics:**
- `compute`: Log10(FLOP) - higher = more capable AI
- `alignment`: Alignment capacity [0-1]
- `alignment_gap`: (compute - 24) - 10×alignment
  - > 8 = danger zone
  - > 10 = likely catastrophe

---

### Monte Carlo Results
```
P(catastrophe) = 0.487 (48.7%)
P(aligned)     = 0.312 (31.2%)
```

**Interpretation:**
- ~50% catastrophe risk under AI2027 assumptions
- ~30% chance of safe ASI
- ~20% other outcomes (still in race, etc.)

**Policy implication:** Risk is UNACCEPTABLE if accurate!

---

### Property Checker
```
🔍 Checking: Safety (Globally Safe)
   Formula: G ¬catastrophe
   ❌ VIOLATED
   Counterexample: trajectory #5 at 18.5 months
```

**Interpretation:**
- `G ¬catastrophe` = "Never catastrophe" → FALSE
- `P≤0.05[F catastrophe]` = "≤5% risk" → FALSE (actual ~50%)

---

## Troubleshooting

### "ModuleNotFoundError: No module named 'numpy'"
→ Install dependencies: `pip install numpy scipy matplotlib pandas`

### Plots not showing
→ If running on server, plots save to disk automatically
→ Check `research/ai_futures/eagx/*.png`

### Visualizer won't start
→ Ensure Node.js 20+ installed
→ Run `npm install` first
→ Check port 3001 is not in use

### Simulation values look wrong
→ This is a simplified demo - real analysis needs parameter tuning
→ See CLAUDE.md for model architecture details

---

## Next Steps

### For Presenters
- Read [presentation/EAGX_DEMO_GUIDE.md](presentation/EAGX_DEMO_GUIDE.md)
- Review [README.md](README.md) for full context

### For Researchers
- Explore [../analysis/ai2027_causal_dag.json](../analysis/ai2027_causal_dag.json) for full model
- Read [../mvp_docs/](../mvp_docs/) for architecture
- Check [../hybrid_automata/](../hybrid_automata/) for theoretical background

### For Developers
- Modify demo scripts to test your own assumptions
- Tune parameters in `SimulationConfig`
- Add new modes or transitions

---

## Files Overview

```
research/ai_futures/eagx/
├── README.md                           # Full EAGX demo documentation
├── QUICKSTART.md                       # This file
├── demo_scripts/
│   ├── 01_hybrid_automaton_simulator.py  # Single trajectory sim
│   ├── 02_monte_carlo_risk_analysis.py   # Probabilistic analysis
│   └── 03_property_checker.py            # Temporal logic verification
├── models/
│   └── requirements.txt                  # Python dependencies
└── presentation/
    └── EAGX_DEMO_GUIDE.md               # Presenter notes
```

---

## Support

**Issues:** Open a GitHub issue
**Questions:** [your email]
**Feedback:** Submit after EAGX demo

---

Happy modeling! 🚀
