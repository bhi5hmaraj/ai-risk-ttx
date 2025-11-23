# Decision Tree: Choosing the Right Formalism

**Purpose**: Help GMs quickly select the appropriate formal modeling approach for their scenario.

**Philosophy**: Answer a series of yes/no questions to navigate to the recommended formalism(s).

---

## Quick Decision Tree

```
START: What kind of scenario are you modeling?
│
├─ Q1: Does your scenario have CONTINUOUS DYNAMICS (ODEs)?
│  │
│  ├─ YES → Q2: Does it have DISCRETE MODE CHANGES (regimes, phases)?
│  │  │
│  │  ├─ YES → Q3: Do you need STOCHASTIC TRANSITIONS?
│  │  │  │
│  │  │  ├─ YES → ✅ STOCHASTIC HYBRID AUTOMATON (SHA)
│  │  │  │         "Discrete modes + continuous ODEs + probabilistic transitions"
│  │  │  │         Tools: Custom (SciPy), PRISM (after abstraction)
│  │  │  │         Example: Climate with tipping points + noise
│  │  │  │
│  │  │  └─ NO  → ✅ HYBRID AUTOMATON (HA)
│  │  │            "Discrete modes + continuous ODEs (deterministic)"
│  │  │            Tools: SpaceEx, KeYmaera X
│  │  │            Example: AI governance (Race/Slowdown/Pause modes)
│  │  │
│  │  └─ NO  → ✅ SYSTEM DYNAMICS (SD)
│  │             "Pure continuous dynamics (stocks, flows, feedback loops)"
│  │             Tools: Vensim, Stella, PySD
│  │             Example: Population ecology, economic growth
│  │
│  └─ NO  → Q4: Are INDIVIDUAL AGENTS CRITICAL (heterogeneity matters)?
│     │
│     ├─ YES → ✅ AGENT-BASED MODEL (ABM)
│     │        "Heterogeneous agents with local rules → emergent behavior"
│     │        Tools: Mesa, NetLogo, RePast
│     │        Example: Social polarization, market dynamics
│     │
│     └─ NO  → Q5: Does your scenario have PROBABILISTIC TRANSITIONS?
│        │
│        ├─ YES → Q6: Do you need REWARDS/COSTS (optimization)?
│        │  │
│        │  ├─ YES → ✅ MARKOV DECISION PROCESS (MDP)
│        │  │         "Discrete states/actions + probabilities + rewards"
│        │  │         Tools: PRISM, Storm
│        │  │         Example: Robot navigation, policy optimization
│        │  │
│        │  └─ NO  → ✅ DTMC (Discrete-Time Markov Chain)
│        │             "Discrete states + probabilistic transitions (no decisions)"
│        │             Tools: PRISM
│        │             Example: Reliability analysis, queueing
│        │
│        └─ NO  → Q7: Does your scenario have TIMING CONSTRAINTS?
│           │
│           ├─ YES → ✅ TIMED AUTOMATA (TA)
│           │         "Discrete states + real-valued clocks + time guards"
│           │         Tools: UPPAAL, KRONOS
│           │         Example: Real-time systems, communication protocols
│           │
│           └─ NO  → ✅ KRIPKE STRUCTURE
│                     "Pure discrete states (deterministic/nondeterministic)"
│                     Tools: SPIN, NuSMV, TLA+
│                     Example: Protocol verification, concurrent systems
```

---

## Detailed Question Guide

### Q1: Does your scenario have continuous dynamics (ODEs)?

**Ask yourself**:
- Are there variables that change *smoothly* over time (not just discrete jumps)?
- Can you write differential equations (dx/dt = ...) for key variables?
- Examples: population growth, temperature, GDP, disease prevalence

**If YES**: Continuous dynamics matter → Go to Q2
**If NO**: Pure discrete → Go to Q4

**Nuance**: If you have many discrete agents whose *aggregate* behavior is continuous, consider both SD (aggregate) and ABM (individual-level)

---

### Q2: Does it have discrete mode changes (regimes, phases)?

**Ask yourself**:
- Are there distinct "phases" with different dynamics (e.g., peace vs war, lockdown vs normal)?
- Do policy interventions cause *abrupt* shifts in behavior?
- Are there threshold effects (tipping points)?

**Examples**:
- **YES**: Climate (stable → runaway), epidemic (normal → mitigation → suppression)
- **NO**: Simple population growth, economic cycle (smooth oscillation)

**If YES**: Hybrid (continuous + discrete) → Go to Q3
**If NO**: Pure continuous → Use **System Dynamics (SD)**

---

### Q3: Do you need stochastic transitions?

