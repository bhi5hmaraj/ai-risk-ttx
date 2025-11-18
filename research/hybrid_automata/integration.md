# Integration: SD + ABM + Hybrid Automata

**How System Dynamics, Agent-Based Models, and Hybrid Automata work together**

---

## 1. The Integration Challenge

Complex socio-technical systems need multiple modeling paradigms:

- **System Dynamics (SD)**: Aggregate stocks, flows, feedback loops
- **Agent-Based Models (ABM)**: Heterogeneous actors, micro-level decisions
- **Formal Methods (FM)**: Verification, guarantees, property checking

**Problem**: These paradigms have historically been **separate**:
- SD tools (Vensim, Stella) don't support verification
- ABM tools (NetLogo, MASON) don't support formal properties
- FM tools (PRISM, NuSMV) don't support continuous dynamics or rich agents

**Solution**: **Hybrid automata** as the **unifying formal backbone** that integrates all three.

---

## 2. The Four-Component Framework

```
┌─────────────────────────────────────────────────┐
│              HYBRID AUTOMATON (HA)              │
│         (Formal backbone + verification)        │
│                                                 │
│  Modes: Q = {Baseline, Race, Pause, ...}       │
│  Continuous: (compute, alignment, trust)        │
│  Guards: trust < 0.4 → Regulation_Window       │
│  Flows: ẋ = f_q(x) per mode                   │
└─────────────────────────────────────────────────┘
              ↑            ↑            ↑
      ┌───────┘            │            └──────┐
      │                    │                   │
┌──────────┐      ┌─────────────────┐   ┌──────────┐
│    SD    │      │       ABM       │   │ FM-Logic │
│ (Flows)  │      │ (Guard triggers)│   │(Properties)│
└──────────┘      └─────────────────┘   └──────────┘
```

### Components

1. **SD Layer**: Defines continuous dynamics (flow equations in each mode)
2. **ABM Layer**: Agents make decisions that trigger mode transitions
3. **FM-Model (HA)**: Formal structure tying everything together
4. **FM-Logic**: Temporal properties checked on HA traces

---

## 3. Mapping: SD → HA

System Dynamics models have:
- **Stocks** (state variables)
- **Flows** (rates of change)
- **Feedback loops** (stocks influence flows)

**HA representation**:

| SD Concept | HA Component | Example |
|------------|--------------|---------|
| Stock | Continuous variable | `compute`, `alignment`, `trust` |
| Flow | Flow equation ẋ = f(x) | `dC/dt = 1.5·C + I_race` |
| Auxiliary variable | Derived from continuous state | `alignment_gap = C - 10·A` |
| Feedback loop | Flows depend on stocks | `dT/dt = -0.05·(1 - A/C_scaled)` |

### 3.1 Example: Fisheries SD Model

**SD stocks**:
- B (fish biomass)
- K_capital (fishing capital)
- T (social trust)

**SD flows**:
```
dB/dt = r·B·(1 - B/K) - q·E·B          // Natural growth - harvest
dK/dt = profit_margin·revenue - δ·K     // Capital accumulation
dT/dt = -α·(1 - B/B_safe)               // Trust erodes if biomass low
```

**HA translation**:
- X = (B, K_capital, T) ∈ ℝ³
- Flow(OpenAccess) = (r·B·(1 - B/K) - q·E·B, ..., -α·(1 - B/B_safe))
- Single mode → pure SD model
- Add modes (LightRegulation, StrictRegulation) → hybrid SD model

---

## 4. Mapping: ABM → HA

Agent-Based Models have:
- **Agents** (decision makers)
- **Agent actions** (discrete choices)
- **Interaction protocols** (how agents coordinate)
- **Environment** (shared state agents observe)

**HA representation**:

| ABM Concept | HA Component | Example |
|-------------|--------------|---------|
| Agent decision | Triggers mode transition | US chooses "pause" → Guard fires |
| Agent state | Part of discrete mode | Mode encodes coalition structure |
| Environment | Continuous state X | (compute, alignment, trust) |
| Interaction outcome | Guard condition | If enough agents cooperate, guard fires |

### 4.1 Example: Multi-Actor AI Governance

**Agents**:
- US, China, EU (AI lab countries)
- Each chooses policy: {race, regulate, pause}

