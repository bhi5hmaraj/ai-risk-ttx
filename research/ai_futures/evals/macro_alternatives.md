# Macro-Scale Alternatives to Hybrid Automata

**Focus**: Large-scale socio-technical systems (national, global scope)

**Question**: When should we use HA vs SD vs ABM vs DEVS for **macro** problems?

**Key Insight**: Hybrid automata are excellent for small, stylized core models you want to verify. For true macro-scale (1000s of agents, national policies, messy institutions), other formalisms often dominate.

---

## Comparison Table

| Formalism / Tool family | Macro-scale sweet spot | Where it beats HA (for macro use) | Where HA is better | When I'd pick this over HA in our stack |
|-------------------------|------------------------|------------------------------------|--------------------|-----------------------------------------|
| **Hybrid Automata (HA)** | Small, stylised **core feedback loops** you really want to analyze (e.g. a minimal AI-lab ↔ state ↔ oversight loop). | Clean unifying model of **discrete modes + continuous dynamics + temporal logic**. Direct line to model checking, decidability results for special fragments. | Scales terribly: state explosion, undecidability for general models; very brittle w.r.t. detailed dynamics and thresholds. Hard to represent thousands of heterogeneous actors or messy institutions. | When we want a **tiny "physics-style" core model** of a decision problem (e.g. race vs slowdown) and actually care about time-bounded reachability or proving a few safety properties. This is the "critical toy model" layer, not the whole world. |
| **System Dynamics (SD)** (incl. stochastic SD like StochSD) | High-level **policy and sustainability models**: energy transition, urban systems, environmental health, transport, water–energy nexus, etc. | Superb for **macro feedbacks, delays, and scenario exploration**; communicates well to policymakers; tooling (Vensim, Stella, StochSD) supports uncertainty, sensitivity, and some discrete event mixing. StochSD explicitly supports combined continuous and discrete transitions while keeping a macro view. | No native temporal logic / model checking; weak at **heterogeneity and explicit agents**; formal guarantees are rare—mostly simulation and qualitative reasoning. | When we want to capture **big feedback stories** (compute growth, political capital, public trust, emissions, etc.) and do policy runs, not proofs. SD gives us the skeleton of the macro dynamics; we can then carve out a small piece and "upgrade" that to HA if we need formal analysis. |
| **Agent-Based Modelling (ABM)** | Macro **policy & governance** questions where micro heterogeneity matters: financial stability, macroprudential policy, social policy, climate resilience, epidemics, macroeconomics. | Naturally bridges **micro rules → macro outcomes**; great for exploring institutional designs, inequality, network effects, path dependence. Very well-established for policy analysis in environment, development, health, and macroeconomics. | Even worse than HA on formal guarantees; calibration/validation is hard; easy to overfit or build sprawling models that are hard to interpret. Formal temporal logic over ABMs is still niche. | When the main question is **"how do labs / states / firms actually behave and interact?"** or we care about distributional outcomes (who wins/loses). ABM is our **macro social microscope**; we can then abstract pieces of its dynamics into HA/SD where we want formal structure. |
| **DEVS-style hybrid / System-of-Systems simulation** (DEVS, MS4, etc.) | **Large, modular system-of-systems** models: national health systems, emergency response, defence, logistics, infrastructure. MS4 Me is explicitly used for national-level healthcare and systems-of-systems modelling. | Strong on **hierarchy and modularity**; designed for **big, discrete-event heavy systems** with some continuous bits. Good fit for "plug many subsystems together and simulate national-scale policies". DEVS itself is formally defined and handles discrete/continuous/hybrid systems. | Verification story is weaker than for HA; people mostly do **simulation + statistical analysis**, not full model checking. Harder to bolt on rich temporal logics directly (though there are verification-oriented DEVS variants). | When we want a **nation-scale simulation platform** for policies (e.g. global AI ecosystem, health system, compute markets) with explicit modules and events, but we're happy with "many runs + statistics" instead of proofs. Think of it as the **engine** behind a big sandbox rather than the formal core. |
| **Hybrid / High-level Petri Nets** (incl. Hybrid Predicate Transition Nets, Timed-Arc Petri Nets) | Complex **distributed socio-technical systems** where concurrency, workflows, and resource sharing matter: service systems, business processes, some CPS and CPSS examples. | Petri nets shine at **concurrency and resource flows**; high-level and hybrid variants (e.g. HPrTN) add data types and continuous evolution, with translation to tools like SpaceEx for reachability. Good for modelling many interacting "places" (labs, regulators, markets) with explicit queues and tokens (compute, capital). | The graphical models can get huge; ODEs/continuous parts are usually simpler than in full HA; verification is often tool-specific and less standardized than classic timed/hybrid automata. | When we want to model **"who holds what and passes what to whom?"** at scale: compute, data, capital, authorizations, obligations. For macro AI governance, Petri-ish models are appealing for **resource and process flows**, with small HA "widgets" for local continuous dynamics if needed. |
| **Logic-centric hybrid formalisms** (Hybrid Programs + Differential Dynamic Logic, Hybrid Hoare Logic, etc.) | Stylised **core decision problems** where we want **symbolic proofs** about policies or controllers, not just simulation: e.g. "under which assumptions does this governance rule avoid catastrophe?". KeYmaera X and dL have been used heavily for safety proofs of automotive and aviation CPS. | Great for **parametric, assumption-transparent proofs**. You can say: "For all values of parameter X in this range, under assumption Y, property φ holds." Very explicit about assumptions and contracts; good for compositional reasoning. | Even more math overhead than HA; not suited to huge, messy macro models. You typically need very simple dynamics and small numbers of variables to keep proofs tractable. | When we distill a macro question down to a **tiny "governance core"** (e.g. "if we always trigger slowdown when indicator I > θ, can we avoid state S_catastrophe in this toy model?") and actually want **machine-checked proofs** about that toy system instead of just simulations. |