**Ask yourself**:
- Are mode transitions *uncertain* (probabilistic)?
- Is there continuous noise (random fluctuations in variables)?
- Do you need to model "What's the probability of catastrophe?" not just "Does catastrophe happen?"

**Examples**:
- **YES**: Climate (uncertain tipping point timing), financial crisis (random shocks)
- **NO**: Epidemic policy (deterministic lockdown triggers), AI race (clear thresholds)

**If YES**: Stochastic hybrid → Use **Stochastic Hybrid Automaton (SHA)**
**If NO**: Deterministic hybrid → Use **Hybrid Automaton (HA)**

**Note**: If you only need parameter uncertainty (not inherent stochasticity), use HA with sensitivity analysis

---

### Q4: Are individual agents critical (heterogeneity matters)?

**Ask yourself**:
- Does *who* does *what* matter? (Not just aggregate statistics)
- Is there significant variation between individuals?
- Do spatial or social networks matter?
- Are emergent properties from individual interactions the focus?

**Examples**:
- **YES**: Social polarization (opinion leaders matter), COVID-19 (superspreaders), traffic (individual vehicle behavior)
- **NO**: Flu epidemic (homogeneous mixing), GDP growth (aggregate capital/labor)

**If YES**: Heterogeneity critical → Use **Agent-Based Model (ABM)**
**If NO**: Aggregate sufficient → Go to Q5

**Hybrid option**: Use ABM for individual-level, then aggregate to HA for macro-level verification

---

### Q5: Does your scenario have probabilistic transitions?

**Ask yourself**:
- Are state changes *uncertain*?
- Do you need to model probabilities of outcomes?
- Is there randomness in the environment or agent actions?

**Examples**:
- **YES**: Robot (sensor failure), market (random demand), epidemic (stochastic contacts)
- **NO**: Traffic light (deterministic), software protocol (deterministic transitions)

**If YES**: Probabilistic discrete → Go to Q6
**If NO**: Deterministic discrete → Go to Q7

---

### Q6: Do you need rewards/costs (optimization)?

**Ask yourself**:
- Are you trying to *optimize* a strategy (find best policy)?
- Do actions have costs and outcomes have values?
- Do you care about "expected reward" or "minimize cost"?

**Examples**:
- **YES**: Robot path planning (minimize energy), portfolio allocation (maximize return)
- **NO**: Reliability analysis (just compute P(failure)), protocol verification (just check correctness)

**If YES**: Optimization matters → Use **Markov Decision Process (MDP)**
**If NO**: Just probability → Use **DTMC** (Discrete-Time Markov Chain)

**Note**: DTMC is MDP without actions (purely probabilistic evolution)

---

### Q7: Does your scenario have timing constraints?

**Ask yourself**:
- Are there hard deadlines (task must complete within X seconds)?
- Do timeout/retry mechanisms matter?
- Are real-time guarantees critical?

**Examples**:
- **YES**: Embedded controller (sensor reading every 100ms), communication protocol (ACK timeout 5s)
- **NO**: Abstract protocol (mutex, leader election without timing)

**If YES**: Timing critical → Use **Timed Automata (TA)**
**If NO**: Pure discrete → Use **Kripke Structure**

---

## Special Cases

### Case 1: "I need to PROVE SAFETY"

**Priority**: Formal verification

**Recommendation**:
1. **If continuous**: Abstract to finite MDP or discretize to Kripke/TA
2. **If discrete + probabilistic**: Use **MDP** (PRISM)
3. **If discrete + timed**: Use **Timed Automata** (UPPAAL)
4. **If discrete + deterministic**: Use **Kripke** (SPIN, NuSMV)

**Avoid**: ABM (no verification), SHA (limited tools), general HA (undecidable)

---

### Case 2: "I'm a non-expert GM with no math background"

**Priority**: Ease of use

**Recommendation**:
1. **Continuous**: Use **System Dynamics** (Vensim GUI, stock-flow diagrams)
2. **Discrete agents**: Use **Agent-Based Model** (NetLogo, visual programming)
3. **Discrete states**: Use **Kripke** (state diagrams intuitive)

**Avoid**: HA/SHA (requires ODEs + formal semantics), MDP (requires Markov property understanding)

---

### Case 3: "I need FAST, REAL-TIME simulation (<5 seconds per trajectory)"

**Priority**: Computational speed

**Recommendation**:
1. **System Dynamics** (Euler/RK4 fast)
2. **Hybrid Automaton** (ODE integration fast, finite modes)
3. **Kripke/TA** (if state space <10^6)

**Avoid**: ABM (Monte Carlo slow), SHA (SDE integration slow), MDP with large state space

---

### Case 4: "I want to CALIBRATE to real data"

