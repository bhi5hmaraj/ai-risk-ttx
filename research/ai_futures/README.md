# AI2027 Causal DAG Analysis

This directory contains a structured analysis of the AI2027 forecast and related AGI timeline predictions, mapping out the causal reasoning as a directed acyclic graph (DAG).

## Overview

**Sources analyzed:**
- AI 2027 forecasts (Daniel Kokotajlo, Scott Alexander, et al)
- Situational Awareness (Leopold Aschenbrenner)
- Various compute/algorithmic progress models

**Goal:** Extract the implicit state machine underlying their predictions:
- What are the key state variables?
- What events trigger transitions between states?
- What assumptions underpin each causal link?
- How strong is the evidence for each claim?

## Directory Structure

```
research/ai_futures/
├── scripts/
│   ├── extract_causal_dag.py    # Builds the DAG from research
│   └── visualize_dag.py          # Generates reports and diagrams
├── analysis/
│   ├── ai2027_causal_dag.json              # Full DAG in JSON format
│   ├── dag_table_view.md                   # Comprehensive table view (states, transitions, assumptions)
│   ├── dag_diagram.md                      # Mermaid visualization
│   ├── epistemic_confidence.md             # Confidence analysis
│   ├── assumptions_report.md               # All assumptions ranked by strength
│   ├── links_summary.md                    # Table of all causal links
│   ├── state_machine_summary.md            # State-by-state walkthrough
│   └── simulacra_integration_proposal.md   # DAG → Game mechanics mapping
└── README.md                     # This file
```

## Key Findings

### Overall Epistemic Confidence: 0.44/1.0 (Moderate-Weak)

The forecast relies on a **mix of well-grounded and highly speculative assumptions**.

**Confidence Distribution:**
- **Strong links (>0.6):** 2/8 links
  - Compute scaling (0.60) - well-supported by historical data
  - Espionage dynamics (0.65) - supported by precedent

- **Moderate links (0.3-0.6):** 4/8 links
  - Algorithmic progress (0.40) - empirical trend but sustainability uncertain
  - Race dynamics (0.50-0.60) - game theory + precedent

- **Weak links (<0.3):** 2/8 links
  - Chatbot → Agent transition (0.15) - highly speculative
  - Recursive self-improvement / FOOM (-0.10) - no empirical evidence, contested by most researchers

**Contested Links:** 3/8 (37.5%)
- Algorithmic progress continuation
- AGI emergence from scaffolding
- Fast takeoff (FOOM)

### Complete DAG Table View

See `analysis/dag_table_view.md` for the full table, or quick view below:

**States Overview:**

| State | Time | Probability | Key Variables |
|-------|------|-------------|---------------|
| Current State (Late 2024) | Q4 2024 | 1.0 | compute, algorithmic_efficiency |
| GPT-5 Level (~College Graduate) | 2025-2026 | 0.7 | compute, algorithmic_efficiency |
| US-China AI Race | 2025-2026 | 0.6 | compute, algorithmic_efficiency |
| AGI / Superhuman AI Researcher | Early-Mid 2027 | 0.5 | compute, algorithmic_efficiency |
| Superintelligence (ASI) | Late 2027 | 0.3 | compute, algorithmic_efficiency |

**Transitions (by confidence):**

| Transition | Confidence | Status |
|------------|-----------|--------|
| GPT-5 Level → US-China AI Race | 0.70 | 🟢 Strong |
| Current State → US-China AI Race (espionage) | 0.65 | 🟢 Strong |
| Current State → GPT-5 Level (compute scaling) | 0.60 | 🟡 Moderate |
| US-China AI Race → AGI | 0.60 | 🟡 Moderate |
| Current State → US-China AI Race (espionage revealed) | 0.50 | 🟡 Moderate |
| Current State → GPT-5 Level (algorithmic progress) | 0.40 | 🟡 Moderate ⚠️ |
| GPT-5 Level → AGI (agent transition) | 0.15 | 🟠 Weak ⚠️ |
| AGI → Superintelligence (FOOM) | -0.10 | 🔴 Contested ⚠️ |