---

## Deep Dive: When to Use What

### 1. Hybrid Automata (HA)

**Macro sweet spot**: Core feedback loops (2-5 modes, 3-5 continuous variables)

**Real-world macro examples**:
- **Epidemic phases**: Pre-epidemic → Growth → Mitigation → Suppression → Endemic
  - Modes: 5
  - Continuous: S, E, I, R, H (5 vars)
  - Guards: hospitalization threshold
  - See [../hybrid_automata/examples/02_epidemic_control.md](../hybrid_automata/examples/02_epidemic_control.md)

- **AI governance regimes**: Baseline → Race → Slowdown → Pause
  - Modes: 5-8
  - Continuous: compute, alignment, trust (3 vars)
  - Guards: evidence thresholds, trust floors
  - See [../hybrid_automata/examples/04_ai_governance.md](../hybrid_automata/examples/04_ai_governance.md)

**Where it fails at macro**:
- **Heterogeneity**: Can't model 195 countries each with different policies
- **Scalability**: 10 modes × 5 continuous vars (discretized to 3 regions each) = 2430 states already pushing PRISM limits
- **Realism**: Assumes clean mode transitions, but real governance is messier (gradual policy shifts, partial adoption)

**Macro strategy with HA**:
1. Use SD or ABM for the full macro model
2. Identify the **single most critical subsystem** (e.g., US-China race dynamics)
3. Extract that subsystem → formalize as HA
4. Verify safety properties on HA
5. Feed verified insights back to macro model (e.g., "race mode is guaranteed unsafe if trust < 0.3")

---

### 2. System Dynamics (SD)

**Macro sweet spot**: National/global policy feedback loops

**Real-world macro examples**:
- **Climate policy**: Emissions → temperature → damages → policy stringency → emissions (feedback loop)
  - Stocks: CO2 concentration, capital stock, political capital
  - Flows: emissions, investment, public pressure
  - Tools: Vensim, En-ROADS
  - Scale: 100+ variables, global scope

- **Energy transition**: Fossil capacity → renewables → grid stability → policy → investment
  - Delays: 10-30 year infrastructure lifetimes
  - Tipping points: coal phase-out triggers
  - Scenarios: Policy runs (carbon tax, subsidies)

