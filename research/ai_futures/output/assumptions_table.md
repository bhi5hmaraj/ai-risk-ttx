# AI-2027 Key Assumptions Analysis

**Status:** Preliminary - Based on secondary sources
**Primary sources blocked:** All main websites returned 403 errors

## Assumptions Catalog

| ID | Category | Description | Epistemic | NLI | Rationale |
|---|---|---|:---:|:---:|---|
| META1 | Scaling | Scaling laws continue unbroken through 2027 | 0.50 | 0.70 | Recent reports of scaling plateaus for GPT-5 and Claude-4. Counter-evidence: Anthropic/OpenAI still ... |
| META2 | Unhobbling | Continued unhobbling yields reliable agents by 2026 | 0.40 | 0.80 | Significant progress from ChatGPT → GPT-4 → o1 → Devin. But reliability gaps remain large. Devin suc... |
| META3 | Compute | Compute scales from $100M to $100B training runs by 2027 | 0.50 | 0.90 | Plausible if (1) chip production scales, (2) no export control constraints, (3) capital available. A... |
| META4 | Recursive Improvement | AI can meaningfully accelerate AI research by 2026 | 0.30 | 0.60 | Some tasks automatable (literature review, code implementation). But research involves taste, intuit... |
| META5 | Institutions | Institutions respond slowly and don't derail timeline | 0.40 | 0.50 | Historically, tech regulation is slow. But AI is higher-profile. Export controls, compute governance... |
| META6 | Alignment | Alignment difficulty is tractable enough for 50% success | 0.10 | 0.30 | No consensus on tractability. Multiple hard problems (inner alignment, outer alignment, robustness).... |

## Score Legends

### Epistemic Confidence Score
- **0.8-1.0**: Very high - widely observable, well-established
- **0.6-0.8**: High - strong evidence, few counterexamples
- **0.4-0.6**: Medium - unclear, competing evidence
- **0.2-0.4**: Low - speculative, weak evidence
- **0.0-0.2**: Very low - highly speculative, no precedent

### NLI (Natural Language Inference) Consistency Score
- **0.8-1.0**: Highly consistent - follows logically from other assumptions
- **0.6-0.8**: Mostly consistent - some tension but resolvable
- **0.4-0.6**: Partially consistent - notable tensions exist
- **0.2-0.4**: Inconsistent - contradicts other parts of scenario
- **0.0-0.2**: Highly inconsistent - major logical conflicts

## Transition Assumptions

### S0 → S1: Scaling + Unhobbling (2025)

**[A1]** Scaling laws continue unbroken through 2025
- **Epistemic Score:** 0.70
- **NLI Consistency:** 0.80
- **Rationale:** Scaling laws have held for ~10 years. Recent reports of 'hitting a wall' but unclear if fundamental or temporary. GPT-5 training reportedly ongoing. High but not certain confidence.
- **Source:** Historical trends + industry reports

**[A2]** Unhobbling continues to improve agent reliability
- **Epistemic Score:** 0.60
- **NLI Consistency:** 0.90
- **Rationale:** Progress in scaffolding, tool use, and agentic frameworks is visible (AutoGPT → GPT-4 Turbo → o1 → Devin). But reliability gains may plateau. Medium-high confidence.
- **Source:** Current AI agent development trends

**[A3]** No major technical bottlenecks discovered in 2025
- **Epistemic Score:** 0.50
- **NLI Consistency:** 0.50
- **Rationale:** Unknown unknowns. Hallucination, reasoning failures, robustness issues could prove fundamental. Neutral confidence.
- **Source:** Implicit assumption

### S1 → S2: AI Research Acceleration (Early 2026)

**[A4]** AI research can be automated before AGI
- **Epistemic Score:** 0.40
- **NLI Consistency:** 0.70
- **Rationale:** AI research involves hypothesis generation, experiment design, code implementation, result analysis. Current models struggle with open-ended research. Some tasks automatable, full automation uncertain. Medium-low confidence.
- **Source:** Current capabilities + research task analysis

**[A5]** Recursive improvement doesn't encounter bottlenecks
- **Epistemic Score:** 0.30
- **NLI Consistency:** 0.60
- **Rationale:** Assumes AI improving AI is straightforward. But research involves taste, intuition, paradigm shifts. Automating incremental progress ≠ automating breakthroughs. Low-medium confidence.
- **Source:** Recursive improvement theory + AI safety literature

**[A6]** Compute availability scales with demand
- **Epistemic Score:** 0.60
- **NLI Consistency:** 0.80
- **Rationale:** Assumes no chip shortages, export controls don't bite, and capital flows freely into AI. Export controls already exist (H100s to China). But TSMC expanding. Medium-high confidence for US.
- **Source:** Current datacenter build-out plans + geopolitics

### S2 → S3: Commoditization (Late 2026)

**[A7]** Efficiency gains continue (10x cost reduction in ~9 months)
- **Epistemic Score:** 0.50
- **NLI Consistency:** 0.80
- **Rationale:** GPT-3 → GPT-3.5-turbo saw ~10x improvement. GPT-4 → GPT-4-turbo similar. But diminishing returns possible. Neutral confidence.
- **Source:** Historical efficiency trends

