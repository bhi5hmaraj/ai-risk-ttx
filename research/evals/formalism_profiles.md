# Formalism Profiles

**Purpose**: Score each formal modeling approach across 8 normalized dimensions (0-5 scale).

These scores enable systematic comparison via spider graphs and inform the decision tree.

---

## Scoring Summary Table

| Formalism | Express | Tract | Learn | Verify | Cont/Disc | Stoch | Modul | Tools | **Total** |
|-----------|---------|-------|-------|--------|-----------|-------|-------|-------|-----------|
| **System Dynamics (SD)** | 2 | 5 | 5 | 1 | 5 | 1 | 4 | 5 | **28/40** |
| **Agent-Based Model (ABM)** | 5 | 2 | 4 | 0 | 0 | 2 | 2 | 4 | **19/40** |
| **Hybrid Automaton (HA)** | 4 | 3 | 3 | 2 | 3 | 0 | 3 | 2 | **20/40** |
| **Stochastic HA (SHA)** | 5 | 2 | 2 | 2 | 3 | 3 | 3 | 1 | **21/40** |
| **MDP** | 3 | 3 | 3 | 4 | 0 | 2 | 3 | 4 | **22/40** |
| **Kripke Structure** | 2 | 4 | 3 | 5 | 0 | 0 | 4 | 4 | **22/40** |
| **Timed Automata (TA)** | 3 | 4 | 3 | 4 | 2 | 0 | 4 | 4 | **24/40** |

**Note**: Higher total is NOT always better - depends on problem fit. See decision tree.

---

## 1. System Dynamics (SD)

### Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Expressiveness** | 2/5 | Excellent for continuous, but no discrete events. Can't model mode switches naturally. |
| **Computational Tractability** | 5/5 | Fast ODE integration (RK4, Euler). Scales well (dozens of variables). Real-time feasible. |
| **Learnability** | 5/5 | Stock-flow diagrams are intuitive. Vensim/Stella widely taught. No coding required. |
| **Verification Support** | 1/5 | No formal verification. Manual analysis of equilibria, sensitivity. |
| **Continuous/Discrete** | 5/5 | Pure continuous (ODEs). |
| **Stochasticity** | 1/5 | Deterministic dynamics. Can add parameter uncertainty but not inherent noise. |
| **Modularity** | 4/5 | Hierarchical subsystems. Reusable stocks/flows patterns. Well-defined interfaces. |
| **Tool Ecosystem** | 5/5 | **Excellent**. Vensim, Stella, Insight Maker, PySD, Simantics. Commercial + open-source. |

### Spider Graph Coordinates
`[2, 5, 5, 1, 5, 1, 4, 5]`

### Best For
- Ecological dynamics (population, resources)
- Economic systems (GDP, investment)
- Public health (disease prevalence)
- Climate models (emissions, temperature)

### Avoid When
- Need discrete events (policy changes, crises)
- Require formal verification
- Stochastic transitions critical

### Example Tools
- **Vensim**: Commercial, industry standard
- **Stella**: Education-focused
- **PySD**: Python, open-source
- **Insight Maker**: Web-based

---

## 2. Agent-Based Model (ABM)

### Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Expressiveness** | 5/5 | Can model **anything** with heterogeneous agents. Spatial, social networks, learning. |
| **Computational Tractability** | 2/5 | Slow (Monte Carlo required). State explosion with many agents. Not real-time. |
| **Learnability** | 4/5 | Mesa/NetLogo intuitive. Visual agent metaphors. But emergent behavior hard to predict. |
| **Verification Support** | 0/5 | **None**. Cannot formally verify. Statistical analysis only. |
| **Continuous/Discrete** | 0/5 | Discrete agents. Can approximate continuous via many agents but not true ODEs. |
| **Stochasticity** | 2/5 | Agent actions stochastic. But no continuous noise (SDEs). |
| **Modularity** | 2/5 | Hard to compose agent systems. Interactions emergent, not modular. |
| **Tool Ecosystem** | 4/5 | Mesa (Python), NetLogo, RePast (Java), FLAME (C). Good visualizers. |

