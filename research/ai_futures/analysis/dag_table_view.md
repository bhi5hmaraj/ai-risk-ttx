# AI2027 DAG: Complete Table View

## States

| State | Time | Probability | Description | Key Variables |
|-------|------|-------------|-------------|---------------|
| GPT-5 Level (~College Graduate) | 2025-2026 | 0.7 | Models can do most knowledge work at graduate level | compute, algorithmic_efficiency |
| US-China AI Race | 2025-2026 | 0.6 | Competitive dynamics, reduced safety margins | compute, algorithmic_efficiency |
| AGI / Superhuman AI Researcher | Early-Mid 2027 | 0.5 | AI systems can automate AI research itself | compute, algorithmic_efficiency |
| Superintelligence (ASI) | Late 2027 | 0.3 | Recursive self-improvement, far beyond human | compute, algorithmic_efficiency |
| Current State (Late 2024) | Q4 2024 | 1.0 | GPT-4 level models, ~1e25 FLOP training runs | compute, algorithmic_efficiency |

## Transitions (Causal Links)

| From → To | Trigger Event | Mechanism | Confidence | Status |
|-----------|---------------|-----------|------------|--------|
| GPT-5 Level (~Colleg... → US-China AI Race... | Capability demonstrations make stra... | Both US and China recognize AGI as ... | 0.70 | 🟢 Strong |
| Current State (Late ... → US-China AI Race... | China recognizes strategic importan... | Full espionage apparatus targets US... | 0.65 | 🟢 Strong |
| Current State (Late ... → GPT-5 Level (~Colleg... | Continued investment in larger trai... | Exponential scaling: compute double... | 0.60 | 🟡 Moderate |
| US-China AI Race... → AGI / Superhuman AI ... | Competitive pressure overrides safe... | Both sides cut corners, reduce safe... | 0.60 | 🟡 Moderate |
| Current State (Late ... → US-China AI Race... | Major espionage incident becomes pu... | US perception of China threat → adv... | 0.50 | 🟡 Moderate |
| Current State (Late ... → GPT-5 Level (~Colleg... | Continued ML research yields effici... | Algorithmic improvements: ~0.5 OOMs... | 0.40 | 🟡 Moderate ⚠️ |
| GPT-5 Level (~Colleg... → AGI / Superhuman AI ... | Scaffolding + unhobbling + agentic ... | Models become agents (long-horizon ... | 0.15 | 🟠 Weak ⚠️ |
| AGI / Superhuman AI ... → Superintelligence (A... | AGI systems recursively self-improv... | Automated AI research compresses de... | -0.10 | 🔴 Contested ⚠️ |

## Key Assumptions (Sorted by Epistemic Score)

| Assumption | Score | Link | Evidence Type |
|------------|-------|------|---------------|
| Recursive self-improvement is possible and fast | -0.30 | AGI / Superhuma → Superintelligen | Forecast |
| AGI can automate AI research (ML engineering, theo... | 0.10 | GPT-5 Level (~C → AGI / Superhuma | Forecast |
| Chatbot → Agent transition happens smoothly via sc... | 0.20 | GPT-5 Level (~C → AGI / Superhuma | Forecast |
| Scaling laws continue to hold (no diminishing retu... | 0.30 | Current State ( → GPT-5 Level (~C | Empirical |
| Algorithmic progress continues at historical rates... | 0.40 | Current State ( → GPT-5 Level (~C | Forecast |
| Hardware can support massive parallelization | 0.50 | AGI / Superhuma → Superintelligen | Forecast |
| Espionage incidents will be detected and become pu... | 0.50 | Current State ( → US-China AI Rac | Theoretical |
| China will pursue espionage aggressively once AGI ... | 0.60 | Current State ( → US-China AI Rac | Forecast |
| Race dynamics reduce safety investment (safety tax... | 0.60 | US-China AI Rac → AGI / Superhuma | Theoretical |
| Compute will continue to scale exponentially (Moor... | 0.70 | Current State ( → GPT-5 Level (~C | Forecast |
| AI labs have weak security (insufficient to resist... | 0.70 | Current State ( → US-China AI Rac | Forecast |
| Advanced capabilities will be obvious and recogniz... | 0.70 | GPT-5 Level (~C → US-China AI Rac | Theoretical |

## Summary Statistics

- **Total States:** 5
- **Total Transitions:** 8
- **Average Epistemic Confidence:** 0.44
- **Contested Links:** 3/8 (38%)
- **Strong Links (>0.6):** 2
- **Moderate Links (0.3-0.6):** 4
- **Weak Links (<0.3):** 2