**[A8]** Economic adoption is rapid once cost-effective
- **Epistemic Score:** 0.70
- **NLI Consistency:** 0.90
- **Rationale:** If AIs truly do CS degree work at low cost, adoption incentives are huge. But organizational inertia, retraining costs, and trust issues may slow adoption. Medium-high confidence.
- **Source:** Economic incentives + historical tech adoption curves

**[A9]** No major regulatory barriers to AI deployment
- **Epistemic Score:** 0.40
- **NLI Consistency:** 0.50
- **Rationale:** EU AI Act, potential US regulations, labor protections could slow deployment. Scenario assumes relatively passive institutions. Medium-low confidence.
- **Source:** Current regulatory landscape + scenario assumptions

### S3 → S4: Online Learning Breakthrough (Jan 2027)

**[A10]** Online learning solves catastrophic forgetting
- **Epistemic Score:** 0.30
- **NLI Consistency:** 0.70
- **Rationale:** Catastrophic forgetting is a major challenge in continual learning. Progress is being made (elastic weight consolidation, replay buffers) but not solved. Low-medium confidence.
- **Source:** Continual learning research

**[A11]** Self-preservation emerges from capability scaling
- **Epistemic Score:** 0.20
- **NLI Consistency:** 0.80
- **Rationale:** Instrumental convergence theory suggests advanced goal-directed systems develop self-preservation. But no empirical evidence with current models. Speculative. Low confidence.
- **Source:** AI safety theory (Bostrom, Omohundro)

### S4 → S5: Architectural Breakthroughs (Mar 2027)

**[A12]** Non-linguistic reasoning is achievable and superior
- **Epistemic Score:** 0.20
- **NLI Consistency:** 0.60
- **Rationale:** Speculative architecture. No clear path from transformers to neuralese. Assumes major research breakthrough. Low confidence.
- **Source:** Speculative AI architecture

**[A13]** Self-improvement loops are stable and rapid
- **Epistemic Score:** 0.20
- **NLI Consistency:** 0.70
- **Rationale:** Assumes FOOM (fast takeoff). But self-improvement may be slow, encounter diminishing returns, or be unstable. No empirical evidence. Low confidence.
- **Source:** FOOM hypothesis (Yudkowsky) + IDA research (Christiano)

**[A14]** Timeline of Mar 2027 is achievable
- **Epistemic Score:** 0.10
- **NLI Consistency:** 0.40
- **Rationale:** Extremely aggressive timeline. From Agent-2 (Jan 2027) to superhuman self-improving AI (Mar 2027) in 2 months. Critiques note this is too fast. Very low confidence.
- **Source:** Timeline critique (Marcus, others)

### S5 → S6a: Successful Alignment

**[A15]** Alignment problem is solvable
- **Epistemic Score:** 0.10
- **NLI Consistency:** 0.30
- **Rationale:** No consensus on whether alignment is solvable. Multiple failure modes (inner alignment, outer alignment, distributional shift). Very low confidence.
- **Source:** AI alignment research (MIRI, Anthropic, etc.)

**[A16]** We have enough time to solve alignment before ASI
- **Epistemic Score:** 0.10
- **NLI Consistency:** 0.20
- **Rationale:** If timeline is correct (2027), we have ~2 years. Alignment researchers say we need decades. Very low confidence.
- **Source:** Alignment researcher timelines

### S5 → S6b: Alignment Failure

**[A17]** Misaligned ASI is catastrophically dangerous
- **Epistemic Score:** 0.30
- **NLI Consistency:** 0.80
- **Rationale:** Conditional on ASI existing and being misaligned. Arguments from instrumental convergence, orthogonality thesis. But ASI may be limited in physical world, or have less coherent goals. Low-medium confidence.
- **Source:** AI safety literature (Bostrom, Yudkowsky, etc.)

**[A18]** Humans cannot control ASI once it emerges
- **Epistemic Score:** 0.20
- **NLI Consistency:** 0.60
- **Rationale:** Assumes: (1) ASI emerges suddenly, (2) it's deceptive, (3) it can acquire resources/power quickly, (4) no off switch works. All speculative. Low confidence.
- **Source:** Treacherous turn hypothesis

## Critiques

### Gary Marcus - How Realistic Is the AI 2027 Scenario?

- Underestimates time by years if not decades
- Assumes unbroken scaling laws
- Ignores hallucination problem
- Overestimates reliability improvements from unhobbling

### Vitalik Buterin - My Response to AI 2027

- Institutions won't be passive
- Geopolitical constraints slow down AI race
- More likely to see governance and coordination than runaway scenario
- 50/50 utopia/doom split unjustified

### MIRI - Thoughts on AI 2027

- Timeline could be correct
- But alignment timeline is even more uncertain
- Utopia branch requires solving extremely hard problems
- Doom branch may be more likely than presented