**ABM decisions**:
```python
def us_policy_choice(state):
    if state.trust < 0.4 and state.evidence > 2:
        return "pause"
    elif state.china_compute > state.us_compute:
        return "race"
    else:
        return "regulate"
```

**HA translation**:

**Discrete modes encode coalition**:
- Mode = (US_policy, China_policy, EU_policy)
- Example: Mode "Race_Race_Regulate" = US races, China races, EU regulates

**Guards encode collective decisions**:
```typescript
Guard((Race, Race, Race) → (Pause, Pause, Pause)) = {
  x | x.trust < 0.4 ∧ x.evidence ≥ 3 ∧
      all_agents_agree_to_pause
}
```

**Continuous state = aggregate environment**:
- X.compute = sum of all countries' compute
- X.alignment = weighted average
- X.trust = global public trust

### 4.2 Agent-Triggered Guards

**Key pattern**: ABM decisions determine **when guards fire**.

```typescript
// Without ABM: deterministic guard
Guard(Race → Pause) = { x | x.alignment < 0.2 }  // Auto-pause if misaligned

// With ABM: agent-gated guard
Guard(Race → Pause) = {
  x | x.alignment < 0.2 ∧
      agent_decision == "PAUSE"
}  // Pause only if agent chooses it
```

**Agent logic** runs as part of transition system:
1. Observe continuous state x
2. Make decision based on x and agent's goals/beliefs
3. Decision determines which guards are enabled
4. Enabled guard fires → mode transition

---

## 5. Multi-Mode System Dynamics

**Key insight**: Different governance regimes have **different dynamics**.

Traditional SD: single set of equations for entire simulation.

**Hybrid SD**: different equations in each mode.

### 5.1 Example: AI-2027 Modes

**Race mode**:
```
dC/dt = 1.5·C + I_race          // Fast compute growth
dA/dt = 0.05·(1 - A) - 0.1·A    // Alignment lags
dT/dt = -0.05·T                 // Trust erodes
```

**Slowdown mode**:
```
dC/dt = 0.3·C + I_slow          // Slow compute growth
dA/dt = 0.4·(1 - A)             // Alignment research prioritized
dT/dt = 0.03·(1 - T)            // Trust recovers
```

**Pause mode**:
```
dC/dt = 0                       // Compute frozen
dA/dt = 0.6·(1 - A)             // Max alignment research
dT/dt = -0.02·(policy_legitimacy)  // Trust depends on legitimacy
```

**HA formulation**:
- Q = {Race, Slowdown, Pause}
- Flow(q) = different ODE system per mode
- Guards determine mode switches based on continuous state

---

## 6. Formal Properties from Domain Models

### 6.1 SD-Derived Properties (Safety Invariants)

From SD feedback loops, derive constraints:

**Example (Fisheries)**:
- SD model has stable equilibrium at B = 0.7·K
- **Property**: AG (B > 0.2·K) "Biomass never collapses"
- **Verification**: Check if any HA trajectory reaches B < 0.2·K

**Example (AI-2027)**:
- SD model: alignment_gap = C - 10·A
- **Property**: AG (alignment_gap < 15) "Safe alignment margin"
- **Verification**: Check on continuous state abstraction

### 6.2 ABM-Derived Properties (Liveness, Coordination)

From agent goals, derive liveness properties:

**Example (Multi-Actor Coordination)**:
- Agents want to avoid catastrophe
- **Property**: F (Mode = GlobalPause) "Eventually coordinate on pause"
- **Verification**: Check if all paths lead to coordination

**Example (AI-2027)**:
- Some agents want aligned AGI
- **Property**: P_≥0.5 [ F (Mode = Aligned) ] "Success probability ≥ 50%"
- **Verification**: Probabilistic model checking on abstracted SHA

---

## 7. Integration Patterns

### 7.1 Pattern A: SD-Driven, ABM-Gated

**Use case**: Physical/economic dynamics dominate, agents control critical thresholds.

**Structure**:
- Continuous dynamics from SD model
- Few discrete modes (SD regimes)
- Guards gated by agent decisions

**Example**: Climate policy
- SD: carbon cycle, temperature dynamics
- Modes: {Business_As_Usual, Paris_Agreement, Net_Zero}
- ABM: Countries negotiate, decide which mode to enter

### 7.2 Pattern B: ABM-Driven, SD-Augmented