### Spider Graph Coordinates
`[5, 2, 4, 0, 0, 2, 2, 4]`

### Best For
- Social dynamics (polarization, norms)
- Epidemics with individual contact (COVID-19)
- Markets with heterogeneous traders
- Evacuation/traffic (spatial agents)

### Avoid When
- Need fast simulation (<1s)
- Formal verification required
- Aggregate dynamics sufficient (SD cheaper)

### Example Tools
- **Mesa**: Python, open-source, Jupyter integration
- **NetLogo**: Education, drag-and-drop
- **RePast**: Java, HPC-focused
- **FLAME**: GPU-accelerated, millions of agents

---

## 3. Hybrid Automaton (HA)

### Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Expressiveness** | 4/5 | Discrete modes + continuous ODEs. Perfect for cyber-physical. No stochasticity. |
| **Computational Tractability** | 3/5 | Fast ODE sim, but state space infinite. Verification undecidable (general HA). |
| **Learnability** | 3/5 | Requires ODEs + guards. State diagrams help. Moderate learning curve. |
| **Verification Support** | 2/5 | Limited. SpaceEx (reachability over-approximation). No general model checking. |
| **Continuous/Discrete** | 3/5 | **Perfect hybrid** (50/50 balance). |
| **Stochasticity** | 0/5 | Deterministic. (See SHA for stochastic version.) |
| **Modularity** | 3/5 | Composition exists but complex. Not as clean as Kripke. |
| **Tool Ecosystem** | 2/5 | SpaceEx, HyTech, Flow*, KeYmaera X. Research-grade, limited GUIs. |

### Spider Graph Coordinates
`[4, 3, 3, 2, 3, 0, 3, 2]`

### Best For
- AI governance (modes: Race, Slowdown, Pause; continuous: compute, alignment)
- Epidemic control (modes: Mitigation, Suppression; continuous: SIR)
- Smart grids (modes: Normal, Emergency; continuous: voltage, frequency)
- Climate tipping points (modes: Stable, Runaway; continuous: temperature)

### Avoid When
- Pure continuous (use SD)
- Pure discrete (use Kripke)
- Need stochasticity (use SHA)
- Need exact verification (undecidable)

### Example Tools
- **SpaceEx**: Reachability analysis, state-of-the-art
- **KeYmaera X**: Theorem proving for safety
- **HyTech**: Classic tool (older)
- **Flow***: Nonlinear ODEs

---

## 4. Stochastic Hybrid Automaton (SHA)

### Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Expressiveness** | 5/5 | HA + stochastic transitions + continuous noise (SDEs). Most expressive. |
| **Computational Tractability** | 2/5 | Requires Monte Carlo. Slow for SDEs. Verification even harder than HA. |
| **Learnability** | 2/5 | Requires SDEs, probability. Expert-level math. Few tools. |
| **Verification Support** | 2/5 | Abstraction to MDP possible. PRISM can handle finite abstractions. Research-grade. |
| **Continuous/Discrete** | 3/5 | Hybrid (like HA). |
| **Stochasticity** | 3/5 | Probabilistic transitions + continuous noise (Wiener). |
| **Modularity** | 3/5 | Like HA (moderate). |
| **Tool Ecosystem** | 1/5 | **Poor**. Mostly manual (SciPy SDEs). No mature SHA tools. |

### Spider Graph Coordinates
`[5, 2, 2, 2, 3, 3, 3, 1]`

### Best For
- Financial systems (jumps + diffusion)
- Climate (abrupt transitions + noise)
- Biological systems (gene expression bursts)
- When both discrete uncertainty AND continuous noise matter

### Avoid When
- Don't need stochasticity (use HA)
- Can't afford Monte Carlo (>1000 runs)
- GM is not expert (too complex)

### Example Tools
- **Custom**: SciPy + manual coding
- **PRISM**: After abstraction to finite MDP
- **Research**: FAUST^2 (rare earth model checker)

---

## 5. Markov Decision Process (MDP)

### Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Expressiveness** | 3/5 | Discrete states/actions. Probabilistic. Rewards/costs. No continuous dynamics. |
| **Computational Tractability** | 3/5 | Polynomial algorithms (value iteration). But state explosion is common. |
| **Learnability** | 3/5 | Conceptually simple (states, actions, transitions, rewards). But large state spaces hard to design. |
| **Verification Support** | 4/5 | **Excellent**. PRISM mature. PCTL model checking. Quantitative properties. |
| **Continuous/Discrete** | 0/5 | Pure discrete. |
| **Stochasticity** | 2/5 | Probabilistic transitions. Discrete probabilities only. |
| **Modularity** | 3/5 | Can compose via product, but grows exponentially. |
| **Tool Ecosystem** | 4/5 | PRISM (gold standard), Storm, MRMC, PRISM-games (stochastic games). |

### Spider Graph Coordinates
`[3, 3, 3, 4, 0, 2, 3, 4]`

### Best For
- Policy optimization (find optimal strategy)
- Quantitative risk analysis (P[F goal] ≥ 0.95?)
- When rewards/costs matter
- Finite state spaces with uncertainty

### Avoid When
- State space huge (>10^6 states)
- Need continuous dynamics
- Don't care about optimality (just simulation)

### Example Tools
- **PRISM**: Model checker, GUI, PCTL, expected rewards
- **Storm**: High-performance successor to PRISM
- **PRISM-games**: Stochastic games (multi-agent)

---

## 6. Kripke Structure

### Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Expressiveness** | 2/5 | Pure discrete. Deterministic or nondeterministic. No time, no probabilities. |
| **Computational Tractability** | 4/5 | Finite state space. Model checking PSPACE-complete (tractable for <10^6 states). |
| **Learnability** | 3/5 | State diagrams intuitive. But abstracting continuous to discrete is hard. |
| **Verification Support** | 5/5 | **Best in class**. SPIN, NuSMV, TLA+. CTL, LTL mature. Counterexamples automatic. |
| **Continuous/Discrete** | 0/5 | Pure discrete. |
| **Stochasticity** | 0/5 | Deterministic (or nondeterministic, but not probabilistic). |
| **Modularity** | 4/5 | Compositional semantics clean (parallel composition, hiding). |
| **Tool Ecosystem** | 4/5 | SPIN, NuSMV, TLA+, FDR (CSP), mCRL2. Mature, production-ready. |

### Spider Graph Coordinates
`[2, 4, 3, 5, 0, 0, 4, 4]`

### Best For
- Protocol verification (mutex, leader election)
- Software model checking (concurrent programs)
- Abstract models (after discretizing continuous)
- When formal proof is critical

### Avoid When
- Need continuous dynamics
- Need timing (use Timed Automata)
- Need probabilities (use MDP)

### Example Tools
- **SPIN**: Industry standard for LTL
- **NuSMV**: Symbolic model checking (BDDs)
- **TLA+**: Lamport's spec language + TLC checker
- **FDR**: CSP model checker (Oxford)

---

## 7. Timed Automata (TA)

### Scores

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Expressiveness** | 3/5 | Discrete + real-valued clocks. Time constraints (x ≤ 5). No general ODEs. |
| **Computational Tractability** | 4/5 | Decidable (region/zone graphs). PSPACE-complete. Scales to ~100 clocks. |
| **Learnability** | 3/5 | Clock constraints intuitive for timed systems. Learning curve moderate. |
| **Verification Support** | 4/5 | **Excellent**. UPPAAL mature. TCTL model checking. Reachability, liveness. |
| **Continuous/Discrete** | 2/5 | Mostly discrete + clocks (special continuous variables). |
| **Stochasticity** | 0/5 | Deterministic. (Stochastic TA exist but limited tool support.) |
| **Modularity** | 4/5 | Networks of timed automata. Clean composition. |
| **Tool Ecosystem** | 4/5 | UPPAAL (industry + academia), KRONOS, RED. Good GUIs. |

### Spider Graph Coordinates
`[3, 4, 3, 4, 2, 0, 4, 4]`

