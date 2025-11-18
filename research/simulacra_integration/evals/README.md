# Evaluation Framework: Comparing Modeling Approaches

**Purpose**: Systematic comparison of formal modeling approaches for complex socio-technical systems

**Philosophy**: Design should be **abstract and extensible**, implementation should be **pragmatic**. We're in **design exploration** (babble phase), not implementation (prune phase).

---

## Overview

This folder evaluates different modeling formalisms across multiple dimensions to:
1. **Understand trade-offs** - No single formalism dominates all use cases
2. **Identify synergies** - How to combine strengths and mitigate weaknesses
3. **Guide design** - Choose the right tool for each layer of our stack
4. **Ensure portability** - Design abstractions that work beyond AI governance

**Key Insight**: Our marquee use case is AI governance, but the design should generalize to:
- Climate policy modeling
- Pandemic response
- Financial regulation
- Infrastructure resilience
- Social-ecological systems

---

## Evaluation Structure

### 1. Quantitative Comparison ([comparison_matrix.md](comparison_matrix.md))

Systematic scoring across **12 key dimensions**:

**Expressiveness**:
- Continuous dynamics support
- Discrete state modeling
- Stochastic/probabilistic reasoning
- Temporal logic expressiveness
- Multi-agent heterogeneity

**Verification & Analysis**:
- Formal verification support
- Decidability/tractability
- Tool ecosystem maturity

**Practical Considerations**:
- Learning curve
- Scalability to large systems
- Policy communication effectiveness
- Implementation complexity

**Scoring**: 1-5 scale with justifications and examples

---

### 2. Qualitative Analysis ([qualitative_analysis.md](qualitative_analysis.md))

**Strengths & Weaknesses**:
- What each approach does best
- Where it breaks down
- Real-world examples of success/failure

**Synthesis Strategies**:
- How to combine approaches
- Best-of-breed hybrid architectures
- Where to use what in our stack

**Design Patterns**:
- Canonical use cases for each formalism
- Anti-patterns to avoid
- Migration paths between formalisms

---

### 3. Macro-Scale Alternatives ([macro_alternatives.md](macro_alternatives.md))

Extended comparison of **macro-level modeling approaches**:
- System Dynamics (SD)
- Agent-Based Models (ABM)
- Hybrid Automata (HA)
- DEVS / System-of-Systems
- Petri Nets
- Logic-centric formalisms (dL, KeYmaera X)

**Focus**: When each shines for **large-scale socio-technical systems**, not just toy models

---

### 4. Discrete-Time Modeling ([discrete_time_modeling.md](discrete_time_modeling.md))

**Pragmatic focus**: Simulation and exploration **without formal verification**

**Key argument**: For macro strategic problems (AI governance, climate, pandemic):
- **Discrete time beats continuous** - matches real decision rhythms (monthly policies, quarterly budgets)
- **Simulation beats verification** - stakeholders want scenarios, not theorems on approximate equations
- **10x faster** - Monte Carlo exploration, clear semantics, easier implementation

**Time quantum**: User selects horizon H (years) and resolution N (ticks) → Δt = H/N

**Recommended**: Discrete-time hybrid system (modes + difference equations + agents) with Δt = 1 month for AI-2027

---

### 5. Use Case Portability ([use_case_portability.md](use_case_portability.md))

**Abstract design principles** that generalize across domains:
- Climate governance ↔ AI governance
- Pandemic response ↔ AI risk scenarios
- Financial stability ↔ AI lab dynamics

**Portability checklist**:
- Generic state abstractions (not AI-specific)
- Configurable dynamics (swap ODEs, guards)
- Domain-agnostic properties (safety, liveness, fairness)

---

## Approaches Under Evaluation

### Micro-Level (Individual Decisions)
1. **Finite State Machines (FSM)** - Deterministic discrete transitions
2. **Kripke Structures** - States + atomic propositions + LTL/CTL
3. **Markov Decision Processes (MDP)** - Probabilistic transitions, value functions
4. **Labeled Transition Systems (LTS)** - Actions as labels, nondeterminism

### Continuous Dynamics
5. **System Dynamics (SD)** - Stock-flow models, feedback loops
6. **Ordinary Differential Equations (ODE)** - Pure continuous, no discrete modes

### Hybrid (Discrete + Continuous)
7. **Hybrid Automata (HA)** - Modes + flows + guards + resets
8. **Stochastic Hybrid Automata (SHA)** - HA + probabilistic transitions
9. **Hybrid Petri Nets** - Tokens + continuous places
10. **DEVS (Discrete Event System Specification)** - Modular hybrid simulation

### Agent-Based
11. **Agent-Based Models (ABM)** - Heterogeneous agents, emergent macro
12. **Multi-Agent Systems (MAS)** - Strategic interaction, game theory

### Narrative/Generative
13. **LLM-driven Simulation** - Natural language state, generative transitions

### Formal Verification
14. **Temporal Logics** (LTL, CTL, PCTL, TCTL) - Property specification
15. **Differential Dynamic Logic (dL)** - Hybrid programs + proof

---

## How to Use This Evaluation

### For Design Decisions

**Question**: "Should we use HA or SD for the core model?"

**Process**:
1. Check [comparison_matrix.md](comparison_matrix.md) - Compare scores on relevant dimensions
2. Read [qualitative_analysis.md](qualitative_analysis.md) - Understand strengths/weaknesses
3. Review [macro_alternatives.md](macro_alternatives.md) - See when each shines for macro problems
4. Decide: "Use SD for macro skeleton, HA for critical subsystems we want to verify"

### For Implementation