### Weakest Assumptions (Highest Uncertainty)

1. **Recursive self-improvement is possible and fast** (score: -0.3)
   - Claim: AGI systems can compress decades of AI research into months
   - Evidence: None (purely theoretical)
   - Contested by: Most AI researchers, diminishing returns arguments

2. **AGI can fully automate AI research** (score: 0.1)
   - Claim: AI systems will match humans at ML engineering, theory, debugging
   - Evidence: Speculative extrapolation
   - Contested by: Creative research requirements, reliability concerns

3. **Chatbot → Agent transition happens smoothly** (score: 0.2)
   - Claim: Current LLMs will become reliable agents via scaffolding
   - Evidence: AutoGPT experiments (limited success)
   - Contested by: Long-horizon planning difficulties, reliability issues

## The State Machine

### Current Understanding

```
Current (2024)
  ├─[Compute scaling]─────> GPT-5 Level (2025-2026)
  ├─[Algo progress]─────────┘         │
  ├─[Espionage]────────> Race Dynamics│
  └─[Espionage revealed]────┘         │
                                      │
     ┌────────────────────────────────┤
     │                                │
     v                                v
Race Dynamics ───[Safety cuts]───> AGI (2027)
     │                              │
     │                              │
     └─────────────────[If race]────┘
                                    │
                                    v
                            Superintelligence (Late 2027)
                                    │
                                    └─[FOOM]
```

**Critical Decision Points:**

1. **GPT-5 level reached (2025-2026):**
   - If capabilities are obvious → triggers race dynamics (P=0.7)
   - Otherwise → slower, safer progress path

2. **Race dynamics emerge (2025-2026):**
   - If US-China tensions high → safety margins reduced (P=0.6)
   - Path to AGI accelerates, alignment work deprioritized

3. **AGI achieved (2027):**
   - If recursive self-improvement possible → fast takeoff to ASI (P=0.3, highly contested)
   - Otherwise → slower capability gains, more time for alignment

## How to Use This Analysis

### For Research

**Identify weak links in the argument:**
```bash
python3 scripts/visualize_dag.py
# Review assumptions_report.md for weakest assumptions
```

**Explore alternative scenarios:**
- What if algorithmic progress plateaus? (Link confidence 0.4 → 0.0)
- What if agent transition fails? (Link confidence 0.15 → 0.0)
- How do probabilities change?

### For Game Design (Simulacra Integration)

**See `analysis/simulacra_integration_proposal.md` for full design document.**

**Core Principle:** Epistemic confidence determines constraint type

1. **State variables** → Game state variables
   - `compute`, `algorithmic_efficiency`, `capability_level`, etc.

2. **Causal links** → Game mechanics
   - Events trigger state transitions with probabilities
   - Player actions can modify link probabilities

