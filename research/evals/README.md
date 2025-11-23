# Formalism Evaluation Framework

**Purpose**: Systematic comparison of formal modeling approaches to help GMs choose the right formalism for their scenario.

**Philosophy**: There is no "best" formalism - only the right formalism for a given problem. This framework helps make that choice explicit and principled.

---

## Motivation

When a GM wants to formalize a scenario, they face a choice:
- **System Dynamics (SD)**: Continuous stocks and flows
- **Agent-Based Model (ABM)**: Heterogeneous agents with local rules
- **Hybrid Automaton (HA)**: Discrete modes + continuous dynamics
- **Markov Decision Process (MDP)**: Stochastic transitions with rewards
- **Kripke Structure**: Pure discrete states for model checking
- **Timed Automata (TA)**: Discrete + real-valued clocks

**Question**: Which formalism fits their problem?

**Current state**: Informal intuition, trial and error

**Goal**: Systematic evaluation framework with:
1. **Normalized dimensions** for comparison
2. **Quantitative benchmarks** (performance, scalability)
3. **Qualitative criteria** (expressiveness, learnability)
4. **Visual comparison** (spider graphs)
5. **Decision tree** (scenario → recommended formalism)

---

## Framework Structure

```
research/evals/
├── README.md (this file)
├── dimensions.md                   # Define comparison dimensions
├── formalism_profiles.md           # Score each formalism on dimensions
├── scenario_benchmarks.md          # Standard test scenarios
├── decision_tree.md                # When to use which formalism
├── spider_graphs.md                # Visual comparison templates
└── case_studies/
    ├── ai2027_comparison.md        # AI governance across formalisms
    ├── pandemic_comparison.md      # Epidemic control comparison
    └── fisheries_comparison.md     # Social-ecological systems
```

---

## Evaluation Dimensions

We evaluate formalisms across **8 key dimensions**:

### 1. Expressiveness
**What can the formalism represent?**
- Continuous dynamics (ODEs)
- Discrete events
- Stochasticity
- Time constraints
- Agent heterogeneity
- Spatial structure

**Metrics**:
- Boolean capabilities (can express X: yes/no)
- Complexity class (what decision problems are decidable)

---

### 2. Computational Tractability
**How efficiently can we simulate/verify?**
- Simulation speed
- State space size (finite vs infinite)
- Decidability (can we prove properties?)
- Scalability (how many agents/variables?)

**Metrics**:
- Time complexity (O(n), O(2^n), etc.)
- Memory requirements
- Real-time feasibility (<5s for player action)

---

### 3. Learnability (GM Ease of Use)
**How easy is it for a GM to build a model?**
- Conceptual simplicity
- Tooling support
- Visual metaphors
- Debugging difficulty

**Metrics**:
- Time to first working model (hours)
- GM expertise required (1-5 scale)
- Learning curve steepness

---

### 4. Verification Support
**Can we prove properties? Check correctness?**
- Model checking tools available
- Temporal logic support (LTL, CTL, PCTL, TCTL)
- Reachability analysis
- Counterexample generation

**Metrics**:
- Boolean: supports formal verification (yes/no)
- Tool maturity (0-5 scale)
- Property types supported

---

### 5. Continuous vs Discrete
**What's the balance?**
- Pure continuous (SD)
- Pure discrete (Kripke)
- Hybrid (HA, SHA)

**Metrics**:
- Ratio of continuous to discrete components
- ODE integration required (yes/no)

---

### 6. Stochasticity
**How is uncertainty handled?**
- Deterministic
- Probabilistic (discrete probabilities)
- Stochastic (continuous noise)

**Metrics**:
- Uncertainty representation (none, discrete, continuous)
- Monte Carlo required (yes/no)

---

### 7. Modularity & Composability
**Can models be combined/reused?**
- Modular components
- Hierarchical composition
- Library of reusable patterns

**Metrics**:
- Composability score (0-5)
- Interoperability with other formalisms

---

### 8. Tool Ecosystem
**What tools are available?**
- Simulators
- Model checkers
- Visualizers
- Export formats

**Metrics**:
- Number of mature tools
- Open-source availability
- Integration difficulty

---

## Scoring System

Each formalism is scored on each dimension using a **normalized 0-5 scale**:

**0**: Not supported / Very poor
**1**: Minimal support / Poor
**2**: Basic support / Fair
**3**: Good support / Average
**4**: Strong support / Good
**5**: Excellent support / Best in class

**Special scores**:
- **N/A**: Not applicable (e.g., "continuous dynamics" for pure discrete formalism)
- **0***: Theoretically possible but impractical

---

## Example Scoring (System Dynamics)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Expressiveness** | 3/5 | Good for continuous, weak for discrete events |
| **Computational Tractability** | 5/5 | Fast simulation (Euler, RK4), finite variables |
| **Learnability** | 5/5 | Stock-flow diagrams intuitive, tools like Vensim |
| **Verification Support** | 1/5 | No formal verification, manual analysis only |
| **Continuous/Discrete** | 5/0 | Pure continuous (ODEs), no discrete jumps |
| **Stochasticity** | 2/5 | Can add noise, but limited compared to SHA |
| **Modularity** | 4/5 | Hierarchical models, subsystems |
| **Tool Ecosystem** | 5/5 | Mature tools (Vensim, Stella, PySD) |

**Spider graph coordinates**: [3, 5, 5, 1, 5, 2, 4, 5]

---

## Benchmark Scenarios

To compare formalisms empirically, we use **standard test scenarios**:

### Benchmark 1: Simple Epidemic (SIR)
**Features**: Continuous (population dynamics), discrete (policy interventions)

