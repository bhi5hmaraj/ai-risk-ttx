# Open Research Questions

**High-level architectural questions that need answers through prototyping and experimentation**

---

## 1. LLM Elicitation Quality

### Q1.1: How accurate is LLM extraction of formal specs?

**Hypothesis**: GPT-4 can extract 80%+ of GM's mental model from blog posts

**Test**:
1. Take Kokotajlo's AI2027 blog posts
2. Run elicitation agent
3. Show extracted spec to Kokotajlo
4. Measure: % of modes captured, % of parameters correct, % of GM's approval

**Success criteria**: GM says "yes, this captures my model" without major corrections

---

### Q1.2: Where do LLMs fail at extraction?

**Known failure modes**:
- Hallucinating numeric values
- Missing implicit assumptions
- Conflating similar concepts
- Over-simplifying nonlinear dynamics

**Test**:
1. Run elicitation on 5 different GM scenarios
2. Tag all LLM errors by type
3. Identify patterns

**Mitigation strategies**:
- Uncertainty tagging (`[LLM_INFERRED]`)
- Multi-pass refinement
- Socratic interviewing
- Calibration wizards

---

### Q1.3: How much GM time does elicitation save?

**Baseline**: Manual formal modeling takes weeks

**Hypothesis**: LLM elicitation reduces to hours

**Test**:
1. Ask GM to manually create formal spec (time A)
2. Ask GM to use elicitation agent (time B)
3. Compare quality and time

**Target**: 10x speedup with comparable quality

---

## 2. Grounding Effectiveness

### Q2.1: Do players notice when narrative contradicts formal state?

**Hypothesis**: Players don't consciously track numbers, so minor inconsistencies are invisible

**Test**:
1. Inject intentional inconsistencies (e.g., narrative says trust=0.5, formal state is 0.3)
2. See if players notice/complain
3. Vary magnitude of inconsistency

**Result**: Determine acceptable tolerance for narrative flexibility

---

### Q2.2: Does grounding improve player trust?

**Hypothesis**: Players trust the scenario more when they see formal state

**Test**:
1. Group A: Pure LLM narrative (no formal state shown)
2. Group B: Narrative + formal state dashboard
3. Measure: player-reported trust, engagement, perceived realism

**Prediction**: Group B has higher trust, but potentially lower immersion

---

### Q2.3: How often do agents call tools?

**Question**: Is agent using formal methods frequently or rarely?

**Test**:
1. Instrument agent to log all tool calls
2. Measure: calls per round, which tools used most
3. Analyze: do certain scenarios trigger more tool use?

**Benchmark**: Expect 3-5 matrix calls per round (simulate, check_guards, verify_property)

---

## 3. Runtime Dynamics

### Q3.1: How often do GMs need to tweak specs?

**Hypothesis**: Most games need 2-3 tweaks total

**Test**:
1. Run 20 games with real GMs
2. Track: # of edits per game, when they occur (which round), types of edits
3. Categorize: parameter tunes vs structural changes

**Target**: <5 edits per game, mostly in early rounds (learning phase)

---

### Q3.2: Do spec tweaks break player experience?

**Hypothesis**: Players don't notice/care about tweaks if narrative stays consistent

**Test**:
1. Group A: Plays game with spec tweaks (invisible)
2. Group B: Plays game with spec tweaks (notified)
3. Group C: Plays game with spec tweaks (full transparency)
4. Measure: player satisfaction, trust, sense of fairness

**Prediction**: Group A has highest immersion, Group C has highest trust in GM

---

### Q3.3: Can we predict when specs will need tweaking?

**Question**: Are there early warning signs that the model is wrong?

**Test**:
1. Analyze 50 games with edit logs
2. Look for patterns: what state anomalies preceded edits?
3. Build detector: "trust evolving 50% faster than expected → suggest param adjustment"

**Goal**: Proactive suggestions before GM notices problem

---

## 4. Formalism Selection

### Q4.1: When is hybrid automaton overkill?

**Question**: Do simpler formalisms (pure SD, pure MDP) work for some scenarios?

**Hypothesis**:
- Simple scenarios (no mode transitions) → System Dynamics suffices
- Complex scenarios (discrete regimes + continuous dynamics) → need Hybrid Automata

**Test**:
1. Model same scenario with SD, HA, ABM
2. Compare: expressiveness, simulation speed, GM ease-of-use
3. Identify decision criteria

**Decision tree**:
```
Does scenario have discrete regimes?
  No → Use System Dynamics
  Yes → Does it have probabilistic transitions?
    No → Use Timed Automata
    Yes → Use Stochastic Hybrid Automata
```

