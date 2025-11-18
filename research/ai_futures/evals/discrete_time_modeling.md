# Discrete-Time Modeling for Macro Strategic Problems

**Purpose**: Evaluate discrete-time approaches for simulation and scenario exploration (without formal verification)

**Philosophy**: For macro strategic problems (AI governance, climate policy, pandemic response), **discrete-time simulation beats continuous-time verification**. We're trading formal guarantees for pragmatic modeling that matches real decision rhythms.

---

## Core Principle: Simulation Over Verification

### What We're Dropping

**Formal verification layer**:
- ❌ Temporal logic (LTL, CTL, PCTL)
- ❌ Model checking (PRISM, NuSMV)
- ❌ Decidability concerns
- ❌ Continuous-time guards and invariants
- ❌ Proving "for all paths" guarantees

**Why it's okay**:
- Macro problems have **squishy dynamics** (trust, political capital) - no point proving properties on approximate equations
- Decision-makers want **scenarios and insights**, not formal theorems
- Real-world validation matters more than mathematical proof
- Faster iteration: no fighting with state explosion or undecidability

---

### What We're Keeping

**Hybrid structure**:
- ✅ Modes/regimes (Baseline, Race, Slowdown, Crisis)
- ✅ Macro continuous-ish variables (compute, alignment, trust)
- ✅ Agent-based micro decisions
- ✅ Transitions between modes (guards as conditions)

**But in discrete time**:
- Time is **ticks** (k = 0, 1, 2, ..., N)
- Each tick = Δt (e.g., 1 month, 1 quarter)
- State updates via **difference equations**: x_{k+1} = F(x_k, u_k, ξ_k)
- **Simulation**, not formal analysis

---

## 1. Discrete-Time Framework

### State at Tick k

```typescript
interface DiscreteTimeState {
  tick: number;                    // k ∈ [0, N]
  mode: string;                    // "Baseline" | "Race" | "Slowdown" | ...
  macro: {                         // Continuous-ish variables
    compute: number;               // Current value at tick k
    alignment: number;
    trust: number;
    security: number;
  };
  agents: {                        // Agent/institutional state
    us_lab_stance: string;
    china_lab_stance: string;
    regulator_strictness: number;
    public_pressure: number;
  };
  exogenous: {                     // External shocks
    incidents: number;             // Misalignment incidents this tick
    breakthroughs: number;         // Alignment breakthroughs
  };
}
```

### Update Rule (Per Tick)

```typescript
function updateState(
  x_k: DiscreteTimeState,
  u_k: PolicyDecisions,
  xi_k: RandomShocks
): DiscreteTimeState {

  // 1. Update macro variables (difference equations)
  const compute_next = x_k.macro.compute * (1 + growthRate(x_k.mode, u_k));
  const alignment_next = x_k.macro.alignment + alignmentInvestment(x_k.mode, u_k);
  const trust_next = updateTrust(x_k.macro.trust, xi_k.incidents, u_k.comms);

  // 2. Check mode transitions (guards)
  const mode_next = checkModeTransition(x_k.mode, x_k.macro, x_k.agents);

  // 3. Update agent state
  const agents_next = updateAgents(x_k.agents, x_k.macro, x_k.mode);

  // 4. Apply exogenous shocks
  const exogenous_next = sampleShocks(xi_k);

  return {
    tick: x_k.tick + 1,
    mode: mode_next,
    macro: { compute: compute_next, alignment: alignment_next, trust: trust_next, ... },
    agents: agents_next,
    exogenous: exogenous_next
  };
}
```

### Mode Transitions (Discrete Guards)

```typescript
function checkModeTransition(
  current_mode: string,
  macro: MacroState,
  agents: AgentState
): string {

  // Instead of continuous-time guards, check conditions per tick

  if (current_mode === "Baseline") {
    if (macro.compute > 26.5 && agents.race_pressure > 0.7) {
      return "Race";
    }
    if (macro.alignment_gap > 5 && agents.regulator_strictness > 0.6) {
      return "Slowdown";
    }
  }

  if (current_mode === "Race") {
    if (macro.misalignment_incidents >= 3 && macro.trust > 0.4) {
      return "Pause_Attempt";
    }
    if (macro.trust < 0.3) {
      return "Crisis";
    }
  }

  // ... other transitions

  return current_mode;  // No transition
}
```

---

## 2. Time Quantum Selection (Δt)