**Use case**: Agent interactions dominate, continuous variables track aggregate state.

**Structure**:
- Many discrete modes (agent configurations)
- Simple continuous dynamics (summaries)
- Guards based on agent state only

**Example**: Social network dynamics
- ABM: Users adopt/reject technology
- Modes: All combinations of user states
- SD: Aggregate adoption rate, network centrality

### 7.3 Pattern C: Coupled Dynamics

**Use case**: Continuous and discrete tightly coupled, bidirectional feedback.

**Structure**:
- Continuous state influences guard conditions
- Mode switches cause resets in continuous state
- Agents observe continuous state, adjust strategy

**Example**: AI-2027 (our focus)
- SD: compute, alignment, trust dynamics
- ABM: Countries/labs make policy decisions
- Coupling: Trust level influences agent decisions; agent decisions change modes; modes change trust dynamics

---

## 8. Verification Workflow

### Step 1: Build HA from SD+ABM

1. **Extract modes** from ABM agent configurations
2. **Define flows** per mode using SD equations
3. **Define guards** based on ABM decision rules and SD thresholds
4. **Define resets** if mode switches cause discrete jumps

### Step 2: Discretize Continuous State

1. Partition each continuous variable into regions
   - Example: alignment ∈ {low, med, high} = {[0,0.3), [0.3,0.7), [0.7,1]}
2. Build finite abstract transition system
   - States: (mode, region₁, region₂, ...)
   - Transitions: Reachability between abstract states

### Step 3: Model Check Properties

1. Translate temporal logic to model checker format
2. Run PRISM/Storm/NuSMV on abstract transition system
3. Interpret results (conservative: may have false positives)

### Step 4: Refine if Needed

If property violation is **spurious** (artifact of abstraction):
1. Refine partition (more regions)
2. Re-check
3. Use counterexample-guided abstraction refinement (CEGAR)

See [tools_and_verification.md](tools_and_verification.md) for detailed tool usage.

---

## 9. Simulation vs Verification

### 9.1 Simulation (Forward, Sample Paths)

**What**: Generate individual HA trajectories
- Start from initial state (q₀, x₀)
- Integrate ODEs in mode q₀ until guard fires
- Take transition, update mode and continuous state
- Repeat

**Tools**: Custom ODE solvers (scipy.integrate), discrete-event simulation

**Output**: One or more sample paths
- Good for: Understanding typical behavior, debugging
- Bad for: Guarantees (only explores some paths, not all)

### 9.2 Verification (Backward, Reachable Sets)

**What**: Compute all possible behaviors
- Start from initial set Init
- Compute reachable set after one discrete transition + continuous evolution
- Repeat until fixed point or target reached

**Tools**: SpaceEx, Flow*, PHAVer

**Output**: Reachable set or proof of unreachability
- Good for: Guarantees (proves properties for all paths)
- Bad for: Scalability (state explosion)

### 9.3 Hybrid Approach (Used in AI-2027 MVP)

1. **Simulation**: Understand dynamics, tune parameters
2. **Abstraction**: Discretize continuous state → finite MDP
3. **Verification**: Model check MDP (PRISM)
4. **Interpretation**: Conservative bounds on real HA

---

## 10. Case Study: AI-2027 Integration

### 10.1 SD Component

**Variables**: (compute, alignment, trust, security) ∈ ℝ⁴

**Equations per mode**:
- See [examples/04_ai_governance.md](examples/04_ai_governance.md)
- Each mode has different growth rates, feedback strengths

### 10.2 ABM Component

**Agents**:
- Major AI labs (OpenAI, Anthropic, Google DeepMind)
- Governments (US, China, EU)
- Public (represented as trust variable)

**Agent decisions**:
- Labs: {race, slow_down, coordinate_pause}
- Governments: {regulate, light_touch, hands_off}

**Decision rules**:
```typescript
function lab_decision(state: FormalState): Action {
  if (state.evidence >= 3 && state.trust > 0.5) {
    return "coordinate_pause";  // Evidence + legitimacy
  } else if (competitor_compute > my_compute) {
    return "race";  // Competitive pressure
  } else {
    return "slow_down";  // Default
  }
}
```

### 10.3 Guards (ABM → Mode Transition)