**Comparison**:
- **SD**: Natural fit for SIR equations
- **ABM**: Models individual infection events
- **HA**: Modes = {Normal, Mitigation, Suppression}, continuous SIR
- **MDP**: State space explosion (too many states)

**Winner**: SD for continuous, HA for policy analysis

---

### Benchmark 2: AI Race Dynamics
**Features**: Continuous (compute, alignment), discrete (modes), stochastic (espionage)

**Comparison**:
- **SD**: Can't handle discrete mode changes
- **HA**: Perfect fit (modes + continuous)
- **SHA**: Adds stochasticity (probabilistic transitions)
- **ABM**: Could model individual labs, but overkill

**Winner**: HA or SHA

---

### Benchmark 3: Traffic Light Controller
**Features**: Discrete (light states), timed (green for 30s)

**Comparison**:
- **Kripke**: Can model, but no timing
- **Timed Automata**: Perfect fit
- **HA**: Overkill (no continuous dynamics needed)
- **MDP**: Possible, but no temporal logic

**Winner**: Timed Automata

---

## Decision Tree

```
Does scenario have continuous dynamics (ODEs)?
  ├─ No → Go to (A)
  └─ Yes → Does it have discrete mode changes?
       ├─ No → System Dynamics (SD)
       └─ Yes → Does it have stochastic transitions?
            ├─ No → Hybrid Automaton (HA)
            └─ Yes → Stochastic Hybrid Automaton (SHA)

(A) Does scenario have probabilistic transitions?
  ├─ No → Does it have timing constraints?
  │    ├─ No → Kripke Structure
  │    └─ Yes → Timed Automata (TA)
  └─ Yes → Does it need rewards/costs?
       ├─ No → DTMC (Discrete-Time Markov Chain)
       └─ Yes → MDP (Markov Decision Process)

Special case: Agent heterogeneity important?
  → Consider Agent-Based Model (ABM)
  → Can combine with HA (individual agents, aggregate HA)
```

---

## Spider Graph Template

For visual comparison, we use radar charts with 8 axes:

```
         Expressiveness
               |
      Modularity + Tractability
          /         \
    Tool Ecosystem   Learnability
         |             |
   Stochasticity - Verification
         \         /
      Continuous/Discrete
```

**Example**:
- **SD**: [3, 5, 5, 1, 5, 2, 4, 5] → Large pentagon (strong on most, weak on verification)
- **Kripke**: [2, 5, 3, 5, 0, 0, 2, 4] → Spikey (strong verification, no continuous)
- **HA**: [5, 3, 3, 3, 3, 3, 3, 3] → Balanced octagon (jack-of-all-trades)

---

## Case Studies

We provide **detailed comparisons** for 3 canonical scenarios:

1. **[AI2027](case_studies/ai2027_comparison.md)**
   - Test: Model with SD, HA, SHA, MDP, ABM
   - Metrics: Implementation time, expressiveness, verification
   - Result: HA wins (discrete modes + continuous + verifiable)

2. **[Pandemic Response](case_studies/pandemic_comparison.md)**
   - Test: COVID-19 mitigation policies
   - Metrics: Realism, calibration, policy exploration
   - Result: ABM for detailed, HA for high-level

3. **[Fisheries Collapse](case_studies/fisheries_comparison.md)**
   - Test: Social-ecological system dynamics
   - Metrics: Ecological accuracy, social dynamics, regime shifts
   - Result: HA (regime shifts critical), SD (continuous ecology)

---

## How to Use This Framework

**For GMs**:
1. Read [decision_tree.md](decision_tree.md) to get initial recommendation
2. Check [formalism_profiles.md](formalism_profiles.md) for detailed scores
3. View [spider_graphs.md](spider_graphs.md) for visual trade-offs
4. Read relevant case study if available

**For Developers**:
1. Use [dimensions.md](dimensions.md) to understand evaluation criteria
2. Use [scenario_benchmarks.md](scenario_benchmarks.md) for testing
3. Add new formalisms by scoring on all dimensions
4. Generate spider graphs for comparison

**For Researchers**:
1. Propose new dimensions if needed
2. Run empirical benchmarks
3. Update scores based on data
4. Add new case studies

---

## Validation

This framework is validated by:

1. **Expert Review**: AI safety researchers, formal methods experts
2. **Empirical Testing**: Implement same scenario in multiple formalisms
3. **User Studies**: Do GMs using decision tree choose better formalisms?
4. **Case Study Accumulation**: More scenarios → better recommendations

**Status**: Initial draft (2025-11-23)
**Next**: Implement spider graph generator, run benchmark comparisons

---

## Related Documents

- [../architecture_questions/](../architecture_questions/) - Why we need multiple formalisms
- [../ai_futures/](../ai_futures/) - Theoretical foundations
- [../matrix/](../matrix/) - Universal adapter interface
- [../mentor_feedback/FINAL_ASSESSMENT.md](../mentor_feedback/FINAL_ASSESSMENT.md) - Need for empirical validation

---

## Contributing

To add a new formalism:
1. Score on all 8 dimensions (0-5 scale)
2. Add profile to `formalism_profiles.md`
3. Update spider graph comparison
4. Add to decision tree if it opens new space

To add a benchmark scenario:
1. Implement in 3+ formalisms
2. Measure implementation time, LoC, performance
3. Document in `scenario_benchmarks.md`
4. Update case studies

---

**Status**: Framework v1.0
**Last updated**: 2025-11-23
**Contributors**: Claude (assistant), MedhAI (evaluation philosophy)