- **Urban systems**: Water demand → supply → scarcity → conservation → demand
  - Coupling: Water-energy nexus
  - Uncertainty: StochSD for rainfall variability

**Where it beats HA**:
- **Scale**: Can handle 100s of stocks and flows
- **Communication**: Policymakers intuitively grasp "feedback loops"
- **Exploration**: Easy to run 1000s of scenarios (sensitivity analysis)
- **Delays**: First-class modeling of time lags (crucial for macro)

**Where HA is better**:
- **Verification**: SD can't prove safety properties
- **Discrete transitions**: SD's IF-THEN is clunky compared to HA guards
- **Agent heterogeneity**: SD aggregates, can't model individual labs/countries

**Macro strategy with SD**:
1. **Build SD skeleton** for macro feedback (compute growth, trust dynamics, political capital)
2. **Identify mode transitions** (when does race start? when does pause happen?)
3. **Formalize mode logic** as HA subsystem embedded in SD
4. **Verify HA**, use results to parameterize SD (e.g., "if HA says pause always fails below 70% alignment, constrain SD accordingly")

---

### 3. Agent-Based Models (ABM)

**Macro sweet spot**: Heterogeneous populations, emergent phenomena

**Real-world macro examples**:
- **Financial contagion**: Banks with heterogeneous balance sheets → interbank lending → cascading failures
  - Agents: 100s of banks, each with different assets/liabilities
  - Micro rules: Lending decisions based on counterparty risk
  - Macro outcome: Systemic risk emerges from micro interactions
  - Tools: FLAME, MASON

- **Climate adaptation**: Households with different income/location → adaptation decisions → inequality
  - Agents: 1000s of households
  - Heterogeneity: Rich adapt (AC, flood barriers), poor don't
  - Macro: Distributional outcomes, path dependence

- **Pandemic response**: Individuals with heterogeneous compliance → masking, distancing → disease spread
  - Agents: 10,000s of people
  - Networks: Contact networks, workplaces, households
  - Macro: Intervention effectiveness depends on compliance distribution

**Where it beats HA**:
- **Heterogeneity**: Can model each AI lab with different capabilities, goals, risk tolerance
- **Emergence**: Macro patterns (race dynamics, coordination failures) emerge from micro decisions
- **Networks**: Explicit modeling of who-interacts-with-whom (crucial for governance)
- **Distributional**: Shows who wins/loses (small labs vs big labs, US vs China)

**Where HA is better**:
- **Verification**: ABM has zero formal guarantees
- **Simplicity**: 5-mode HA is easier to understand than 1000-agent ABM
- **Continuous dynamics**: ABM typically uses discrete time steps, not smooth ODEs

**Macro strategy with ABM**:
1. **Model micro heterogeneity** (AI labs, governments, each as agents with strategies)
2. **Observe emergent macro** (when do races happen? under what conditions do agents coordinate?)
3. **Abstract emergent patterns** into HA modes ("if >50% of powerful labs race, system enters Race mode")
4. **Verify abstracted HA**, feed insights back to ABM ("HA proves coordination impossible if trust < 0.4; tweak ABM agent rules accordingly")

---

### 4. DEVS / System-of-Systems

**Macro sweet spot**: National-scale modular simulations

**Real-world macro examples**:
- **Healthcare systems**: MS4 Me used for UK NHS modeling
  - Modules: Primary care, hospitals, specialists, patients, resources
  - Scale: National (millions of patients, 1000s of facilities)
  - Events: Patient arrivals, appointments, treatments, discharges
  - Hybrid: Continuous (resource usage, queue lengths) + discrete (events)

- **Emergency response**: Disaster scenarios (earthquake, pandemic)
  - Modules: Fire dept, police, hospitals, transport, utilities
  - Coupling: Transport failures → hospital access → mortality
  - Scale: City or national

