# Evaluation Dimensions

**Purpose**: Define the 8 normalized dimensions used to compare formal modeling approaches.

Each dimension is scored **0-5** with clear criteria for each score level.

---

## Dimension 1: Expressiveness

**Question**: What kinds of system behaviors can this formalism represent?

### Sub-dimensions

**1.1 Continuous Dynamics**
- Can the formalism model continuous variables evolving via differential equations?
- **0**: No continuous variables
- **3**: Discrete-time approximation (difference equations)
- **5**: Full ODE support with integration

**1.2 Discrete Events**
- Can the formalism model instantaneous state changes?
- **0**: Pure continuous (no jumps)
- **3**: Mode switches with limited control
- **5**: Arbitrary discrete events with guards

**1.3 Stochasticity**
- Can the formalism represent uncertainty?
- **0**: Deterministic only
- **2**: Probabilistic discrete events
- **4**: Continuous stochastic processes (SDEs)
- **5**: Full probabilistic temporal logic

**1.4 Time Constraints**
- Can the formalism reason about timing?
- **0**: No timing
- **2**: Implicit time (step count)
- **4**: Real-valued clocks
- **5**: Dense-time semantics with TCTL

**1.5 Agent Heterogeneity**
- Can the formalism model diverse individual agents?
- **0**: Aggregate only (no individuals)
- **3**: Homogeneous agents (all identical)
- **5**: Full heterogeneity (each agent unique)

### Overall Expressiveness Score

**Aggregation**: Average of sub-dimensions or max if one is critical

**Examples**:
- **SD**: [5, 0, 2, 2, 0] → 1.8 → **2/5** (continuous-only)
- **HA**: [5, 5, 0, 3, 0] → 2.6 → **3/5** (hybrid, no stochasticity)
- **SHA**: [5, 5, 4, 3, 0] → 3.4 → **4/5** (hybrid + stochastic)
- **ABM**: [0, 5, 3, 1, 5] → 2.8 → **5/5** (heterogeneity critical)

---

## Dimension 2: Computational Tractability

**Question**: How efficiently can we simulate or verify this formalism?

### Sub-dimensions

**2.1 Simulation Speed**
- How fast can we generate a single trajectory?
- **0**: Intractable (exponential in state space)
- **2**: Slow (requires Monte Carlo, >10s per trajectory)
- **4**: Fast (ODE integration, <1s)
- **5**: Real-time (<100ms)

**2.2 State Space**
- How large is the state space?
- **0**: Infinite continuous (uncountable)
- **2**: Hybrid (infinite but structured)
- **4**: Large finite (10^6 states)
- **5**: Small finite (10^3 states)

**2.3 Decidability**
- Are verification problems decidable?
- **0**: Undecidable (general HA)
- **2**: Decidable fragments exist (rectangular HA)
- **4**: Decidable (timed automata, PSPACE-complete)
- **5**: Decidable and tractable (finite Kripke, polynomial)

**2.4 Scalability**
- How many variables/agents before breakdown?
- **0**: <10 (state explosion)
- **2**: 10-100
- **4**: 100-1000
- **5**: 1000+ (linear complexity)

### Overall Tractability Score

**Aggregation**: Harmonic mean (penalize any bottleneck)