### User-Facing: Horizon + Resolution

**Question**: "How far ahead do you want to simulate, and at what granularity?"

**Inputs**:
- **Horizon H** (years): How far to look ahead (e.g., 10 years)
- **Resolution N** (ticks): How many decision points (e.g., 40 → quarterly, 120 → monthly)

**Derived**:
- **Δt = H / N** (time per tick)
- Example: 10 years, 40 ticks → Δt = 3 months

**UI Slider**:
```
Horizon: [1 year] ----●------------ [20 years]
Resolution: [Yearly (10)] ---●--- [Monthly (240)]
→ Δt = 2.5 months (user sees "roughly quarterly")
```

---

### Trade-offs by Δt

| Δt | Ticks (10 yr) | Pros | Cons | Best For |
|----|---------------|------|------|----------|
| **1 week** | 520 | Captures fast crises, news cycles | Heavy simulation, noisy | Financial contagion, acute crises |
| **1 month** | 120 | Matches policy update rhythms | Approximates week-scale events | AI governance, pandemic response |
| **1 quarter** | 40 | Strategic decisions, budget cycles | Misses intra-quarter dynamics | Long-term policy, climate scenarios |
| **1 year** | 10 | High-level trends only | Too coarse for most macro problems | Century-scale climate, demography |

**Recommendation for AI-2027**: **Δt = 1 month** (120 ticks over 10 years)
- Matches: Lab training cycles, policy updates, news/incident cycles
- Captures: Mode transitions at relevant granularity
- Avoids: Over-resolution (weekly is overkill), under-resolution (quarterly misses crises)

---

## 3. Comparison: Discrete-Time Approaches

### 3.1 Discrete-Time System Dynamics (SD)

**How it works**:
- Stocks updated per tick: Stock_{k+1} = Stock_k + Δt × Flow(Stock_k)
- Flows computed from stocks at tick k
- Delays modeled as queues or exponential smoothing

**Example** (Compute Growth):
```python
def update_compute(state, dt):
    growth_rate = 0.1 if state.mode == "Race" else 0.03  # 10% vs 3% per month
    state.compute = state.compute * (1 + growth_rate * dt)
    return state
```

**Pros**:
- ✅ Intuitive stock-flow diagrams
- ✅ Feedback loops explicit
- ✅ Communicates well to policymakers
- ✅ Standard in macro modeling (Vensim, Stella do discrete time natively)

**Cons**:
- ❌ Weak on heterogeneous agents (aggregates by default)
- ❌ Discrete events (mode switches) feel bolted-on via IF-THEN
- ❌ No formal structure for guards/modes (just variables)

**Discrete-time impact**: **+1 advantage** - SD tools were already doing discrete time; dropping continuous integration makes no difference

---

### 3.2 Discrete-Time Agent-Based Models (ABM)

**How it works**:
- Agents observe state at tick k
- Each agent executes decision rule
- Aggregate decisions → update macro state, check guards

**Example** (Lab Decision):
```python
class AILab:
    def decide(self, macro_state, other_labs):
        if macro_state.competitor_advantage > 2.0:
            return "RACE"  # Competitive pressure
        elif macro_state.misalignment_signal > 0.8:
            return "SLOW_DOWN"  # Safety concerns
        else:
            return "MAINTAIN"
```

**Pros**:
- ✅ Heterogeneity natural (each lab different)
- ✅ Emergent macro from micro rules
- ✅ Networks, strategic interaction explicit

**Cons**:
- ❌ Many free parameters (hard to calibrate)
- ❌ Emergent behavior descriptive, not explanatory
- ❌ Computationally expensive (1000s of agents)

**Discrete-time impact**: **+1 advantage** - ABM is always discrete-time; we lose nothing

---

### 3.3 Discrete-Time Hybrid System (Our Proposal)

**How it works**:
- Combines SD (macro variables) + ABM (agents) + Modes (regimes)
- Each tick: update macro (difference equations), query agents, check guards, transition modes
- Modes have different update rules (flow equations become difference equations)

**Example** (Race Mode):
```typescript
function update_race_mode(state, dt) {
  return {
    compute: state.compute * (1 + 0.15 * dt),  // Fast growth
    alignment: state.alignment + 0.05 * (1 - state.alignment) * dt,  // Slow catch-up
    trust: state.trust * (1 - 0.05 * dt),  // Erosion
  };
}
```