**Question**: "How do we build a prototype that validates the design?"

**Process**:
1. Design phase is **over** - we've explored the space
2. Implementation: **prune** to what works for AI-2027 MVP
3. Keep design **abstract** (generic interfaces, swappable backends)
4. Implement **pragmatically** (start simple, add complexity only when needed)

### For Extension to New Domains

**Question**: "Can this work for climate governance?"

**Process**:
1. Check [use_case_portability.md](use_case_portability.md) - Review abstraction principles
2. Map climate domain to generic abstractions (modes, continuous state, agents)
3. Swap in climate-specific dynamics (carbon cycle ODEs, policy modes)
4. Reuse verification infrastructure (same temporal logic, same tools)

---

## Evaluation Principles

### 1. No Silver Bullet
**Every formalism has trade-offs**. We evaluate honestly, not trying to "win" for any particular approach.

### 2. Synergy Over Purity
**Hybrid approaches often beat pure ones**. The best system combines SD + ABM + HA + temporal logic, using each where it shines.

### 3. Design ≠ Implementation
**Design** should be abstract and general. **Implementation** should be concrete and pragmatic. Don't conflate the two.

Example:
- **Design**: "Our canonical contract supports hybrid automata with generic flow equations"
- **Implementation**: "For MVP, we use Euler integration with dt=0.1 because it's simple and works"

### 4. Validate with Multiple Use Cases
**AI governance is the test case, not the only case**. If our abstractions don't generalize to climate or pandemics, we've overfit.

### 5. Quantitative + Qualitative
**Scores are useful, stories are essential**. A dimension score of 3/5 means nothing without understanding *why* and *when* that matters.

---

## Comparison Dimensions Explained

### Expressiveness Dimensions

1. **Continuous Dynamics** - Can it model ODEs, flows, accumulations?
2. **Discrete State** - Can it model modes, phases, regimes?
3. **Stochastic** - Can it model uncertainty, probabilities, randomness?
4. **Temporal Logic** - Can it express "always", "eventually", "until"?
5. **Heterogeneity** - Can it model many different agents/actors?

### Verification Dimensions

6. **Formal Verification** - Can we *prove* properties, not just simulate?
7. **Decidability** - Are verification questions algorithmically solvable?
8. **Tool Ecosystem** - Are there mature, maintained tools?

### Practical Dimensions

9. **Learning Curve** - How hard to learn for practitioners?
10. **Scalability** - Does it handle 1000s of states/agents?
11. **Communication** - Can we show it to policymakers?
12. **Implementation** - How hard to build a working system?

---

## Synthesis: The Three-Tier Architecture

Based on our evaluation, we propose a **three-tier architecture**:

### Tier 1: Macro Skeleton (System Dynamics)
- **Purpose**: Capture big feedback loops, macro dynamics
- **Formalism**: SD with stocks, flows, delays
- **Tools**: Vensim, Stella, custom ODE solvers
- **Example**: Global compute growth, public trust, alignment capacity

### Tier 2: Meso Transitions (Hybrid Automata)
- **Purpose**: Governance regimes, critical transitions, verification
- **Formalism**: SHA with modes, guards, flow equations
- **Tools**: Custom HA engine → SpaceEx/PRISM for verification
- **Example**: Baseline → Race → Pause mode transitions

### Tier 3: Micro Decisions (Agent-Based)
- **Purpose**: Lab strategies, policy choices, heterogeneity
- **Formalism**: ABM with game-theoretic agents
- **Tools**: Custom agents, rule-based or learning
- **Example**: US lab vs China lab strategic interaction

**Key**: Each tier uses the right formalism, they integrate via well-defined interfaces (see [../hybrid_automata/integration.md](../hybrid_automata/integration.md))

---

## Related Documentation

### Framework Documentation
- [Hybrid Automata Framework](../hybrid_automata/framework.md) - HA definitions and semantics
- [Integration Patterns](../hybrid_automata/integration.md) - SD+ABM+HA coupling
- [Tools & Verification](../hybrid_automata/tools_and_verification.md) - Practical workflows

### Design Documentation
- [Model Design](../mvp_docs/model_design.md) - Progressive HA implementation
- [Tech Design](../mvp_docs/tech_design.md) - Canonical contract, APIs
- [Implementation Plan](../mvp_docs/impl_plan.md) - Week-by-week roadmap

### Examples
- [Fisheries HA](../hybrid_automata/examples/01_ses_fisheries.md) - Social-ecological systems
- [Epidemic HA](../hybrid_automata/examples/02_epidemic_control.md) - Multi-phase response
- [AI-2027 HA](../hybrid_automata/examples/04_ai_governance.md) - Full governance spec

---

## Navigation

| Document | Purpose | Key Questions Answered |
|----------|---------|------------------------|
| **[comparison_matrix.md](comparison_matrix.md)** | Quantitative scoring | Which formalism scores best on dimension X? |
| **[qualitative_analysis.md](qualitative_analysis.md)** | Strengths/weaknesses | When should I use SD vs HA vs ABM? |
| **[macro_alternatives.md](macro_alternatives.md)** | Macro-scale comparison | What works for national-scale models? |
| **[discrete_time_modeling.md](discrete_time_modeling.md)** | Discrete-time focus | Why discrete time? What's the right Δt? Skip verification? |
| **[use_case_portability.md](use_case_portability.md)** | Domain generalization | Can this extend to climate/pandemic domains? |

---

**Status**: Design exploration phase - comprehensive evaluation to inform architecture choices

**Next**: After babbling (exploring all options), we **prune** to a concrete implementation strategy based on evaluation results.
