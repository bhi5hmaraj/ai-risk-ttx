# Use Case Portability: Beyond AI Governance

**Purpose**: Demonstrate that our design abstractions generalize across domains

**Philosophy**: AI governance is our **test case**, not our **only case**. Good design should be domain-agnostic at the abstraction level, domain-specific only at the configuration level.

---

## Core Principle: Abstract Design, Concrete Configuration

### Abstract Design (Domain-Agnostic)

**What stays the same across all domains**:
1. **Modes**: Discrete regimes / phases / states
2. **Continuous Variables**: Real-valued quantities that evolve smoothly
3. **Guards**: Conditions triggering mode transitions
4. **Flows**: ODEs governing continuous evolution in each mode
5. **Agents**: Actors making decisions
6. **Properties**: Temporal logic specifications (safety, liveness, fairness)

**Canonical Contract** (from [../mvp_docs/tech_design.md](../mvp_docs/tech_design.md)):
```typescript
interface HybridAutomaton {
  modes: Mode[];
  continuous_vars: Variable[];
  discrete_vars: Variable[];
  guards: Guard[];
  flows: FlowEquation[];
  properties: TemporalProperty[];
}
```

This contract **never changes** across domains.

---

### Concrete Configuration (Domain-Specific)

**What changes for each domain**:
1. **Mode Names**: "Race/Pause" (AI) → "Business-as-Usual/Net-Zero" (climate)
2. **Variable Names**: "compute, alignment" (AI) → "CO2, temperature" (climate)
3. **Flow Equations**: Specific ODEs for domain (alignment research vs carbon cycle)
4. **Guard Thresholds**: Domain-specific critical values (trust < 0.4 vs temperature > 2°C)
5. **Agent Roles**: AI labs vs countries vs banks

**Example Mapping**:
| Abstract | AI Governance | Climate Policy | Pandemic Response |
|----------|---------------|----------------|-------------------|
| Mode | Race | Business-as-Usual | Baseline_Transmission |
| Continuous Var | Alignment | Temperature | Susceptible_Population |
| Guard | evidence ≥ 3 | temp > 1.5°C | hospitalizations > capacity |
| Agent | AI Lab | Country | Government |

---

## Domain Translations

### 1. Climate Governance

**Mapping AI-2027 → Climate**:

| AI-2027 | Climate Analog | Justification |
|---------|----------------|---------------|
| **Modes** | | |
| Baseline | Business-as-Usual (BAU) | No climate action, emissions continue |
| Race | Race_to_Bottom | Countries defect from agreements to compete economically |
| Slowdown | Paris_Agreement | Moderate emissions reductions |
| Pause | Net_Zero_Commitment | Aggressive decarbonization |
| Catastrophe | Runaway_Warming | >3°C warming, tipping points crossed |
| Aligned | Climate_Stabilization | 1.5°C target met |
| **Continuous Variables** | | |
| compute | cumulative_emissions | CO2 in atmosphere drives warming |
| alignment | mitigation_capacity | Installed renewables, efficiency |
| trust | international_cooperation | Willingness to coordinate |
| security | climate_resilience | Adaptation infrastructure |
| **Guards** | | |
| evidence ≥ 3 | extreme_events ≥ 3 | Hurricanes, droughts trigger action |
| trust < 0.4 | cooperation_collapse | Paris Agreement falls apart |
| alignment_gap > 10 | emissions_gap > 10 GtCO2 | Gap between pledges and needs |
| **Agents** | | |
| US AI Lab | USA | Major emitter, technology leader |
| China AI Lab | China | Major emitter, development priorities |
| EU Regulator | EU | Climate leader, regulation focus |
| Public | Climate_Movement | Public pressure for action |

**Flow Equations (Net_Zero mode)**:
```typescript
flow_net_zero(x) {
  return {
    emissions: -0.5 * x.emissions,  // Rapid decline
    temperature: 0.01 * (x.cumulative_emissions - 500),  // Climate response
    cooperation: 0.05 * (1 - x.cooperation),  // Trust builds
    capacity: 0.3 * (1 - x.capacity)  // Rapid capacity growth
  };
}
```