3. **Assumptions** → Design choices
   - **High-confidence assumptions** (>0.6) → Hard constraints (can't violate)
   - **Medium-confidence** (0.3-0.6) → Soft constraints (player can influence)
   - **Low-confidence** (<0.3) → Player agency (can prove true or false through actions)

**Quick Examples:**

**Hard Constraint (0.60):** "Compute doubles every 6 months"
→ Game mechanic: Capability curve advances exponentially (can slow, but not reverse)

**Soft Constraint (0.40):** "Algorithmic progress continues"
→ Game mechanic: Probabilistic breakthrough each round, player investment increases chance

**Player Agency (0.15):** "Chatbot → Agent transition succeeds"
→ Game choice: Player decides whether to bet on agentic AI (uncertain outcome)

**Player Agency (-0.10):** "Recursive self-improvement / FOOM"
→ Game choice: High-risk endgame option (could win or lose immediately)

### Modifying the DAG

**To add new states/links:**

Edit `scripts/extract_causal_dag.py`:

```python
# Add new state
nodes["my_new_state"] = StateNode(
    id="my_new_state",
    name="International AI Pause",
    description="Global moratorium on frontier AI",
    variables={...},
    incoming_links=["treaty_succeeded"],
    outgoing_links=["pause_violated", "pause_holds"],
    estimated_time="2026",
    probability=0.15
)

# Add causal link
links["treaty_succeeded"] = CausalLink(
    id="treaty_succeeded",
    from_state="gpt5_level",
    to_state="my_new_state",
    trigger_event="US-China agree on binding pause",
    mechanism="Joint verification, enforcement mechanisms",
    assumptions=[...],
    evidence=[...],
    epistemic_confidence=0.1,  # Highly uncertain
    claimed_by=["Some policy analysts"]
)
```

Then regenerate:
```bash
python3 scripts/extract_causal_dag.py
python3 scripts/visualize_dag.py
```

## Epistemic Scoring Methodology

**Epistemic confidence (-1 to 1):**

- **+1.0 (Strong):** Multiple independent data sources, peer-reviewed, widely accepted
- **+0.5 (Moderate):** Some empirical data, reasonable but uncertain
- **0.0 (Weak):** Speculative, limited evidence
- **-0.5 (Contested):** Active disagreement in expert community
- **-1.0 (Unfounded):** No evidence, contradicted by data

**Aggregation:**
Link confidence = average of assumption scores weighted by importance

**NLI (Internal consistency):**
- Checks if conclusions logically follow from premises
- Separate from empirical grounding
- (Not yet fully implemented)

## Limitations

1. **Incomplete coverage:**
   - Only analyzed publicly available summaries/search results
   - Could not access full AI2027 website (403 errors)
   - Missing: detailed compute models, algorithmic progress forecasts, takeoff dynamics

2. **Subjective scoring:**
   - Epistemic scores assigned by single reviewer (Claude)
   - Should be validated by domain experts

3. **Simplified state machine:**
   - Real dynamics are continuous, not discrete states
   - Many variables omitted for clarity
   - Alternative paths not fully explored

4. **Limited source diversity:**
   - Primarily AI2027 + Situational Awareness
   - Should incorporate: Ajeya Cotra, Tom Davidson, Epoch AI, critics

## Next Steps

### For Deeper Analysis

1. **Expand source coverage:**
   - Add Ajeya Cotra's bio anchors model
   - Add Tom Davidson's takeoff speeds model
   - Add skeptical voices (Melanie Mitchell, Gary Marcus, etc.)

2. **Quantitative modeling:**
   - Convert DAG to Bayesian network
   - Run Monte Carlo simulations
   - Sensitivity analysis on key assumptions

3. **Alternative scenarios:**
   - What if data wall is real?
   - What if international cooperation succeeds?
   - What if alignment is easier than expected?

### For Simulacra Integration

1. **Map constraints → game mechanics:**
   - High confidence links → deterministic rules
   - Low confidence links → stochastic events player can influence

2. **Design intervention space:**
   - What actions can players take?
   - How do actions modify link probabilities?
   - What are costs/tradeoffs?

3. **Validation:**
   - Do gameplay outcomes match forecast distributions?
   - Can players discover the key decision points?
   - Is the model pedagogically valuable?

## References

- **AI 2027:** https://ai-2027.com (Daniel Kokotajlo, Scott Alexander, et al)
- **Situational Awareness:** https://situational-awareness.ai (Leopold Aschenbrenner)
- **Epoch AI:** https://epochai.org (Compute trends, algorithmic progress)
- **EA Forum Summary:** https://forum.effectivealtruism.org/posts/zmRTWsYZ4ifQKrX26/summary-of-situational-awareness-the-decade-ahead

## Contact

For questions about this analysis or to contribute:
- Review the JSON: `analysis/ai2027_causal_dag.json`
- Suggest improvements: Open issue or PR
- Discuss assumptions: See `analysis/assumptions_report.md` for specific claims to debate