---

### Q4.2: Do different formalisms give different outcomes?

**Question**: If we model AI2027 as SD vs HA vs ABM, do P(catastrophe) estimates differ?

**Test**:
1. Build AI2027 in all 3 formalisms (same conceptual model)
2. Run monte carlo (1000 sims each)
3. Compare outcome distributions

**Acceptable**: <10% difference (validates abstraction)
**Concerning**: >20% difference (suggests one formalism is wrong)

---

## 5. Computational Performance

### Q5.1: Can we run Matrix calls in real-time?

**Requirement**: Player submits action → sees consequence in <5 seconds

**Bottleneck**: ODE integration (scipy), monte carlo (1000+ sims)

**Test**:
1. Measure latency for common operations:
   - `matrix.simulate(duration=6)`: ??? ms
   - `matrix.monte_carlo(n=1000)`: ??? ms
   - `matrix.verify_property(...)`: ??? ms
2. Identify bottlenecks
3. Optimize (caching, pre-computation, approximation)

**Target**:
- Deterministic sim: <500ms
- Monte carlo: <3s (or run async)

---

### Q5.2: How much can we pre-compute?

**Idea**: Pre-compute likely trajectories, cache results

**Test**:
1. Analyze 50 games
2. Measure: how often do players repeat similar actions?
3. Build cache: key=(state, action) → value=consequence
4. Measure cache hit rate

**Goal**: 50%+ cache hit rate

---

### Q5.3: Can we compile to WebAssembly?

**Idea**: Run simple sims client-side (no server round-trip)

**Test**:
1. Compile SD adapter to WASM (e.g., via emscripten)
2. Measure: performance vs Python, bundle size
3. Test: does it work in browser?

**Benefit**: Zero-latency simulation for simple models

---

## 6. Multi-Agent Coordination

### Q6.1: How do we prevent agent loops?

**Problem**: Agent calls tool → tool returns error → agent retries → infinite loop

**Test**:
1. Intentionally give agent broken tool (e.g., invalid parameter)
2. See if agent gets stuck
3. Measure: how many retries before giving up?

**Mitigation**:
- Rate limits (max 5 tool calls per turn)
- Explicit retry budget in system prompt
- Fallback: "If tool fails, explain to player and continue"

---

### Q6.2: Should we use single agent or multi-agent?

**Option 1: Single Consequence Agent**
- Pro: Simple, maintains coherent narrative voice
- Con: Complex reasoning, might get confused

**Option 2: Multi-Agent Pipeline**
```
Analyst Agent (calls formal tools)
  → Storyteller Agent (generates narrative)
  → Fact-Checker Agent (validates consistency)
```
- Pro: Specialization, easier debugging
- Con: Coordination overhead, potential for disagreement

**Test**: Build both, compare quality and latency

---

## 7. Scenario Library

### Q7.1: How many scenarios do we need to validate the system?

**Domains**:
- AI governance (AI2027, alignment, race dynamics)
- Climate (emissions, tipping points, adaptation)
- Biosecurity (pandemic response, gain-of-function research)
- Nuclear (proliferation, arms control)
- Social (polarization, misinformation, trust collapse)

**Test**: Build 2-3 scenarios per domain, see if patterns emerge

**Success**: System handles all domains without major architectural changes

---

### Q7.2: Can GMs remix/fork scenarios?

**Idea**: Scenario library where GMs can start from template, tweak

**Example**:
```
Base: "AI2027" (Kokotajlo)
Fork 1: "AI2027 - Optimistic alignment" (easier alignment, slower compute)
Fork 2: "AI2027 - China leads" (reverse actors)
Fork 3: "AI2027 - Open source world" (no secrets, full transparency)
```

**Test**: Build forking UI, see if GMs actually use it

---

## 8. Validation and Calibration

### Q8.1: How do we validate a scenario has "reasonable" parameters?

**Heuristics**:
- Probabilities sum to ≤1
- ODE flows don't cause variables to leave bounds
- Timescales are realistic (not "catastrophe in 2 hours")
- Outcome distributions aren't degenerate (P(catastrophe) = 0.99 always)

**Test**: Build validator, run on 50 scenarios, measure false positive rate

---

### Q8.2: Can we calibrate to expert forecasts?

**Idea**: If Metaculus says P(AGI by 2030) = 0.25, can we tune model to match?

**Method**:
1. Extract forecast: P(event X by year Y)
2. Run model monte carlo
3. Adjust parameters to minimize error
4. Return calibrated spec