**Examples**:
- **SD**: [5, 0, 0, 5] → **5/5** (fast sim, scales well, but infinite state)
- **Kripke**: [4, 5, 5, 3] → **4/5** (finite, decidable, but state explosion)
- **HA**: [4, 0, 0, 4] → **3/5** (fast sim, but infinite + undecidable)
- **ABM**: [2, 0, 0, 2] → **2/5** (slow Monte Carlo, doesn't scale)

---

## Dimension 3: Learnability (GM Ease of Use)

**Question**: How easy is it for a GM to build a model in this formalism?

### Sub-dimensions

**3.1 Conceptual Simplicity**
- How intuitive is the formalism?
- **0**: Requires grad-level math (measure theory, stochastic calculus)
- **2**: Requires undergrad math (ODEs, probability)
- **4**: Intuitive metaphors (stocks/flows, state machines)
- **5**: No math background needed

**3.2 Visual Metaphors**
- Does the formalism have good visual representations?
- **0**: Purely textual (equations only)
- **2**: Graph representations (state diagrams)
- **4**: Domain-specific diagrams (stock-flow, agent icons)
- **5**: Interactive visual editors

**3.3 Tooling Quality**
- Are there GM-friendly tools?
- **0**: No tools (manual coding)
- **2**: Research tools (CLI only)
- **4**: GUI tools (drag-and-drop)
- **5**: Commercial tools with tutorials

**3.4 Debugging**
- How easy is it to find and fix errors?
- **0**: Opaque (hard to understand failures)
- **2**: Traces available (can inspect execution)
- **4**: Visual debugging (highlight error states)
- **5**: Automatic repair suggestions

### Overall Learnability Score

**Aggregation**: Minimum (weakest link determines ease of use)

**Examples**:
- **SD**: [4, 5, 5, 4] → **4/5** → **5/5** (Vensim is gold standard)
- **Kripke**: [3, 2, 2, 3] → **2/5** → **3/5** (state diagrams help)
- **HA**: [2, 3, 2, 2] → **2/5** → **3/5** (requires ODEs + guards)
- **ABM**: [4, 4, 4, 3] → **3/5** → **4/5** (Mesa, NetLogo friendly)

---

## Dimension 4: Verification Support

**Question**: Can we formally prove properties about the model?

### Sub-dimensions

**4.1 Model Checking Tools**
- Are there mature model checkers?
- **0**: No tools
- **2**: Research prototypes (PRISM, UPPAAL)
- **4**: Production tools (SPIN, NuSMV)
- **5**: Push-button verification (PRISM GUI)

**4.2 Temporal Logic**
- What logics are supported?
- **0**: None
- **2**: LTL (linear time)
- **3**: CTL (branching time)
- **4**: PCTL (probabilistic)
- **5**: TCTL (timed)

**4.3 Reachability Analysis**
- Can we compute reachable states?
- **0**: No (infinite state space, undecidable)
- **2**: Over-approximation (sound but incomplete)
- **4**: Exact (symbolic methods)
- **5**: Exact + efficient

**4.4 Counterexamples**
- Does the tool generate counterexamples?
- **0**: No
- **3**: Yes, but cryptic
- **5**: Yes, with trace visualization

### Overall Verification Score

**Aggregation**: Average (all aspects matter)

**Examples**:
- **Kripke**: [5, 4, 5, 5] → **5/5** (SPIN, NuSMV mature)
- **Timed Automata**: [4, 5, 4, 4] → **4/5** (UPPAAL excellent)
- **MDP**: [4, 4, 3, 4] → **4/5** (PRISM mature)
- **SD**: [0, 0, 0, 0] → **1/5** (manual analysis only)
- **HA**: [2, 2, 2, 2] → **2/5** (research tools, limited)

---

## Dimension 5: Continuous vs Discrete Balance

**Question**: What's the ratio of continuous to discrete components?

**Metric**: Single score representing the balance

- **0**: Pure discrete (no continuous variables)
- **2**: Mostly discrete, some continuous (e.g., clocks)
- **3**: Hybrid (equal weight)
- **4**: Mostly continuous, some discrete (e.g., modes)
- **5**: Pure continuous (ODEs only)

**Special scoring**:
- Can also report as tuple: (continuous_score, discrete_score)
- Example: HA = (5, 5) means full hybrid support

**Examples**:
- **SD**: **5/5** (pure continuous)
- **Kripke**: **0/5** (pure discrete)
- **Timed Automata**: **2/5** (mostly discrete + clocks)
- **HA**: **3/5** (balanced hybrid)
- **MDP**: **0/5** (discrete state/action)

---

## Dimension 6: Stochasticity

**Question**: How is uncertainty represented?

### Levels

**0**: Deterministic
- Single trajectory
- No randomness

**1**: Parameter uncertainty
- Model has parameters with ranges
- Sensitivity analysis possible
- Not inherently stochastic

**2**: Discrete probability
- Probabilistic transitions (p ∈ [0,1])
- Discrete random variables
- Monte Carlo required

**3**: Continuous noise
- Wiener processes (Brownian motion)
- Stochastic Differential Equations (SDEs)
- Diffusion processes

**4**: Full probabilistic temporal logic
- Properties are probabilistic (P[F ϕ] ≥ 0.95)
- Quantitative model checking
- Probability distributions over traces

**5**: Higher-order uncertainty
- Uncertainty about probabilities (credal sets)
- Imprecise probabilities
- Robust verification

### Examples

- **SD**: **1/5** (parameters uncertain, but dynamics deterministic)
- **Kripke**: **0/5** (fully deterministic)
- **DTMC**: **2/5** (discrete probabilities)
- **MDP**: **2/5** (discrete probabilities + nondeterminism)
- **SHA**: **3/5** (continuous noise)
- **Probabilistic model checking**: **4/5** (PCTL, PSPACE)

---

## Dimension 7: Modularity & Composability

**Question**: Can models be built from reusable components?

### Sub-dimensions

**7.1 Hierarchical Composition**
- Can subsystems be nested?
- **0**: Flat models only
- **3**: Subsystems with well-defined interfaces
- **5**: Arbitrary nesting depth

**7.2 Parallel Composition**
- Can independent components run concurrently?
- **0**: Monolithic
- **3**: Parallel composition with synchronization
- **5**: Fully compositional semantics (CSP-style)

**7.3 Reusable Patterns**
- Are there libraries of common patterns?
- **0**: Every model from scratch
- **3**: Some templates available
- **5**: Rich library (epidemics, economics, ecology)

**7.4 Interface Abstraction**
- Can components hide implementation?
- **0**: No encapsulation
- **3**: Interfaces defined, but leaky
- **5**: Perfect black-box abstraction

### Overall Modularity Score

**Aggregation**: Average

**Examples**:
- **SD**: [5, 2, 5, 3] → **4/5** (Vensim subsystems, stock patterns)
- **Kripke**: [3, 5, 3, 4] → **4/5** (compositional semantics)
- **HA**: [3, 3, 2, 2] → **3/5** (composition exists but complex)
- **ABM**: [2, 2, 3, 1] → **2/5** (hard to compose agent systems)

---

## Dimension 8: Tool Ecosystem

**Question**: What tools are available for this formalism?

### Sub-dimensions

**8.1 Simulators**
- How many simulation tools exist?
- **0**: None (manual implementation)
- **2**: 1-2 research tools
- **4**: 3-5 tools, at least one mature
- **5**: 10+ tools, commercial options

**8.2 Model Checkers**
- How many verification tools exist?
- **0**: None
- **2**: 1-2 research tools
- **4**: 3-5 tools, production-ready
- **5**: Multiple mature tools

**8.3 Visualizers**
- Are there visualization tools?
- **0**: No visualization
- **2**: Basic plotting (matplotlib)
- **4**: Interactive visualization
- **5**: Real-time 3D animation

**8.4 Interoperability**
- Can models be exported/imported?
- **0**: Proprietary formats only
- **2**: Text-based format (custom)
- **4**: Standard format (e.g., SBML for SD)
- **5**: Multiple export formats (JSON, XML, PRISM, etc.)

### Overall Tool Ecosystem Score

**Aggregation**: Sum (more tools = better)

**Examples**:
- **SD**: [5, 0, 4, 4] → **5/5** (Vensim, Stella, PySD, Insight Maker, etc.)
- **Kripke**: [3, 5, 3, 4] → **4/5** (SPIN, NuSMV, TLA+)
- **Timed Automata**: [4, 4, 3, 4] → **4/5** (UPPAAL, KRONOS)
- **HA**: [2, 2, 2, 2] → **2/5** (SpaceEx, HyTech, research-grade)
- **ABM**: [5, 0, 5, 3] → **4/5** (Mesa, NetLogo, RePast, FLAME)

---

## Normalization Procedure

To ensure consistent scoring across dimensions:

### Step 1: Define anchor points
- **0/5**: Identify worst-case formalism for this dimension
- **5/5**: Identify best-case formalism for this dimension

### Step 2: Score relatively
- Place other formalisms between anchors
- Use half-points if needed (e.g., 3.5/5)

### Step 3: Validate
- Ask: "Is formalism A really 2x better than formalism B on this dimension?"
- If unclear, add sub-dimensions

### Step 4: Document rationale
- For each score, write 1-sentence justification
- Include references (papers, tools) where applicable

---

## Aggregation Strategies

Different dimensions use different aggregation methods:

| Dimension | Method | Rationale |
|-----------|--------|-----------|
| Expressiveness | Average or Max | One capability may dominate |
| Tractability | Harmonic Mean | Bottlenecks matter |
| Learnability | Minimum | Weakest link |
| Verification | Average | All aspects matter |
| Continuous/Discrete | Direct score | Single metric |
| Stochasticity | Direct score | Single metric |
| Modularity | Average | All aspects matter |
| Tool Ecosystem | Sum | More is better |

---

## Adding New Dimensions

If a new dimension is proposed:

1. **Justify**: Why does this dimension capture something the other 8 don't?
2. **Define**: What's being measured? (clear question)
3. **Anchor**: What's 0/5 and 5/5?
4. **Score**: Evaluate all existing formalisms
5. **Validate**: Do scores match intuition?
6. **Document**: Add to this file

**Candidate dimensions** (not yet included):
- **Data integration**: Can the formalism be calibrated to real data?
- **Multi-scale**: Can the formalism handle multiple timescales?
- **Explainability**: Can humans understand the model's behavior?
- **Robustness**: How sensitive is the model to parameter changes?

---

## Related Documents

- [formalism_profiles.md](formalism_profiles.md) - Actual scores for each formalism
- [spider_graphs.md](spider_graphs.md) - Visual representation
- [decision_tree.md](decision_tree.md) - Uses these dimensions for routing

---

**Status**: v1.0 (8 dimensions defined)
**Last updated**: 2025-11-23
**Contributors**: Claude (assistant), MedhAI (evaluation philosophy)
