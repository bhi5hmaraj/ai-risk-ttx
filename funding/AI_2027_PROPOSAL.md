# Simulacra: Interactive AI Governance Scenarios
**Proposal for AI Futures Partnership**

---

## 1. Why This Matters

AI 2027 reached millions of people. But reading an article—even a good one—gives you a surface impression. Playing through a crisis over two hours changes how you think about it.

**The gap**: People read AI 2027 and think "interesting scenario." We want them to spend Saturday afternoon trying to prevent catastrophe as the POTUS, fail three times, and come away understanding *why* coordination is hard in ways no article can convey.

**The opportunity**: AI 2027 showed there's massive appetite for realistic AGI scenario exploration. We have a working game (Simulacra) that makes these scenarios playable, customizable, and experimentally testable. With funding, we can turn this into the tool AI 2027 always wanted to be: not just a story, but a simulator.

---

## 2. Vision: What Does a Player Experience?

**For a curious reader** (30 minutes):
- Opens web link, picks "AI 2027 Quick Play"
- Becomes Tech CEO, makes 5 decisions as AI capabilities explode
- Sees outcome, understands one key dynamic (e.g., "racing is bad but coordinating is harder")
- Shares on Twitter: "Just lost the future in 30 minutes, try to beat my score"

**For a serious thinker** (2 hours):
- Customizes scenario: "What if takeoff is 5 years not 2? What if China has lead?"
- Plays as different roles, tries different strategies
- Discovers: "Wait, the problem isn't what I thought. It's actually..."
- Uses it like a flight simulator: build intuition for dynamics they can't experience otherwise

**For a researcher/policymaker** (ongoing):
- Designs custom scenarios matching their models
- Runs 100 AI-vs-AI simulations with varied assumptions
- Analyzes: "Under what initial conditions does coordination emerge?"
- Publishes: "We tested 47 policy interventions in simulation, here's what worked"

**For a skeptic**:
- Vitalik Buterin says "AI 2027 is too doomy"
- We say: "Here, play it with your assumptions. Make it end well if you can."
- Either he finds a path (great, we learned something) or he doesn't (also informative)

The through-line: **Learn by doing, not reading. Customize, don't just consume. Test ideas, don't just argue.**

---

## 3. How This Extends AI 2027's Mission

AI 2027 painted two futures. This lets people explore the *entire space* of futures parameterized by their assumptions.

**What AI 2027 achieved**:
- Reached millions
- Made AGI scenarios concrete and visceral
- Sparked conversations in policy circles

**What we add**:
- **Interactive**: Play through scenarios, don't just read them
- **Customizable**: "Here's what happens with *your* assumptions about takeoff speed, actor incentives, technical difficulty"
- **Experimental**: Run controlled studies, A/B test interventions, measure outcomes
- **Scalable engagement**: One AI 2027 article = millions of readers. One viral game = millions of *hours* of deep engagement
- **Living artifact**: AI 2027 is a snapshot of 2024 thinking. This evolves as the world changes.

**The partnership**: AI Futures has domain expertise, scenario design, and credibility. We have a working engine and execution capacity. Together we can build what neither could alone.

---

## 4. What We've Built (Without Funding)

**Simulacra v0** (functional now):
- Web-based multiplayer game
- LLM game master (generates scenarios, options, consequences)
- Dual objectives: public score (everyone sees) + hidden score (your secret win condition)
- Working with AI 2027 scenario: play as Tech CEO, Regulator, Journalist, etc.
- Supports 0-N human players (rest are LLM agents)
- Basic UI: text-based, functional, not polished

**What this proves**:
- We can ship: 0 to working game in [X weeks, fill in actual timeline]
- Core loop works: players report it's engaging and thought-provoking
- LLMs can GM: quality is surprisingly good when scaffolded correctly
- Technical foundation is sound: multiplayer, real-time, scales

**What it doesn't yet have**:
- Polish (UI/UX for "millions of players" level)
- Depth (numerical models underneath LLM, making it rigorous)
- Customization tools (scenario editor for non-programmers)
- Analytics (experiment runner, statistics dashboard)

That's what funding enables.

---

## 5. Success State (12-18 Months)