**Pros**:
- ✅ Best of SD (macro) + ABM (agents) + discrete transitions (modes)
- ✅ Modes make regime shifts explicit and interpretable
- ✅ Different dynamics per mode (not just parameters, but equations)
- ✅ Guards give clean semantics for transitions

**Cons**:
- ❌ More complex than pure SD or ABM (three concepts to integrate)
- ❌ Not standard (no off-the-shelf tool)

**Discrete-time impact**: **+2 advantages**
- Simpler than continuous HA (no ODE solvers, no guard satisfaction timing issues)
- Matches macro decision rhythms better than continuous

---

### 3.4 Difference Equations (Pure Math)

**How it works**:
- Explicit recurrence relations: x_{k+1} = f(x_k)
- Can be nonlinear, coupled, stochastic
- No modes, no agents - just math

**Example** (Logistic Growth):
```python
x[k+1] = x[k] + r * x[k] * (1 - x[k] / K)
```

**Pros**:
- ✅ Mathematically clean
- ✅ Can analyze equilibria, stability
- ✅ No simulation framework needed (just a loop)

**Cons**:
- ❌ No structure for modes or agents (must encode manually)
- ❌ Hard to communicate (just equations, no intuition)
- ❌ Doesn't scale to 50-variable systems

**Discrete-time impact**: **Neutral** - This is the "lowest level" representation; all other approaches compile to this

---

## 4. Scoring: Discrete-Time Formalisms

| Dimension | Discrete SD | Discrete ABM | Discrete Hybrid | Pure Diff Eq |
|-----------|-------------|--------------|-----------------|--------------|
| **Expressiveness** | | | | |
| Macro feedbacks | 5 | 3 | 5 | 3 |
| Micro heterogeneity | 2 | 5 | 4 | 1 |
| Mode transitions | 2 | 3 | 5 | 2 |
| **Simulation** | | | | |
| Speed | 5 | 2 | 4 | 5 |
| Ease of implementation | 5 | 3 | 3 | 4 |
| **Communication** | | | | |
| Stakeholder clarity | 5 | 4 | 4 | 2 |
| Explainability | 5 | 3 | 5 | 2 |
| **Practical** | | | | |
| Tool support | 5 | 4 | 2 | 5 |
| Learning curve | 4 | 3 | 2 | 3 |
| Calibration | 4 | 2 | 3 | 4 |
| **Total** | **42** | **35** | **40** | **33** |

**Key Observations**:
- **Discrete SD wins overall** (42) - simplest, best tools, best communication
- **Discrete Hybrid close second** (40) - best expressiveness, slightly harder to implement
- **Pure Diff Eq last** (33) - too low-level, poor communication despite math elegance

**Recommendation**: Start with **Discrete SD skeleton**, add **modes** for regime transitions, add **ABM agents** where heterogeneity matters → **Discrete Hybrid System**

---

## 5. Why Discrete Time is Better for Macro

### Macro Decision Rhythms are Discrete

**Real-world macro decisions happen in ticks**:
- **Policy updates**: Monthly cabinet meetings, quarterly budget reviews
- **Lab decisions**: Training runs (weeks to months), deployment cycles (months to years)
- **Regulatory updates**: Annual legislation, quarterly guidance
- **Public opinion**: Polling monthly, elections yearly
- **Financial**: Quarterly earnings, annual reports

**Continuous time is a lie** for these problems. Decision-makers don't adjust trust or investment "smoothly" - they update discretely.

**Example**: Trust doesn't evolve via dT/dt = f(T); it drops discretely when a scandal happens, recovers gradually via monthly policy communications.

---

### Continuous Time Adds Complexity Without Value

**What you gain with continuous time**:
- Mathematical elegance (ODEs)
- Ability to prove properties on infinite traces (not useful if equations are approximate)
- Millisecond-scale precision (irrelevant for multi-year strategic problems)

**What you lose**:
- Simplicity (ODE solvers, adaptive stepping, Zeno conditions)
- Alignment with real decision rhythms
- Transparency (stakeholders understand "update per month" better than "dx/dt = ...")

**For macro problems**: The equations are **already approximate** (trust dynamics, alignment research progress). Adding continuous-time "precision" is false precision.

---

### Discrete Time Enables Monte Carlo Easily

**Scenario exploration requires many runs**:

With discrete time:
```python
results = []
for seed in range(1000):
    trajectory = simulate(initial_state, N=120, dt=1_month, seed=seed)
    results.append(trajectory)

# Analyze distribution
P_catastrophe = sum(traj.ends_in("catastrophe") for traj in results) / 1000
```

With continuous time:
- Must integrate ODEs 1000 times (slower)
- Guard satisfaction timing is stochastic (when exactly does trust cross 0.4?)
- Harder to parallelize (ODE integration has state)

**Discrete time**: ~10x faster for Monte Carlo, easier to parallelize, clearer semantics

---

## 6. Practical Implementation: Discrete-Time Hybrid System

### Architecture

```typescript
interface DiscreteTimeHybridSystem {
  // Static structure
  modes: Mode[];                          // {id, update_rules, outgoing_guards}
  variables: Variable[];                  // Macro vars (compute, trust, etc.)
  agents: Agent[];                        // Micro decision makers

  // Dynamic state
  current_state: DiscreteTimeState;

  // Simulation
  step(actions: AgentActions, shocks: Shocks): DiscreteTimeState;
  simulate(horizon: number, policy: Policy): Trajectory;
}
```

### Core Update Loop

```typescript
function step(system, x_k, u_k, xi_k) {
  // 1. Query agents
  const agent_actions = system.agents.map(agent => agent.decide(x_k));

  // 2. Update macro variables (mode-specific difference equations)
  const mode_rules = system.modes.find(m => m.id === x_k.mode).update_rules;
  const macro_next = mode_rules.apply(x_k.macro, agent_actions, xi_k);

  // 3. Check guards (mode transitions)
  const mode_next = checkGuards(system, x_k.mode, macro_next, agent_actions);

  // 4. Apply transition effects (if mode changed)
  if (mode_next !== x_k.mode) {
    macro_next = applyTransitionEffects(macro_next, x_k.mode, mode_next);
  }

  // 5. Return next state
  return {
    tick: x_k.tick + 1,
    mode: mode_next,
    macro: macro_next,
    agents: updateAgentState(x_k.agents, macro_next)
  };
}
```

### Example: AI-2027 Discrete System

```typescript
const ai2027_discrete = {
  modes: [
    {
      id: "Baseline",
      update_rules: {
        compute: (x, u) => x.compute * (1 + 0.03),  // 3% monthly growth
        alignment: (x, u) => x.alignment + 0.02 * (1 - x.alignment),
        trust: (x, u) => x.trust + 0.01 * (1 - x.trust) - 0.02 * u.incidents
      },
      guards: [
        { to: "Race", condition: (x) => x.compute > 26.5 && x.race_pressure > 0.7 },
        { to: "Slowdown", condition: (x) => x.alignment_gap > 5 && x.regulation > 0.6 }
      ]
    },
    {
      id: "Race",
      update_rules: {
        compute: (x, u) => x.compute * (1 + 0.15),  // 15% monthly growth!
        alignment: (x, u) => x.alignment + 0.05 * (1 - x.alignment),  // Slower
        trust: (x, u) => x.trust * (1 - 0.05)  // Erodes 5% per month
      },
      guards: [
        { to: "Crisis", condition: (x) => x.trust < 0.3 },
        { to: "Pause", condition: (x) => x.incidents >= 3 && x.trust > 0.4 }
      ]
    },
    // ... other modes
  ],

  variables: [
    { name: "compute", initial: 26.0, range: [24, 30] },
    { name: "alignment", initial: 0.15, range: [0, 1] },
    { name: "trust", initial: 0.70, range: [0, 1] }
  ],

  agents: [
    new USLab(),
    new ChinaLab(),
    new Regulator(),
    new PublicOpinion()
  ]
};
```

---

## 7. Comparison: Continuous vs Discrete (For Macro)

| Aspect | Continuous Time | Discrete Time (Δt = 1 month) | Winner |
|--------|-----------------|------------------------------|--------|
| **Realism** | False precision (dT/dt for trust?) | Matches real decision rhythms | **Discrete** |
| **Simplicity** | ODE solvers, adaptive stepping | Simple difference equations | **Discrete** |
| **Speed** | Slower (integration overhead) | Fast (just arithmetic) | **Discrete** |
| **Monte Carlo** | Complex (stochastic ODEs, guard timing) | Trivial (loop + random shocks) | **Discrete** |
| **Communication** | "dx/dt = f(x)" opaque | "Update per month" intuitive | **Discrete** |
| **Verification** | Can prove properties (if decidable) | Only simulation | **Continuous** |
| **Tool Support** | SpaceEx, Flow* (niche) | Standard (Vensim, Python) | **Discrete** |
| **Math Elegance** | ODEs, dynamical systems theory | Difference equations (less elegant) | **Continuous** |