**Priority**: Empirical fit

**Recommendation**:
1. **System Dynamics** (parameter fitting tools in Vensim)
2. **Agent-Based Model** (ABC, likelihood-free inference)
3. **MDP** (inverse reinforcement learning)

**Tools**:
- SD: Vensim optimization, PySD + scipy.optimize
- ABM: Mesa + pyabc (approximate Bayesian computation)
- MDP: Inverse RL libraries (Python)

**Note**: Calibrating HA/SHA is research-grade (no mature tools)

---

## Multi-Formalism Approaches

Sometimes the best solution is **combining formalisms**:

### Approach 1: Hierarchical (ABM → HA)
- **Individual level**: ABM (heterogeneous agents)
- **Aggregate level**: HA (macro dynamics + verification)
- **Example**: COVID-19 - ABM for detailed transmission, HA for policy analysis

### Approach 2: Sequential (SD → HA)
- **First**: SD prototype (quick exploration)
- **Then**: HA formalization (add discrete events, verification)
- **Example**: Climate - SD for continuous model, HA adds tipping points

### Approach 3: Parallel (SD ↔ ABM comparison)
- **SD**: Aggregate model (fast, continuous)
- **ABM**: Detailed model (slow, agent-level)
- **Compare**: Does ABM emergent behavior match SD equations?
- **Example**: Epidemic - SIR (SD) vs individual contacts (ABM)

---

## Decision Matrix (Alternative View)

| Feature | SD | ABM | HA | SHA | MDP | Kripke | TA |
|---------|----|----|----|----|--------|--------|-----|
| **Continuous dynamics** | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ⚠️ (clocks) |
| **Discrete modes** | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Stochastic** | ⚠️ | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ |
| **Verification** | ❌ | ❌ | ⚠️ | ⚠️ | ✅ | ✅ | ✅ |
| **Agent heterogeneity** | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Fast simulation** | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Easy to learn** | ✅ | ✅ | ⚠️ | ❌ | ⚠️ | ⚠️ | ⚠️ |
| **Mature tools** | ✅ | ✅ | ⚠️ | ❌ | ✅ | ✅ | ✅ |

**Legend**:
- ✅ Strong support
- ⚠️ Partial support
- ❌ No support

---

## Example Scenarios Mapped to Formalisms

| Scenario | Formalism | Rationale |
|----------|-----------|-----------|
| **Climate (no tipping)** | SD | Continuous (temperature, CO2), no discrete modes |
| **Climate (with tipping)** | HA | Continuous + discrete modes (stable → runaway) |
| **COVID-19 (aggregate)** | SD (SIR) | Continuous (population dynamics) |
| **COVID-19 (detailed)** | ABM | Individual contacts, superspreaders matter |
| **COVID-19 (policy)** | HA | Modes (normal, mitigation, lockdown), continuous SIR |
| **AI governance** | HA | Modes (race, slowdown, pause), continuous (compute, alignment) |
| **Traffic light** | TA | Discrete states + timing (green for 30s) |
| **Mutex protocol** | Kripke | Discrete states, deterministic transitions, need proof |
| **Robot navigation** | MDP | Discrete states, probabilistic (sensor error), optimize path |
| **Social polarization** | ABM | Heterogeneous agents, network structure, emergent behavior |
| **Economic boom/bust** | SD | Continuous (GDP, investment), feedback loops |
| **Epidemic + policy** | HA | Continuous (SIR) + discrete (policy interventions) |
| **Smart grid** | HA | Continuous (voltage, frequency) + discrete (normal, emergency) |

---

## Validation Questions

After choosing a formalism, ask:

1. **Can I express the key features?**
   - If not: Reconsider choice or simplify scenario

2. **Can I simulate it in reasonable time?**
   - If not: Simplify or choose faster formalism

3. **Can I verify the properties I care about?**
   - If not: Accept simulation-only or choose verifiable formalism

4. **Can I (or my team) learn this formalism?**
   - If not: Choose simpler or get expert help

5. **Are there tools I can actually use?**
   - If not: Reconsider or be prepared for manual implementation

---

## When in Doubt

**Start with System Dynamics (SD)** if:
- Scenario is primarily continuous
- You're prototyping/exploring
- You're a non-expert

**Reasons**:
- Fastest to learn (Vensim GUI)
- Fastest to simulate
- Can always upgrade to HA later (add discrete modes)

**Exception**: If agent heterogeneity is obviously critical, start with ABM instead

---

**Status**: v1.0
**Last updated**: 2025-11-23
**Contributors**: Claude (assistant), MedhAI (decision philosophy)
**Next**: Add case studies with step-by-step decision traces