**For players**:
- Game that goes viral (think Universal Paperclips meets AI 2027)
- Hits front page of HN, Twitter, gets NYT "Is this game the future of AI policy debate?" article
- Millions play the quick version, tens of thousands play seriously
- Target audience: smart, busy, influential people (policymakers, researchers, journalists, tech leaders)
- "I spent 2 hours trying to save the world and failed 6 times, here's what I learned" becomes a genre of Twitter thread

**For researchers/policymakers**:
- Standard tool for scenario exploration
- "Before we design this policy, let's sim it" becomes normal
- Published papers: "We tested X in Simulacra, found Y"
- AI Futures team uses it internally: faster iteration on scenarios than full TTX

**For the field**:
- Shifts conversation from "will AGI be bad?" to "under what conditions does coordination work?"
- Creates common knowledge: everyone has played similar scenarios, shared vocabulary
- Defuses some doomer/accelerationist tribalism: "Try to win the game with your worldview, show me"

**Where AI Futures fits**:
- **Scenario design**: You have the expertise, we have the engine. You design scenarios (or validate community-created ones), we make them playable.
- **Credibility**: Simulacra powered by AI Futures = people take it seriously, not just "some game"
- **Distribution**: Your network gets it to policymakers, our engine makes it spread virally
- **Research output**: Joint papers on "what we learned from 10,000 simulations"

**Funding elasticity** (how scope scales with budget):
- **Minimum viable** ($X): Polish v0, add scenario customization, launch with AI 2027 scenario
- **Target** ($Y): Above + mobile, advanced analytics, 5 more canonical scenarios, researcher tools
- **Stretch** ($Z): Above + integration with real-world data feeds, AI agent tournaments, policy sandbox mode

---

## 6. Execution Details

### 6.1 Core Design Principles