**Properties**:
- AG (temperature < 2.0) - Never exceed 2°C warming
- P_≤0.05 [F (mode = Runaway_Warming)] - Low risk of catastrophe
- F (mode = Climate_Stabilization) - Eventually stabilize

**Portability Score**: **95%**
- Modes map directly
- Continuous dynamics analogous (emissions → warming like compute → alignment gap)
- Guards translate (events trigger action)
- Only domain-specific: climate science equations

---

### 2. Pandemic Response

**Mapping AI-2027 → Pandemic**:

| AI-2027 | Pandemic Analog | Justification |
|---------|----------------|---------------|
| **Modes** | | |
| Baseline | Pre_Epidemic | Low transmission, no interventions |
| Race | Uncontrolled_Spread | No mitigations, exponential growth |
| Slowdown | Mitigation | Masks, distancing, moderate measures |
| Pause | Suppression | Lockdowns, strict control |
| Catastrophe | Healthcare_Collapse | Hospital overflow, high mortality |
| Aligned | Endemic_Control | Vaccinated, sustainable management |
| **Continuous Variables** | | |
| compute | infected_population | I(t) in SIR model |
| alignment | immunity | Recovered + vaccinated |
| trust | compliance | Adherence to public health measures |
| security | healthcare_capacity | ICU beds, ventilators |
| **Guards** | | |
| evidence ≥ 3 | hospitalizations > capacity | Overflow triggers lockdown |
| trust < 0.4 | compliance_fatigue | Public stops following rules |
| alignment_gap > 10 | immunity_gap > threshold | Not enough immune |
| **Agents** | | |
| US AI Lab | US Government | Federal policy decisions |
| China AI Lab | China Government | Centralized control |
| EU Regulator | WHO | International coordination |
| Public | Population | Compliance behavior |

**Flow Equations (Suppression mode)**:
```typescript
flow_suppression(x) {
  return {
    susceptible: -β_low * x.S * x.I / N,
    infected: β_low * x.S * x.I / N - γ * x.I,
    recovered: γ * x.I,
    hospitalized: p_hosp * β_low * x.S * x.I / N - (1/τ_hosp) * x.H,
    vaccinated: λ_high * x.S  // Vaccination during suppression
  };
}
```

**Properties**:
- AG (hospitalized < capacity * 1.1) - Never overflow hospitals by >10%
- P_≤0.05 [F (mode = Healthcare_Collapse)] - Low risk of collapse
- F (mode = Endemic_Control) - Eventually reach sustainable state