**Test**: Calibrate AI2027 to Metaculus AGI forecasts

**Challenge**: Underdetermined problem (many param sets could match)

---

### Q8.3: How do we handle deep uncertainty?

**Question**: What if GM says "I genuinely don't know if alignment is hard or easy"

**Options**:
- Scenario branching (run both versions, let players explore)
- Probability distribution over parameters (not point estimates)
- Explicit uncertainty bounds (alignment difficulty ∈ [0.1, 0.5])

**Test**: Build UI for uncertainty specification, see if GMs use it

---

## 9. Player Experience

### Q9.1: Do players learn from formal models?

**Hypothesis**: Seeing formal state helps players understand dynamics

**Test**:
1. Group A: Plays with formal state hidden
2. Group B: Plays with formal state visible
3. Post-game quiz: "What affects P(catastrophe)?"
4. Measure: Group B learns more

**Application**: Educational mode should always show formal state

---

### Q9.2: Do players want more control over formal model?

**Question**: Should players be able to see/tweak the spec?

**Spectrum**:
- Level 0: Pure narrative (formal state hidden)
- Level 1: See formal state, can't change
- Level 2: See formal state, can request GM changes
- Level 3: Direct editing (power users)

**Test**: Offer all levels, measure preference

---

### Q9.3: How do we explain formal notation to non-technical players?

**Challenge**: Guards like `(compute - 24) - 10 * alignment > 8` are opaque

**Solutions**:
- Natural language tooltips: "Alignment gap exceeds danger threshold"
- Visual representations: Color-coded danger zones
- Simplified mode: Show trends, hide equations

**Test**: Show same scenario with different explanation levels, measure comprehension

---

## 10. Long-Term Vision

### Q10.1: Can Simulacra become a general scenario exploration platform?

**Vision**: Not just TTX games, but:
- Policy analysis dashboards
- Research tools for formal modeling
- Educational simulations
- Forecasting tournaments

**Test**: Build one non-TTX application (e.g., policy dashboard), see if Matrix generalizes

---

### Q10.2: Can we integrate real-time data?

**Idea**: Connect to live data feeds (compute scaling, chip exports, AI incidents)

**Example**:
```
Scenario: "AI Race 2024"
Real-time: Pull latest compute estimates from Epoch AI
Auto-calibrate: Update model to match current trajectory
```

**Test**: Build proof-of-concept with one data source

---

### Q10.3: Can we support multiplayer collaborative model-building?

**Vision**: Multiple GMs collaboratively building a scenario

**Example**:
```
GM 1 (AI expert): Defines compute scaling, alignment difficulty
GM 2 (Geopolitics expert): Defines US-China dynamics, treaty formation
GM 3 (Econ expert): Defines economic incentives, deployment pressure

System: Merges into unified formal model
```

**Test**: Build collaborative editing, handle merge conflicts

---

## Prioritization

### Must-Answer (Beta Launch)
1. Q1.1: LLM extraction accuracy
2. Q2.2: Does grounding improve trust?
3. Q3.1: How often do specs need tweaking?
4. Q5.1: Real-time performance
5. Q9.2: Do players want to see formal state?

### Should-Answer (v1.0)
6. Q1.3: Time savings from elicitation
7. Q2.3: Tool call frequency
8. Q4.1: When is HA overkill?
9. Q6.2: Single vs multi-agent
10. Q7.1: How many scenarios to validate?

### Nice-to-Answer (v2.0+)
11. Q4.2: Do formalisms give different outcomes?
12. Q8.2: Calibration to expert forecasts
13. Q10.1: General platform vision
14. Q10.2: Real-time data integration
15. Q10.3: Multiplayer model-building

---

## Experimental Design Template

For each question:

```markdown
### Question: [State question clearly]

**Hypothesis**: [What do we expect?]

**Test Protocol**:
1. [How to test]
2. [What to measure]
3. [How to analyze]

**Success Criteria**: [What result validates hypothesis?]

**Failure Modes**: [What could go wrong?]

**Timeline**: [How long will this take?]

**Dependencies**: [What needs to be built first?]

**Stakeholders**: [Who needs to approve/review?]
```

---

## Next Steps

1. **Select 5 priority questions** for beta testing
2. **Design experiments** using template above
3. **Build minimal tooling** to run experiments
4. **Recruit test GMs** (Kokotajlo, AI safety researchers, policy analysts)
5. **Run experiments** and collect data
6. **Iterate architecture** based on findings