### Best For
- Real-time systems (embedded controllers)
- Communication protocols (timeout, retries)
- Scheduling (tasks with deadlines)
- Cyber-physical with timing constraints

### Avoid When
- No timing constraints (use Kripke)
- Need general ODEs (use HA)
- Need probabilities (limited tool support for stochastic TA)

### Example Tools
- **UPPAAL**: GUI, TCTL, simulation, verification
- **KRONOS**: Reachability analysis
- **RED**: Symbolic reachability

---

## Comparison Matrix (Selected Pairs)

### SD vs HA
- **Use SD when**: Pure continuous dynamics, no mode switches
- **Use HA when**: Need discrete modes (policy regimes, phases)
- **Example**: Epidemic without interventions → SD; Epidemic with lockdown policies → HA

### HA vs SHA
- **Use HA when**: Deterministic (or uncertainty via parameter sweeps)
- **Use SHA when**: Stochastic transitions or continuous noise (SDEs) required
- **Example**: Climate model (deterministic tipping) → HA; Climate with stochastic forcing → SHA

### Kripke vs MDP
- **Use Kripke when**: Deterministic/nondeterministic, need LTL/CTL proof
- **Use MDP when**: Probabilistic, need quantitative risk analysis
- **Example**: Mutex protocol → Kripke; Robot navigation with uncertainty → MDP

### ABM vs HA
- **Use ABM when**: Heterogeneity critical (individual-level variation drives emergent behavior)
- **Use HA when**: Aggregate dynamics sufficient, faster simulation needed
- **Example**: COVID with superspreaders → ABM; Flu with homogeneous mixing → HA (SIR)

### TA vs HA
- **Use TA when**: Timing constraints but no general ODEs
- **Use HA when**: General continuous dynamics (not just clocks)
- **Example**: Traffic light controller → TA; Smart grid frequency control → HA

---

## Spider Graph Overlays

### Overlay 1: Continuous Capability

Formalisms ranked by continuous dynamics support:
1. **SD**: 5/5 (pure ODEs)
2. **HA/SHA**: 3/5 (hybrid)
3. **TA**: 2/5 (clocks only)
4. **Kripke/MDP/ABM**: 0/5 (pure discrete)

### Overlay 2: Verification Capability

Formalisms ranked by formal verification support:
1. **Kripke**: 5/5 (SPIN, NuSMV)
2. **TA**: 4/5 (UPPAAL)
3. **MDP**: 4/5 (PRISM)
4. **HA/SHA**: 2/5 (limited)
5. **SD**: 1/5 (manual)
6. **ABM**: 0/5 (none)

### Overlay 3: Ease of Use

Formalisms ranked by GM-friendliness:
1. **SD**: 5/5 (Vensim GUI)
2. **ABM**: 4/5 (NetLogo visual)
3. **Kripke/TA/MDP**: 3/5 (state diagrams, moderate)
4. **HA/SHA**: 2-3/5 (requires math)

---

## Decision Shortcuts

**"I need to prove safety"**
→ Kripke, TA, or MDP (depending on timing/probabilities)

**"I need continuous dynamics"**
→ SD, HA, or SHA (depending on discrete modes/stochasticity)

**"I need agent heterogeneity"**
→ ABM (no substitute)

**"I need fast, real-time simulation"**
→ SD (avoid ABM, SHA)

**"I'm a non-expert GM"**
→ SD or ABM (avoid HA, SHA)

**"I need probabilities AND verification"**
→ MDP (PRISM)

---

## Adding a New Formalism

To add a new formalism (e.g., Petri Nets, DEVS, Queueing Networks):

1. **Score on all 8 dimensions** (use [dimensions.md](dimensions.md) criteria)
2. **Justify each score** (1-sentence rationale)
3. **Add to summary table**
4. **Create spider graph coordinates**
5. **Compare to existing** (what niche does it fill?)
6. **Update decision tree** (when to use it?)

---

**Status**: v1.0 (7 formalisms profiled)
**Last updated**: 2025-11-23
**Contributors**: Claude (assistant), MedhAI (evaluation philosophy)
**Next**: Add Petri Nets, DEVS, Queueing Networks