**Score: Discrete 6, Continuous 2**

**Conclusion**: For macro strategic problems, **discrete time dominates** unless you need formal verification (which we're explicitly not doing).

---

## 8. Design Patterns (Discrete Time)

### Pattern 1: Monthly Update with Annual Reviews

**Structure**: Most variables update monthly, but some decisions are annual

```typescript
function step(x_k, dt) {
  // Monthly updates
  x_k.compute *= (1 + monthly_growth_rate);
  x_k.trust += monthly_trust_change;

  // Annual updates (check if tick is multiple of 12)
  if (x_k.tick % 12 === 0) {
    x_k.regulator_policy = annual_policy_review(x_k);
    x_k.budget_allocation = annual_budget(x_k);
  }

  return x_k;
}
```

**Use Case**: Policy updates are yearly, but state evolves monthly

---

### Pattern 2: Event-Driven Shocks

**Structure**: Exogenous events sampled per tick

```typescript
function step(x_k, dt) {
  // Sample events (Poisson process discretized)
  const incident_happened = (Math.random() < incident_rate_per_month);
  const breakthrough_happened = (Math.random() < breakthrough_rate_per_month);

  if (incident_happened) {
    x_k.trust *= 0.8;  // 20% drop
    x_k.incidents += 1;
  }

  if (breakthrough_happened) {
    x_k.alignment += 0.1;
  }

  return x_k;
}
```

**Use Case**: Scandals, breakthroughs, crises as discrete events

---

### Pattern 3: Lagged Response

**Structure**: Decision responds to state with N-tick delay

```typescript
class Regulator {
  observe_history: State[] = [];

  decide(current_state) {
    this.observe_history.push(current_state);

    // React to state from 3 months ago
    if (this.observe_history.length < 3) return "MAINTAIN";

    const lagged_state = this.observe_history[this.observe_history.length - 3];
    return (lagged_state.alignment_gap > 5) ? "INCREASE_OVERSIGHT" : "MAINTAIN";
  }
}
```

**Use Case**: Institutional inertia, bureaucratic delays

---

## 9. Verification → Exploration Mindset Shift

### Old Mindset (Verification-Focused)

**Question**: "Can we **prove** the system never reaches catastrophe?"

**Approach**:
1. Build formal model (Kripke, HA)
2. Discretize continuous state → MDP
3. Model check: `P_max [ F catastrophe ] < 0.05`
4. If true: "Provably safe"

**Problem**: For macro, the model is **approximate** → "proof" is meaningless

---

### New Mindset (Exploration-Focused)

**Question**: "Under what scenarios does catastrophe happen? How often? Which interventions help?"

**Approach**:
1. Build simulation model (discrete-time hybrid)
2. Run 1000 scenarios with different policies and shocks
3. Analyze distribution:
   - P(catastrophe | no intervention) ≈ 35%
   - P(catastrophe | early slowdown) ≈ 8%
   - P(catastrophe | coordination) ≈ 3%
4. Conclusion: "Early slowdown reduces risk 4x, coordination reduces 12x"

**Value**: Actionable insights without false precision of "proof"

---

### What We Learn from Simulation

**Distribution of outcomes**:
- Histogram: 35% catastrophe, 40% aligned, 25% ongoing
- Sensitivity: Trust threshold (0.3 vs 0.4) changes P(catastrophe) from 35% → 15%

**Critical paths**:
- 80% of catastrophes follow: Baseline → Race → Trust_Drop → Crisis
- Intervention point: Prevent trust drop in Race mode

**Policy comparison**:
- Export controls: -5% catastrophe risk (modest)
- Alignment funding: -15% catastrophe risk (strong)
- International coordination: -25% catastrophe risk (strongest)

**This is more useful than "AG (trust > 0.3)" being true/false**

---

## 10. Recommendations

### For AI-2027 Modeling Playground

**Phase 1: Discrete-Time Hybrid Core**
- Δt = 1 month (120 ticks over 10 years)
- Modes: {Baseline, Race, Slowdown, Pause, Crisis, Aligned} (5-8 modes)
- Macro: (compute, alignment, trust, security) updated via difference equations
- Agents: (US lab, China lab, Regulator, Public) with simple decision rules
- **No formal verification** - just simulation and visualization

**Phase 2: Monte Carlo Exploration**
- Run 1000 scenarios with different random seeds
- Vary policies (export controls, funding, coordination)
- Visualize distributions (histograms, CDFs, sensitivity plots)

**Phase 3: Interactive Dashboard**
- User selects policies via sliders
- Instant re-simulation (1000 runs in ~1 second with discrete time)
- Show: P(catastrophe), P(aligned), median time to alignment

**Skip**: Formal verification, temporal logic, continuous-time integration

---

### For Other Macro Domains

Same discrete-time hybrid approach works for:

| Domain | Δt | Modes | Macro Vars | Agents |
|--------|-----|-------|------------|--------|
| **Climate** | 1 quarter | BAU, Paris, Net-Zero | Emissions, Temp, Investment | Countries |
| **Pandemic** | 1 week | Growth, Mitigation, Suppression | S, I, R, Hospitalizations | Governments |
| **Finance** | 1 week | Stable, Bubble, Tightening, Crisis | Leverage, Liquidity, Confidence | Banks |
| **Infrastructure** | 1 day | Normal, Stressed, Emergency, Blackout | Demand, Reserve, Frequency | Operators |

**Portability**: Same simulation engine, different config (modes, equations, Δt)

---

## 11. Summary Table

| Formalism | Time Model | Verification | Simulation Speed | Communication | Best For |
|-----------|------------|--------------|------------------|---------------|----------|
| **Continuous HA** | Continuous | ✅ (if decidable) | Slow (ODE) | ❌ (dx/dt opaque) | Control systems, proofs needed |
| **Discrete HA** | Discrete ticks | ❌ (just simulation) | Fast | ✅ (per-month intuitive) | **Macro strategic (our choice)** |
| **System Dynamics** | Continuous/Discrete | ❌ | Fast (discrete) | ✅✅ (stock-flow diagrams) | Policy feedback loops |
| **ABM** | Discrete ticks | ❌ | Slow (many agents) | ✅ (agent stories) | Heterogeneity, emergence |
| **Difference Equations** | Discrete ticks | ❌ | Fastest | ❌ (just math) | Theoretical analysis |

**For AI-2027**: **Discrete Hybrid** (modes + difference equations + agents) with Δt = 1 month

---

## Conclusion: Pragmatic Discrete-Time Modeling

**Key Insights**:
1. **Discrete time matches macro reality** - decisions happen in ticks (monthly policies, quarterly budgets), not continuously
2. **Verification is overkill** - macro equations are approximate; "proving" properties on approximate models is false rigor
3. **Simulation > Proof** - stakeholders want scenarios and distributions, not theorems
4. **10x faster** - discrete time enables 1000s of Monte Carlo runs in seconds
5. **Clearer semantics** - "update per month" beats "dx/dt = ..." for communication

**Bottom Line**: For macro strategic problems, **drop continuous time and verification, embrace discrete-time simulation**. You gain speed, clarity, and pragmatism. You lose only formal guarantees on approximate equations - a good trade.

**Our Stack**:
- **Tier 1 (Macro)**: Discrete-time difference equations (compute growth, trust dynamics)
- **Tier 2 (Modes)**: Discrete regime transitions (Baseline → Race → Pause)
- **Tier 3 (Micro)**: Agent-based decisions (labs, regulators)
- **Time Quantum**: Δt = 1 month (120 ticks over 10 years)
- **Output**: Distributions, scenarios, sensitivities - **not proofs**

---

## Related Documentation

- [comparison_matrix.md](comparison_matrix.md) - Includes continuous-time formalisms for comparison
- [macro_alternatives.md](macro_alternatives.md) - SD, ABM, DEVS for macro scale
- [qualitative_analysis.md](qualitative_analysis.md) - When to use what formalism
- [../mvp_docs/impl_plan.md](../mvp_docs/impl_plan.md) - Implementation roadmap (can simplify with discrete time)

---

**Final Note**: This doesn't invalidate the continuous-time / verification work - it's just **not needed for macro strategic problems**. If you later need to verify a tiny control kernel (e.g., "does this alignment threshold provably prevent catastrophe?"), you can carve out that piece and do formal HA. But for the big picture, discrete-time simulation is the pragmatic choice.