- **Supply chains**: Manufacturing, logistics, ports, warehouses
  - Discrete events: Orders, shipments, delays
  - Continuous: Inventory levels, production rates
  - Modularity: Each factory/warehouse is a DEVS sub-model

**Where it beats HA**:
- **Modularity**: Plug-and-play subsystems (add new AI lab ≈ add new DEVS component)
- **Scale**: Can handle 1000s of interacting modules
- **Discrete-event focus**: Natural for modeling decisions, events, disruptions (better than SD's continuous time)

**Where HA is better**:
- **Verification**: DEVS mostly simulation-based; model checking rare
- **Continuous dynamics**: DEVS handles continuous but it's less elegant than HA ODEs
- **Temporal logic**: Hard to bolt rich LTL/CTL onto DEVS

**Macro strategy with DEVS**:
1. **Build nation-scale AI ecosystem** as system-of-systems (labs, governments, markets, infrastructure as DEVS modules)
2. **Simulate policy scenarios** (compute export controls, R&D subsidies)
3. **Identify critical interactions** (e.g., US-China lab race)
4. **Extract critical subsystem → HA**, verify safety properties
5. **Constrain DEVS** based on HA results (e.g., disable race scenarios that violate verified safety)

---

### 5. Hybrid Petri Nets

**Macro sweet spot**: Resource flows in distributed systems

**Real-world macro examples**:
- **Manufacturing**: Tokens = parts, continuous places = buffers
  - Discrete: Parts moving through workstations
  - Continuous: Buffer levels, energy consumption
  - Concurrency: Multiple production lines in parallel

- **Service systems**: Tokens = customers, continuous places = queue lengths
  - Discrete: Customer arrivals, service completions
  - Continuous: Queue dynamics

- **AI governance (hypothetical)**:
  - Places: {US labs, China labs, regulators, public}
  - Tokens: Compute, data, capital, policy mandates
  - Flows: Compute → deployed systems, data → training runs, capital → R&D
  - Continuous: Alignment capacity, public trust (accumulated resources)

**Where it beats HA**:
- **Concurrency**: Natural for modeling parallel processes (multiple labs racing simultaneously)
- **Resource tracking**: Explicit tokens for compute, data, capital
- **Workflow**: Good for modeling processes (research → deployment → oversight → regulation)

**Where HA is better**:
- **Continuous dynamics**: Petri nets less elegant for ODEs than HA
- **Communication**: Petri net diagrams are technical, not intuitive
- **Verification**: HA verification more standardized than hybrid Petri nets

**Macro strategy with Petri nets**:
1. **Model resource flows** (compute, data, capital across labs and regulators)
2. **Identify bottlenecks** (where do resources concentrate? who controls transitions?)
3. **Extract dynamics** of critical resources → continuous places with HA-style flows
4. **Verify reachability** (can system reach state where malicious lab has >90% of compute?)

---

### 6. Differential Dynamic Logic (dL)

**Macro sweet spot**: Provable governance policies

**Real-world macro examples**:
- **Autonomous vehicles**: "If brake distance > safe threshold, must decelerate"
  - Proof: ∀ initial conditions, car avoids collision
  - KeYmaera X: Machine-checked proof
  - Scale: Single vehicle controller (not 1000s of cars)

- **AI governance (stylized)**: "If alignment_gap > 10, must trigger slowdown"
  - Formal theorem: `∀ parameters in realistic range, slowdown avoids catastrophe`
  - Proof: Deductive verification in KeYmaera X
  - Scale: Tiny toy model (2-3 modes, 2-3 vars), **not** full global AI ecosystem

**Where it beats HA**:
- **Proofs**: Machine-checked guarantees, not just reachability bounds
- **Parametric**: Can prove properties for *all* values of uncertain parameters
- **Assumptions**: Makes assumptions explicit (crucial for policy)

**Where HA is better**:
- **Scale**: HA can handle 5-10 modes; dL struggles beyond 2-3
- **Stochasticity**: HA → SHA is natural; dL extensions for randomness are complex
- **Accessibility**: HA diagrams > dL formulas for understanding

**Macro strategy with dL**:
1. **Distill macro question** to smallest possible toy model (2 modes, 2 vars)
   - Example: "Does pause with budget X guarantee alignment Y within time T?"
2. **Formalize as hybrid program** in dL
3. **Prove theorem** in KeYmaera X
4. **Extract policy rule**: "Theorem says pause works if X > threshold; use this threshold in macro SD/ABM model"

---

## Integration Architectures

### Architecture 1: SD Skeleton + HA Critical Subsystem

```
System Dynamics (Macro)
    ↓
Continuous feedback: compute growth, trust dynamics, political capital
    ↓
Mode transitions (detected via SD stocks crossing thresholds)
    ↓
Formalize mode logic as Hybrid Automaton
    ↓
Verify HA (PRISM, SpaceEx)
    ↓
Constraints → feed back to SD parameters
```

**Example**:
- SD models global compute growth, alignment research, public trust
- When trust < 0.4, SD signals "regulation window opening"
- Extract "regulation window dynamics" → HA with 3 modes (Window_Open, Regulation_Passed, Window_Closed)
- Verify: P(regulation passes) > 0.5 if trust ∈ [0.35, 0.5]
- SD uses verified probability to parameterize scenarios

**Tools**: Vensim + custom HA engine + PRISM

---

### Architecture 2: ABM Micro + HA Macro Abstraction

```
Agent-Based Model (Micro)
    ↓
Heterogeneous labs: US, China, startups, academic
Each agent has strategy: race, coordinate, slow_down
    ↓
Observe emergent dynamics over 1000 runs
    ↓
Cluster outcomes into modes (Race, Coordination, Fragmentation)
    ↓
Build HA with modes = emergent regimes
    ↓
Verify HA properties
```

**Example**:
- ABM: 20 AI labs, each with different capabilities and risk tolerance
- Run 1000 simulations
- Observe: 60% end in "race" (all labs rushing), 30% in "coordination" (major labs align), 10% in "fragmentation" (no clear pattern)
- Build HA: 3 modes (Race, Coordination, Fragmentation), transitions based on aggregated agent state
- Verify: P(catastrophe | Race) > 0.3, P(catastrophe | Coordination) < 0.05
- Policy: Design interventions to steer ABM toward Coordination mode

**Tools**: NetLogo/Mesa + custom abstraction layer + PRISM

---

### Architecture 3: DEVS National Simulation + HA Policy Verification

```
DEVS System-of-Systems (National Scale)
    ↓
Modules: Labs, regulators, markets, infrastructure, public
Events: R&D milestones, deployments, regulations, incidents
    ↓
Run policy scenarios (export controls, licensing, taxes)
    ↓
Extract critical interaction (US-China race)
    ↓
Formalize as HA (2-country, 3-mode each)
    ↓
Verify: Can race be avoided? Under what policy combinations?
    ↓
Constrain DEVS: Disable scenarios that violate verified safety
```

**Example**:
- DEVS: Full global AI ecosystem (50 countries, 100 labs, 20 regulators)
- Simulate export control policy (US restricts H100 chips to China)
- Extract: US vs China lab dynamics → 2-agent HA
- Modes per country: {Develop_Domestic, Import, Pause}
- Verify: If both develop domestic → race → P(catastrophe) > 0.15
- DEVS conclusion: Export controls without coordination → unsafe

**Tools**: PowerDEVS/CD++ + custom HA engine + PRISM

---

## Macro Anti-Patterns (What NOT to Do)

### Anti-Pattern 1: HA for Everything
**Symptom**: Trying to model entire global AI ecosystem as one giant HA

**Why it fails**:
- 50 countries × 5 modes each = 5^50 states (intractable)
- Loses heterogeneity (China lab ≠ US startup, but both encoded as "mode")
- Verification impossible due to state explosion

**Fix**: Use HA only for critical 2-3 actor subsystems, SD/ABM for macro

---

### Anti-Pattern 2: SD Without Discrete Modes
**Symptom**: Modeling governance transitions purely with IF-THEN in SD

**Why it fails**:
- SD's discrete events are clunky (binary switches, not clean modes)
- Can't verify properties (no temporal logic)
- Hard to reason about mode invariants

**Fix**: Hybrid SD+HA where SD handles continuous, HA handles mode logic

---

### Anti-Pattern 3: ABM as Only Model
**Symptom**: Building massive 10,000-agent ABM and hoping to extract insights

**Why it fails**:
- Calibration nightmare (100+ parameters, equifinality)
- No formal guarantees (can't prove anything)
- Hard to communicate (emergent patterns are descriptive, not explanatory)

**Fix**: Use ABM for exploration, abstract to HA for verification, use SD for communication

---

### Anti-Pattern 4: dL for Realistic Macro
**Symptom**: Trying to prove theorems about 50-country, 10-variable model

**Why it fails**:
- Proofs become intractable beyond 2-3 variables
- Assumptions required for tractability are unrealistic
- Time investment (months) for marginal insight

**Fix**: Use dL only for tiny, critical "policy kernel" (2 modes, 2 vars); use HA/SD for realistic models

---

## Recommendations by Question Type

### Question: "What's the risk of catastrophe over 20 years?"

**Best**: Stochastic HA → MDP abstraction → PRISM (P_≤p[F catastrophe])

**Alternatives**:
- SD + Monte Carlo (faster, less rigorous)
- ABM + statistical analysis (if heterogeneity critical)

**Avoid**: Pure HA (deterministic, no probabilities), dL (no probabilistic reasoning)

---

### Question: "What policies reduce inequality?"

**Best**: ABM (can track distributional outcomes)

**Alternatives**:
- SD with "aging chains" (approximate heterogeneity)
- Petri nets (if inequality ≈ resource distribution)

**Avoid**: HA (no heterogeneity), dL (too abstract)

---

### Question: "Can we prove this policy is safe?"

**Best**: dL (machine-checked proofs)

**Alternatives**:
- HA → reachability (SpaceEx) for bounds
- Kripke + LTL (if discrete)

**Avoid**: SD, ABM (no proofs, only simulation)

---

### Question: "How do feedback loops drive the system?"

**Best**: SD (designed for feedback)

**Alternatives**:
- HA (if loops map to modes clearly)
- ODE (if no discrete transitions)

**Avoid**: ABM (feedback is emergent, hard to isolate), DEVS (feedback not first-class)

---

## Conclusion: No Silver Bullet at Macro Scale

**Key Takeaway**: For macro socio-technical systems, **no single formalism dominates**.

**Optimal strategy**:
1. **Start with SD** - Build intuition about macro feedbacks
2. **Add ABM** - Capture heterogeneity and strategic interaction
3. **Extract HA** - Formalize critical subsystems for verification
4. **Verify with PRISM** - Get probabilistic bounds on risk
5. **Prove with dL** - (Optional) Machine-check tiny policy kernels

**Result**:
- Macro breadth (SD, ABM)
- Formal rigor (HA, dL)
- Verification (PRISM)
- Communication (SD diagrams, ABM visuals, narrative overlay)

**Our AI-2027 stack**:
- Tier 1: SD for macro (compute growth, trust, political capital)
- Tier 2: HA for regimes (Baseline, Race, Slowdown, Pause)
- Tier 3: ABM for labs (US, China, startups with heterogeneous strategies)
- Verification: HA → MDP → PRISM for risk bounds

---

## Related Documentation

- [comparison_matrix.md](comparison_matrix.md) - Quantitative scores across dimensions
- [qualitative_analysis.md](qualitative_analysis.md) - Strengths, weaknesses, synthesis
- [use_case_portability.md](use_case_portability.md) - Extending beyond AI governance
- [../hybrid_automata/integration.md](../hybrid_automata/integration.md) - SD+ABM+HA coupling details

---

**Bottom line**: Hybrid automata are a **critical component** of macro modeling, but only for the **formal core** (5-10 modes, 3-5 continuous vars). For true macro scale (national, global), combine HA with SD (breadth) and ABM (heterogeneity) in a three-tier architecture.