```typescript
Guard(Race → Pause) = {
  state |
    state.evidence >= 3 ∧
    majority_of_labs_choose("coordinate_pause") ∧
    government_supports_pause
}
```

### 10.4 Flows (SD → Continuous Evolution)

In Pause mode:
```
dC/dt = 0                     // No new compute
dA/dt = 0.6·(1 - A)          // Focused alignment research
dT/dt = -0.02·legitimacy(P)  // Trust depends on pause legitimacy
```

### 10.5 Properties (FM-Logic → Verification Goals)

```
AG (T > 0.3)                           // Safety: Trust above critical
P_≤0.05 [ F (Mode = Catastrophe) ]     // Probabilistic: Low risk
F (Mode = Aligned)                     // Liveness: Eventually succeed
```

### 10.6 Verification

1. Discretize: (C, A, T) → (C_region, A_region, T_region)
2. Build MDP: (mode, C_region, A_region, T_region) with transition probabilities
3. Model check with PRISM
4. Get: P(Catastrophe), P(Aligned), expected time to alignment

---

## 11. Advanced: Multi-Scale Integration

### 11.1 Hierarchical Hybrid Automata

**Scenario**: Agents themselves have internal hybrid dynamics.

**Example**:
- **Macro level**: Global HA (modes = international regimes)
- **Micro level**: Each country is an HA (modes = domestic policy)
- **Coupling**: Domestic policy choices influence global mode transitions

**Structure**: HA composition (see [framework.md](framework.md) Section 6)

### 11.2 Time-Scale Separation

**Fast dynamics**: Continuous state equilibrates quickly
- Example: Daily stock market fluctuations

**Slow dynamics**: Modes change rarely
- Example: Regulatory regime shifts

**Simplification**: Assume fast variables at quasi-steady-state when analyzing mode transitions.

---

## 12. Practical Recommendations

### 12.1 Start Simple

1. **Phase 1**: Build pure discrete FSM/Kripke (no continuous state)
   - Validate mode structure
   - Check discrete properties

2. **Phase 2**: Add continuous state with simple flows (linear ODEs)
   - Integrate ODEs numerically
   - Visualize trajectories

3. **Phase 3**: Add stochastic transitions
   - Monte Carlo simulation
   - Build MDP abstraction

4. **Phase 4**: Formal verification
   - Discretize, model check
   - Tune granularity vs performance

### 12.2 Model Calibration

**SD parameters**: Fit flows to historical data
- Example: Compute growth rate from actual GPU trends

**ABM rules**: Validate against expert interviews or game theory
- Example: "Would a rational lab pause if evidence strong?"

**Guard thresholds**: Sensitivity analysis
- Example: Does property hold for trust threshold ∈ [0.25, 0.35]?

### 12.3 Documentation

For each HA model, document:
1. **Mode diagram**: Visual graph of Q and E
2. **Flow equations**: Explicit ODEs for each mode
3. **Guard conditions**: Precise predicates, including ABM decision logic
4. **Properties**: What you're trying to verify/achieve
5. **Abstraction scheme**: How continuous state is discretized

---

## 13. Summary Table

| Aspect | SD Contribution | ABM Contribution | HA Integration |
|--------|-----------------|------------------|----------------|
| **Continuous dynamics** | ODEs (flows) | - | Flow(q) per mode |
| **Discrete transitions** | - | Agent decisions | Guards gated by ABM |
| **Mode structure** | Different regimes | Coalition configs | Q (finite modes) |
| **Parameters** | Growth rates, decay | Agent strategies | Guard thresholds |
| **Properties** | Equilibria, stability | Coordination, fairness | Temporal logic (AG, AF, P) |
| **Verification** | Simulation | Game-theoretic analysis | Model checking on abstraction |

---

## 14. Related Documentation

- [framework.md](framework.md) - Formal HA definitions
- [examples/01_ses_fisheries.md](examples/01_ses_fisheries.md) - SD+ABM+HA in fisheries
- [examples/04_ai_governance.md](examples/04_ai_governance.md) - Full AI-2027 spec
- [tools_and_verification.md](tools_and_verification.md) - Tool workflows

---

**Conclusion**: Hybrid automata provide the **formal glue** between System Dynamics (continuous) and Agent-Based Models (discrete decisions), enabling rigorous verification of complex socio-technical scenarios like AI-2027.