**Portability Score**: **90%**
- Modes map cleanly
- SIR dynamics are well-defined ODEs
- Guards trigger on observables (hospitalization)
- Slight mismatch: epidemic phases more sequential than AI governance (can't go back from endemic to growth easily)

---

### 3. Financial Stability

**Mapping AI-2027 → Finance**:

| AI-2027 | Financial Analog | Justification |
|---------|----------------|---------------|
| **Modes** | | |
| Baseline | Stable_Growth | Normal credit expansion |
| Race | Credit_Bubble | Overlending, risk-taking |
| Slowdown | Tightening | Central bank raises rates |
| Pause | Credit_Freeze | Interbank lending stops |
| Catastrophe | Systemic_Crisis | Bank failures, contagion |
| Aligned | Post_Crisis_Reform | Regulated, stable |
| **Continuous Variables** | | |
| compute | leverage | Total debt / equity |
| alignment | capital_buffers | Bank reserves, safety margin |
| trust | interbank_confidence | Willingness to lend |
| security | regulatory_strength | Capital requirements, oversight |
| **Guards** | | |
| evidence ≥ 3 | bank_failures ≥ 3 | Contagion begins |
| trust < 0.4 | interbank_freeze | Liquidity crisis |
| alignment_gap > 10 | leverage - buffers > 10 | Excessive risk |
| **Agents** | | |
| US AI Lab | Large Bank (JPM) | Systemically important |
| China AI Lab | Large Bank (ICBC) | Different regulatory regime |
| EU Regulator | Central Bank (Fed) | Monetary policy, oversight |
| Public | Depositors | Confidence, bank runs |

**Flow Equations (Tightening mode)**:
```typescript
flow_tightening(x) {
  return {
    leverage: -0.3 * (x.leverage - leverage_target),  // Deleveraging
    buffers: 0.2 * (buffer_target - x.buffers),  // Rebuild capital
    confidence: -0.1 * x.confidence,  // Erodes during tightening
    liquidity: 0.1 * (1 - x.liquidity)  // Central bank provides liquidity
  };
}
```

**Properties**:
- AG (leverage < 30) - Leverage never exceeds 30x
- P_≤0.01 [F (mode = Systemic_Crisis)] - Very low crisis risk
- AG (confidence > 0.3) → AF (mode = Stable_Growth) - If confidence maintained, return to stability

**Portability Score**: **85%**
- Modes map well (bubbles, crises, regulations)
- Financial dynamics are continuous (leverage, liquidity)
- Guards are threshold-based (failures, runs)
- Moderate mismatch: Finance has strong network effects (contagion) not captured in single HA (need ABM layer)

---

### 4. Infrastructure Resilience (Energy Grid)

**Mapping AI-2027 → Energy Grid**:

| AI-2027 | Energy Grid Analog | Justification |
|---------|----------------|---------------|
| **Modes** | | |
| Baseline | Normal_Operation | Balanced supply/demand |
| Race | Demand_Surge | Heatwave, AC usage spikes |
| Slowdown | Load_Shedding | Selective blackouts to prevent cascade |
| Pause | Grid_Shutdown | Controlled shutdown to prevent damage |
| Catastrophe | Cascading_Failure | Blackout spreads, equipment damage |
| Aligned | Restored_With_Buffers | Demand management, storage deployed |
| **Continuous Variables** | | |
| compute | electricity_demand | MW demanded |
| alignment | reserve_capacity | Spare generation capacity |
| trust | grid_frequency | Indicator of balance (50 Hz nominal) |
| security | transmission_health | Line loadings, health |
| **Guards** | | |
| evidence ≥ 3 | lines_overloaded ≥ 3 | Multiple overloads → cascade risk |
| trust < 0.4 | frequency < 49.5 Hz | Frequency deviation triggers emergency |
| alignment_gap > 10 | demand - capacity > 1000 MW | Insufficient supply |
| **Agents** | | |
| US AI Lab | Grid_Operator (ISO) | Dispatch decisions |
| China AI Lab | Generator (coal/renewables) | Supply offers |
| EU Regulator | Regulator (FERC) | Market rules, reliability |
| Public | Consumers | Demand response |

**Flow Equations (Load_Shedding mode)**:
```typescript
flow_load_shedding(x) {
  return {
    demand: -0.5 * x.demand,  // Demand reduced by shedding
    reserve: 0.3 * (reserve_target - x.reserve),  // Rebuild reserves
    frequency: 0.1 * (50.0 - x.frequency),  // Frequency stabilizes
    line_loading: -0.2 * x.line_loading  // Loadings decrease
  };
}
```

**Properties**:
- AG (frequency ∈ [49.5, 50.5]) - Frequency always stable
- P_≤0.001 [F (mode = Cascading_Failure)] - Very low blackout risk
- AG (demand < capacity) - Never exceed capacity

**Portability Score**: **80%**
- Modes map (normal, surge, shedding, shutdown, cascade)
- Continuous (demand, frequency, loading)
- Guards (threshold-based protection)
- Moderate mismatch: Grid has very fast dynamics (seconds to minutes) vs AI governance (months to years); our dt=0.1 may need adjustment

---

## Portability Checklist

### When Porting to New Domain, Ask:

**1. Modes**: What are the discrete regimes/phases?
- ✅ If domain has clear phases (pandemic: growth/mitigation/suppression), HA fits well
- ❌ If continuous with no clear transitions (pure physics), ODE better than HA

**2. Continuous Dynamics**: What smooth quantities evolve?
- ✅ If domain has stocks/flows (emissions, infections, capital), HA continuous layer fits
- ❌ If purely discrete events (network protocol), FSM better than HA

**3. Transition Triggers**: What causes phase changes?
- ✅ If thresholds exist (temperature > 2°C, hospitalizations > capacity), guards work
- ❌ If transitions are arbitrary or scheduled (calendar-based), guards less natural

**4. Agents/Actors**: Who makes decisions?
- ✅ If heterogeneous actors (countries, firms, individuals), ABM layer adds value
- ❌ If single controller or homogeneous, pure HA sufficient

**5. Verification Goals**: What properties matter?
- ✅ If safety-critical (temperature < 2°C, hospitalizations < capacity), verification valuable
- ❌ If purely exploratory (no critical thresholds), SD sufficient

**6. Time Scales**: How fast are dynamics?
- ✅ If minutes to years, standard ODE integration works
- ⚠️ If milliseconds (financial HFT), need specialized solvers
- ⚠️ If geological time (10,000s years), may need simplifications

---

## Generic Abstractions (Reusable Patterns)

### Pattern 1: Risk Threshold Model

**Abstract**:
- Modes: {Baseline, Warning, Emergency, Catastrophe, Recovery}
- Continuous: {risk_indicator, mitigation_capacity, response_readiness}
- Guards: risk_indicator > threshold_i → transition to higher alert
- Flow: mitigation reduces risk, but degrades if not maintained

**Applies to**:
- **AI**: alignment_gap as risk_indicator
- **Climate**: warming as risk_indicator
- **Pandemic**: infection_rate as risk_indicator
- **Finance**: leverage as risk_indicator
- **Infrastructure**: stress as risk_indicator

**Reusable Code**:
```typescript
class RiskThresholdHA {
  constructor(
    thresholds: { warning: number, emergency: number, catastrophe: number },
    flows: { [mode: string]: FlowFunction },
    risk_variable: string
  ) { /* ... */ }
}

// Climate instantiation
const climate_ha = new RiskThresholdHA(
  { warning: 1.5, emergency: 2.0, catastrophe: 3.0 },  // °C
  { /* climate ODEs */ },
  "temperature"
);

// Pandemic instantiation
const pandemic_ha = new RiskThresholdHA(
  { warning: 0.5, emergency: 0.8, catastrophe: 1.0 },  // fraction of capacity
  { /* SIR ODEs */ },
  "hospitalization_rate"
);
```

---

### Pattern 2: Coordination Dilemma Model

**Abstract**:
- Modes: {Defect_Defect, Mixed, Cooperate_Cooperate}
- Agents: Two or more actors with conflicting incentives
- Guards: Based on aggregate cooperation level
- Flow: Collective outcomes better under cooperation, but individual incentive to defect

**Applies to**:
- **AI**: US/China lab race vs coordination
- **Climate**: Country emissions cooperation
- **Pandemic**: Mask wearing (individual burden, collective benefit)
- **Finance**: Bank lending in crisis

**Reusable Code**:
```typescript
class CoordinationDilemmaHA {
  constructor(
    num_agents: number,
    cooperation_threshold: number,  // Fraction needed for cooperation mode
    payoffs: { cooperate: number, defect: number },
    flows: { [mode: string]: FlowFunction }
  ) { /* ... */ }
}
```

---

### Pattern 3: Resource Depletion Model

**Abstract**:
- Modes: {Abundant, Scarcity, Crisis, Collapse, Recovery}
- Continuous: {resource_stock, extraction_rate, regeneration_rate}
- Guards: resource_stock < threshold → scarcity/crisis
- Flow: Extraction depletes, regeneration replenishes (but slower than extraction in crisis)

**Applies to**:
- **Fisheries**: Fish biomass (from [../hybrid_automata/examples/01_ses_fisheries.md](../hybrid_automata/examples/01_ses_fisheries.md))
- **Water**: Aquifer depletion
- **Compute**: Available compute capacity (if capped by energy/chips)
- **Trust**: Social capital (depletes with scandals, regenerates slowly)

**Reusable Code**:
```typescript
class ResourceDepletionHA {
  constructor(
    thresholds: { scarcity: number, crisis: number, collapse: number },
    regeneration_fn: (stock: number) => number,
    extraction_fn: (stock: number, mode: string) => number
  ) { /* ... */ }
}
```

---

## Domain-Agnostic Verification

**Key Insight**: Temporal logic properties are often **domain-agnostic**

### Generic Safety Properties

```typescript
// Template: Never violate critical threshold
const safety_property = (var_name: string, threshold: number) =>
  `AG (${var_name} < ${threshold})`;

// Climate: AG (temperature < 2.0)
// Pandemic: AG (hospitalizations < capacity)
// Finance: AG (leverage < 30)
// Grid: AG (frequency > 49.5)
```

### Generic Liveness Properties

```typescript
// Template: Eventually reach safe/goal state
const liveness_property = (goal_mode: string) =>
  `AF (mode = ${goal_mode})`;

// Climate: AF (mode = Climate_Stabilization)
// Pandemic: AF (mode = Endemic_Control)
// Finance: AF (mode = Post_Crisis_Reform)
```

### Generic Probabilistic Properties

```typescript
// Template: Bound catastrophe risk
const prob_safety = (catastrophe_mode: string, risk_bound: number) =>
  `P_≤${risk_bound} [F (mode = ${catastrophe_mode})]`;

// Climate: P_≤0.05 [F (mode = Runaway_Warming)]
// Pandemic: P_≤0.01 [F (mode = Healthcare_Collapse)]
// Finance: P_≤0.01 [F (mode = Systemic_Crisis)]
```

**Verification Workflow** (domain-agnostic):
1. Build HA for domain
2. Discretize continuous state → MDP
3. Export MDP to PRISM
4. Check generic property templates
5. Interpret results in domain context

**Toolchain** (reusable):
```bash
# Works for any domain
python abstract_to_mdp.py --model climate_ha.json --granularity 5
prism climate_mdp.prism climate_props.pctl
python interpret_results.py --domain climate
```

---

## Implementation: Domain Configuration Files

### Abstract Model Definition

```typescript
// Generic HA specification (domain-agnostic)
interface HASpec {
  name: string;
  modes: {
    id: string;
    label: string;
    flow: string[];  // ODE equations as strings
  }[];
  variables: {
    name: string;
    kind: "continuous" | "discrete";
    domain: [number, number];
  }[];
  guards: {
    from: string;
    to: string;
    condition: string;  // Predicate as string
  }[];
  properties: {
    name: string;
    formula: string;  // LTL/CTL/PCTL formula
  }[];
}
```

### Domain-Specific Configs

**AI Governance** (`ai_governance.json`):
```json
{
  "name": "AI-2027",
  "modes": [
    { "id": "race", "label": "Race", "flow": ["dC/dt = 1.5*C", "dA/dt = 0.05*(1-A)", "dT/dt = -0.05*T"] }
  ],
  "variables": [
    { "name": "compute", "kind": "continuous", "domain": [24, 28] },
    { "name": "alignment", "kind": "continuous", "domain": [0, 1] }
  ],
  "guards": [
    { "from": "baseline", "to": "race", "condition": "compute > 26.5 && time >= 8" }
  ],
  "properties": [
    { "name": "low_catastrophe_risk", "formula": "P_≤0.05 [F (mode = catastrophe)]" }
  ]
}
```

**Climate** (`climate.json`):
```json
{
  "name": "Climate Governance",
  "modes": [
    { "id": "bau", "label": "Business-as-Usual", "flow": ["dE/dt = 0.02*E", "dT/dt = 0.01*(E_cumulative - 500)"] }
  ],
  "variables": [
    { "name": "emissions", "kind": "continuous", "domain": [0, 50] },
    { "name": "temperature", "kind": "continuous", "domain": [1.0, 3.0] }
  ],
  "guards": [
    { "from": "bau", "to": "net_zero", "condition": "extreme_events >= 3 && cooperation > 0.6" }
  ],
  "properties": [
    { "name": "stay_below_2C", "formula": "AG (temperature < 2.0)" }
  ]
}
```

**Same Engine, Different Config**:
```typescript
// Domain-agnostic HA engine
class HybridAutomatonEngine {
  loadSpec(spec: HASpec) { /* Parse JSON, build HA */ }
  simulate(initial: State, horizon: number) { /* ODE integration + transitions */ }
  verify(property: string) { /* Abstract to MDP, call PRISM */ }
}

// Usage
const engine = new HybridAutomatonEngine();
engine.loadSpec(JSON.parse(fs.readFileSync("ai_governance.json")));
const result = engine.verify("low_catastrophe_risk");

// Same engine for climate
engine.loadSpec(JSON.parse(fs.readFileSync("climate.json")));
const climate_result = engine.verify("stay_below_2C");
```

---

## Portability Validation

### Success Criteria for Portable Design

1. **< 10% of code changes** when porting to new domain
   - Only config files change, not engine
   - ✅ Pass if can add new domain in 1 day of work

2. **Properties reusable** across domains
   - Safety, liveness, probabilistic templates apply
   - ✅ Pass if ≥80% of properties are generic

3. **Tool chain unchanged**
   - Same PRISM, same visualization, same APIs
   - ✅ Pass if no tool modifications needed

4. **Validation workflow consistent**
   - Same approach (simulation → abstraction → verification)
   - ✅ Pass if documentation doesn't need domain-specific sections

---

## Conclusion: Design for Generality, Implement for Specificity

**Design Philosophy**:
- **Abstract interfaces**: Never reference "AI labs" or "alignment" in core engine
- **Generic contracts**: `Mode`, `ContinuousVariable`, `Guard` work for any domain
- **Configurable dynamics**: Flow equations, thresholds, properties come from config files
- **Reusable patterns**: Risk threshold, coordination dilemma, resource depletion templates

**Implementation Reality**:
- **Start with AI-2027**: Get one domain working end-to-end
- **Refactor for generality**: Extract domain-specific code to config
- **Validate with second domain**: Port to climate or pandemic
- **Third domain confirms**: If climate worked, finance should be easy

**Result**:
- AI governance is our **marquee use case**
- But the system works for **any** socio-technical system with:
  - Discrete phases/regimes
  - Continuous dynamics
  - Critical thresholds
  - Need for formal guarantees

**Portability Score by Domain**:
- Climate: 95%
- Pandemic: 90%
- Finance: 85%
- Infrastructure: 80%

**Why not 100%?** Domain-specific physics (climate science, epidemiology, financial networks) always requires some custom modeling. But **90% of the framework is reusable**.

---

## Related Documentation

- [comparison_matrix.md](comparison_matrix.md) - Which formalism for which domain?
- [qualitative_analysis.md](qualitative_analysis.md) - Synthesis strategies that work across domains
- [macro_alternatives.md](macro_alternatives.md) - Macro-scale tools (SD, DEVS) for all domains
- [../hybrid_automata/examples/](../hybrid_automata/examples/) - Domain examples (fisheries, epidemic, AI)

---

**Final Thought**: A good framework should feel **inevitable** once you understand the domain. If you have to contort your problem to fit the framework, the framework is too rigid. Our hybrid automaton approach passes the portability test because modes, flows, guards, and properties are **universal patterns** in socio-technical systems.