**Realism first, fun second** (per Daniel's note):
- Not a toy, not science fiction
- Should feel like a serious policy planning tool that happens to be engaging
- Target: "as realistic as your best TTX run, but reproducible and scalable"

**Progressive complexity**:
- Beginner mode (30 min): Simple, learn one thing
- Standard mode (2 hours): Full scenario, multiple strategies viable
- Advanced mode (research use): Full customization, access to underlying models

**Customizability is core**:
- AI 2027 scenario is just one configuration
- Engine supports: climate, biosecurity, geopolitics, any crisis with multiple stakeholders and hidden incentives
- Users can fork scenarios: "AI 2027 but China has 2-year lead" is a dropdown, not a rebuild

### 6.2 Technical Architecture

**Current (v0)**: Pure LLM
- Game master is GPT-4, generates everything
- Works surprisingly well, but:
  - Inconsistent (same scenario plays out differently)
  - Hard to tune (how do you make "trust" decay predictably?)
  - Opaque (why did that outcome happen?)

**Target (v1)**: Hybrid LLM + Deterministic Models
- **LLM layer**: Narrative, flavor, generates action options, makes it feel real
- **Model layer**: Tracks numbers (compute, capabilities, trust, public opinion) using proven frameworks
- **Integration**: LLM reads model state, generates narrative consistent with numbers

**Why hybrid**:
- **Controllable**: We can tune how fast capabilities grow, when crises trigger
- **Transparent**: "Trust dropped by 15 because of incident X, which triggered because compute crossed threshold Y"
- **Learnable**: Players can build skill—not just getting lucky with LLM outputs
- **Testable**: Run 100 sims with parameter sweep, get reproducible results

**The model layer** (alternatives considered):

*Option A: Pure Agent-Based Model (ABM)*
- Simulate every lab, government, researcher individually
- Pro: Very detailed, emergent behavior
- Con: Computationally expensive, hard to control, overkill for most players

*Option B: Pure System Dynamics (SD)*
- Stocks (trust, compute) and flows (research progress, trust decay)
- Pro: Fast, intuitive, validated in other domains
- Con: Doesn't capture discrete events (e.g., "major incident")

*Option C: Hybrid Automata (HA) + LLM* ← **Our choice**
- Discrete modes (normal, race, crisis, coordination) with different dynamics in each
- Transition between modes based on state thresholds
- LLM generates narrative appropriate for current mode
- Pro: Captures both smooth dynamics (capability growth) and discrete shifts (regime changes)
- Pro: Matches how experts think about scenarios ("we're in a race now" vs "we're coordinating")
- Pro: Computationally cheap, tunable, transparent

**Technical stack**:
- Frontend: React (web), React Native (mobile later)
- Backend: Node.js + PostgreSQL (multiplayer state, user accounts)
- LLM: OpenAI API (GPT-4 for now, model-agnostic design)
- Simulation: TypeScript (runs in browser or server)
- Analytics: Python notebooks for research use

### 6.3 Feature Breakdown (MVP → Full)

**Phase 0: Current State**
- Basic multiplayer working
- LLM generates scenarios/consequences
- Text UI, functional but not pretty
- AI 2027 scenario playable

**Phase 1: Polish & Realism** (Months 1-3)
- UI/UX overhaul: Make it feel like a real game
- Hybrid architecture: Add deterministic model layer
- Tuning: Make default AI 2027 scenario as realistic as your best TTX
- Testing: 100 alpha players, iterate based on feedback

**Phase 2: Customization** (Months 4-6)
- Scenario editor: Non-programmers can create scenarios
- Parameter tuning: Sliders for "takeoff speed," "coordination difficulty," etc.
- Forking: "Play AI 2027 with my assumptions" one-click
- Validation: AI Futures team approves quality bar for "canonical" scenarios

**Phase 3: Scale & Research Tools** (Months 7-9)
- Analytics dashboard: Run 100 AI-vs-AI sims, visualize outcomes
- A/B testing: Compare policy interventions quantitatively
- Mobile version: Reach broader audience
- API: Let researchers script experiments programmatically

**Phase 4: Ecosystem** (Months 10-12)
- Community scenarios: Players share custom scenarios
- Tournaments: "Beat the best AI策略" leaderboards
- Integration: Import real-world data (compute trends, policy developments)
- Publication: First research paper using Simulacra data

### 6.4 Team & Execution Plan

**Current team**:
- [Your team composition - fill in]
- Track record: Shipped v0 in [X] weeks with zero funding

**What we need**:
- **Funding**: [Amount] for 12 months
  - Engineering: [X] (2-3 developers full-time)
  - Design: [X] (UI/UX, make it not look like a prototype)
  - AI Futures collaboration: [X] (scenario design, validation, testing)
  - Infrastructure: [X] (hosting, LLM API costs at scale)

**Milestones & Accountability**:
- Month 3: Public beta (polished, realistic, AI 2027 scenario)
- Month 6: Customization tools live, 2 more canonical scenarios
- Month 9: Research tools, first external paper using platform
- Month 12: 100k+ players, sustained growth, mobile launched

**Risk mitigation**:
- **LLM quality**: Hybrid architecture means we're not fully dependent on LLM being perfect
- **Virality**: We can't guarantee millions play, but we can guarantee it's good enough that everyone who *does* play tells others
- **Realism vs fun trade-off**: Progressive complexity means casual players get fun, serious users get realism

### 6.5 Alternatives Considered (and Why Not)

**A: Just improve the LLM prompts (pure LLM)**
- Tried this in v0
- Ceiling is too low: can't make it reproducible/rigorous enough
- Works for demo, not for "policymakers use this as serious tool"

**B: Build full agent-based model from scratch**
- Too slow: Would take 2 years to build, tune, validate
- Too complex: Harder to make accessible to players
- Overkill: Most insights don't require simulating every individual researcher

**C: Use existing simulation software (e.g., Vensim, NetLogo)**
- Not designed for player-facing games
- UI/UX would be terrible for non-experts
- Can't integrate LLM narrative layer cleanly

**Our approach: Hybrid HA + LLM**
- Gets 80% of ABM's realism with 20% of the complexity
- Integrates with LLM naturally (modes map to narrative framing)
- Fast enough to run in browser, rigorous enough for research

---

## 7. Appendix: Research Frontier

*This section is more exploratory. We're not committing to build all of this, but it shows where the platform could go with success.*

### 7.1 Formal Modeling Integration

We've been exploring how to ground the game in established modeling frameworks:

**System Dynamics**: Model AI governance as stocks (compute, trust, capability) and flows (research, trust decay, proliferation). Captures feedback loops (racing erodes trust → more racing) that feel intuitive and match expert mental models.

**Hybrid Automata**: Different game "modes" (baseline, race, coordination, crisis) with different dynamics in each. Captures the discrete regime changes experts talk about ("we're in a race now"). Mathematically rigorous, used in safety-critical systems.

**Agent-Based Models**: For advanced mode, could model labs/governments as agents with their own objectives, running in parallel with player decisions. Useful for "what happens if 20 labs all do X?"

**Monte Carlo**: Run scenario 1000 times with parameter uncertainty, show distribution of outcomes. "Here's the 10th/50th/90th percentile future given your assumptions."

**Physics-inspired frameworks**: Treat AI ecosystem like phase transitions in statistical mechanics. Not because it's literally physics, but because the math of "many actors, coordination thresholds, cascades" is well-studied there. Helps us think about tipping points, hysteresis (easy to fall into race, hard to escape), universality (same dynamics across different scenarios).

*Why this matters*: Each framework offers different insights. SD for feedback loops, HA for regime shifts, ABM for emergence, MC for uncertainty, physics for analogies to other complex systems. We don't need to pick one—we can use the right tool for each question.

*For the game*: Most players never see this. But it's what makes outcomes non-arbitrary. When trust crosses 0.6 and the game shifts to "race mode," that's not random—it's a phase transition in the underlying model.

### 7.2 Surrogate Models

As scenarios get complex, full simulations get slow. We're exploring ML surrogates:
- Train neural network on 10,000 full sim runs
- Network learns "approximate simulator" that's 1000x faster
- Use for real-time gameplay, save full sim for research

Techniques: Gaussian Processes (for uncertainty), Random Forests (for interpretability), Neural Networks (for speed). This is overkill for v1 but becomes relevant at scale.

### 7.3 Calibration & Validation

How do we know the simulation is realistic?

**Current approach**: Expert judgment (AI Futures team plays it, says "feels right")

**Proposed**:
- Backtest: "Predict" historical outcomes (AlphaGo, GPT-4, etc.). Did model parameters that fit past predict them?
- Expert elicitation: Survey 20 experts on key questions, tune model to match aggregate forecasts
- Adversarial testing: Give to skeptics, ask "make this unrealistic," patch the exploits
- Cross-validation: Do different scenarios (climate, bio) with same engine produce sensible results?

Not claiming we can prove it's right, but we can show it's not obviously wrong.

### 7.4 Experiment Design

Once we have stable engine, it becomes a research platform:

**Example studies**:
- "Does compute governance work?" Run 100 sims with/without compute caps, measure catastrophe rate
- "Transparency vs security trade-off" Vary information sharing rules, measure coordination vs proliferation
- "When do pauses happen?" Under what conditions do actors voluntarily slow down?
- "AI agent behavior" Do LLM agents coordinate better than humans? Under what conditions?

This starts to blur line between "game" and "AI governance research infrastructure."

### 7.5 Long-term Vision: Platform Not Product

Simulacra engine could generalize beyond AI:
- **Climate**: Play as US/China/EU negotiating emissions
- **Biosecurity**: Manage pandemic with public health vs civil liberties tensions
- **Geopolitics**: Navigate great power competition
- **Technology**: Any scenario with multiple actors, hidden incentives, coordination problems

Core mechanics (action points, dual objectives, hidden information, LLM narrative + formal model) apply broadly.

If successful with AI 2027, we have a *framework* for interactive scenario exploration in any domain.

---

## Summary

**We've built a working AI governance game**. With funding, we can turn it into:
1. **A viral game** that gives millions of people deep engagement with AI scenarios (not just surface-level awareness)
2. **A serious policy tool** that policymakers and researchers use to test ideas
3. **An experimental platform** that generates publishable insights about coordination, governance, and AI trajectories

**We're not proposing to build AI 2027 online**. We're proposing to build the *platform* that makes AI 2027 (and 100 other scenarios) playable, customizable, and experimentally testable.

The opportunity: AI 2027 showed there's demand. We have supply. Let's ship it.

---

**Next Steps**:
1. Review this vision with AI Futures team
2. Align on scope (which features are must-have vs nice-to-have)
3. Finalize budget and timeline
4. Ship beta in 3 months

**Questions for you**:
- Does this match your vision for what the online game should be?
- What's the minimum feature set you'd need to see to feel confident it works?
- What would success look like from your perspective in 12 months?

We're ready to build this. Let's talk details.
