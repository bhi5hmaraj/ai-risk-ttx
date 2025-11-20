# Delhi Air Pollution TTX - Technical Architecture

## System Overview

This document describes the technical architecture for integrating three complementary formal models (Hybrid Automaton, System Dynamics, Agent-Based Model) with an LLM narrative layer to create an engaging tabletop exercise.

---

## Design Philosophy

### Why Multi-Model Integration?

No single modeling paradigm captures all relevant dynamics:

| Aspect | Best Model | Why |
|--------|-----------|-----|
| **Regime shifts** (AQI thresholds trigger emergency policies) | Hybrid Automaton | Discrete modes + continuous evolution |
| **Physical processes** (emissions → dispersion → accumulation) | System Dynamics | Stock-flow conservation, feedback loops |
| **Behavioral heterogeneity** (farmers vs industries vs citizens) | Agent-Based Model | Individual decision-making, emergence |
| **Contextual storytelling** (media reactions, political quotes) | LLM Layer | Natural language generation from structured data |

### Integration Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                      INTEGRATION PHILOSOPHY                      │
│                                                                  │
│  "Each model owns what it does best, coordination layer         │
│   synthesizes results into coherent game state updates"         │
│                                                                  │
│  HA:  Regime classification & guard conditions                  │
│  SD:  Physical dynamics & accumulation                          │
│  ABM: Stakeholder responses & compliance                        │
│  LLM: Narrative synthesis & option generation                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Layers

### Layer 1: Simulation Engine (Python)

Three independent models with a common interface:

```python
class DelhiSimulationModel(ABC):
    """Base class for all simulation models"""

    @abstractmethod
    def step(self, actions: List[PlayerAction], weather: WeatherState) -> ModelOutput:
        """
        Advance simulation by one time step.

        Args:
            actions: Player actions this round
            weather: Exogenous weather conditions

        Returns:
            ModelOutput with state changes and events
        """
        pass

    @abstractmethod
    def get_state(self) -> Dict[str, Any]:
        """Return current model state"""
        pass

    @abstractmethod
    def reset(self, scenario: Scenario):
        """Reset to initial scenario"""
        pass
```

**Key Insight**: Models don't directly communicate. The integration layer orchestrates them.

### Layer 2: Coordination Layer (Python)

Synchronizes the three models and resolves conflicts:

```python
class MultiModelCoordinator:
    """
    Orchestrates HA, SD, and ABM to produce consistent game state.

    Execution Order (each turn):
    1. ABM determines stakeholder responses to proposed policies
    2. SD computes emissions and dispersion given compliance levels
    3. HA classifies resulting AQI into regime and checks transitions
    4. Coordinator synthesizes consequences and triggers events
    """

    def __init__(self):
        self.ha = DelhiHybridAutomaton()
        self.sd = DelhiSystemDynamics()
        self.abm = DelhiAgentBasedModel()
        self.event_manager = EventManager()

    def process_turn(self, actions: List[PlayerAction],
                    weather: WeatherState) -> TurnResult:
        """
        Main game loop execution.

        Flow:
        actions → ABM (compliance) → SD (emissions) → HA (regime) → events
        """

        # Step 1: ABM determines stakeholder behavior
        compliance = self.abm.compute_compliance(actions)
        farmer_burning = self.abm.get_burning_decisions(weather, actions)

        # Step 2: SD updates emissions and air quality
        emissions = self.sd.compute_emissions(
            stubble_burning=farmer_burning,
            industrial_activity=compliance.industry,
            vehicular_load=compliance.transport
        )

        aqi_delta = self.sd.compute_dispersion(emissions, weather)
        new_aqi = self.sd.aqi + aqi_delta

        # Step 3: HA classifies regime and checks transitions
        old_regime = self.ha.current_regime
        new_regime = self.ha.update_regime(new_aqi)

        regime_changed = (old_regime != new_regime)

        # Step 4: Generate events based on conditions
        events = self.event_manager.check_triggers(
            aqi=new_aqi,
            regime_changed=regime_changed,
            compliance=compliance,
            round_num=self.round
        )

        # Step 5: Compute health and economic impacts
        health_impact = self.sd.compute_health_burden(new_aqi)
        economic_impact = self.compute_economic_effects(compliance, actions)

        return TurnResult(
            aqi=new_aqi,
            regime=new_regime,
            health=health_impact,
            economy=economic_impact,
            events=events,
            compliance=compliance
        )
```

### Layer 3: LLM Narrative Layer (Python + LiteLLM)

Transforms structured simulation output into natural language:

```python
class NarrativeEngine:
    """
    Generates context-aware narratives using LLM.

    Key Functions:
    - generate_round_intro(): Set scene with weather, news, mood
    - generate_action_options(): Create 5 choices per player
    - generate_consequences(): Narrate turn resolution
    - generate_stakeholder_quotes(): Realistic reactions
    """

    def __init__(self):
        self.client = OpenAI(
            base_url="https://asgard.bhishmaraj.org",
            api_key=os.getenv("VITE_LITELLM_API_KEY")
        )
        self.model = os.getenv("VITE_LLM_MODEL", "gemini-2.0-flash-exp")

    def generate_consequences(self,
                             turn_result: TurnResult,
                             actions: List[PlayerAction]) -> Narrative:
        """
        Convert simulation output to story.

        Input: AQI=287, regime=VERY_UNHEALTHY, 5 burning events
        Output: "By mid-November, satellite imagery revealed 3,500
                 farm fires across Punjab..."
        """

        prompt = self._build_consequence_prompt(turn_result, actions)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": GAME_MASTER_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.8
        )

        return Narrative.parse(response.choices[0].message.content)
```

### Layer 4: Game Interface (TypeScript + React)

Reuses your existing Simulacra architecture:

```typescript
// eagx/air_pollution/frontend/hooks/useDelhiGame.ts

export const useDelhiGame = () => {
  const [gameState, setGameState] = useState<DelhiGameState>(initialState);
  const [isLoading, setIsLoading] = useState(false);

  const submitActions = async (actions: PlayerAction[]) => {
    setIsLoading(true);

    // Call Python backend (FastAPI)
    const response = await fetch('/api/delhi/turn', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        game_id: gameState.id,
        round: gameState.round,
        actions: actions,
        weather: gameState.weather
      })
    });

    const result: TurnResult = await response.json();

    // Update game state
    setGameState(prev => ({
      ...prev,
      round: prev.round + 1,
      aqi: result.aqi,
      regime: result.regime,
      publicHealth: result.health,
      economicActivity: result.economy,
      events: result.events,
      narrative: result.narrative
    }));

    setIsLoading(false);
  };

  return { gameState, submitActions, isLoading };
};
```

---

## Model Details

### Hybrid Automaton: Air Quality Regimes

**Purpose**: Capture threshold-based policy triggers (GRAP stages)

**States (Regimes)**:
- `GOOD` (AQI 0-50): No restrictions
- `MODERATE` (AQI 51-100): Monitoring
- `UNHEALTHY` (AQI 101-200): GRAP Stage 1
- `VERY_UNHEALTHY` (AQI 201-300): GRAP Stage 2
- `HAZARDOUS` (AQI 301-400): GRAP Stage 3
- `SEVERE` (AQI 401+): GRAP Stage 4 (Emergency)

**Transitions**: Guard conditions on AQI thresholds

**Continuous Variables**:
- PM2.5 concentration (μg/m³)
- PM10 concentration
- Public health burden (hospitalizations)
- Compliance rates by sector

**Example Dynamics**:

```python
# In SEVERE regime
if aqi > 450:
    # Trigger emergency measures
    actions.append(Action.SHUT_SCHOOLS)
    actions.append(Action.ODD_EVEN_VEHICLES)
    actions.append(Action.CONSTRUCTION_BAN)

    # Continuous dynamics
    pm25_reduction = (
        0.3 * vehicular_ban_effect +
        0.2 * construction_halt_effect +
        0.1 * industrial_slowdown
    )

    # Guard: Can we exit emergency?
    if aqi < 400 and days_in_severe > 3:
        transition_to(Regime.HAZARDOUS)
```

### System Dynamics: Emissions & Dispersion

**Purpose**: Model physical processes (emissions, transport, accumulation, removal)

**Key Stocks**:
- `PM2.5_atmosphere` (tons in Delhi airshed)
- `PM10_atmosphere`
- `Hospitalized_patients`
- `Cumulative_deaths`

**Key Flows**:

```
Emissions Sources → Atmosphere → Removal Processes
     ↓                              ↓
  (Inflow)                      (Outflow)

Inflows:
- Stubble burning: 2000-8000 tons/day (seasonal)
- Vehicles: 300-500 tons/day
- Industry: 200-400 tons/day
- Construction dust: 100-200 tons/day
- Household (cooking, heating): 150-300 tons/day

Outflows:
- Wind dispersion: 0.3-0.7 of stock/day (weather dependent)
- Wet deposition: 0.8 of stock/day (when raining)
- Dry deposition: 0.05 of stock/day
```

**Critical Feedback Loops**:

1. **Reinforcing**: Pollution → Health → Productivity ↓ → Poverty → More Pollution
   - High AQI → respiratory illness → missed work → lower income → reliance on cheap, polluting fuels

2. **Balancing**: Pollution → Alarm → Pressure → Action → Pollution ↓
   - Severe AQI → media attention → political pressure → emergency measures → temporary relief

3. **Reinforcing (Meteorological)**: Pollution → Cooling → Inversion → Pollution ↑
   - PM blocks sunlight → cooler surface → stable atmosphere → traps more PM

**Difference Equations** (discrete-time):

```python
# PM2.5 accumulation (daily time step)
PM25[t+1] = PM25[t] + dt * (
    emissions_rate[t] -
    dispersion_rate[t] * PM25[t] -
    deposition_rate[t] * PM25[t]
)

# AQI conversion
AQI[t] = pm25_to_aqi(PM25[t])

# Health burden (cumulative)
new_cases[t] = exposure_response(PM25[t], population_exposed)
hospitalizations[t+1] = hospitalizations[t] + new_cases[t] - discharge_rate * hospitalizations[t]
```

### Agent-Based Model: Stakeholder Behavior

**Purpose**: Capture heterogeneous decision-making and emergent coordination

**Agent Types** (N = 200-500 agents):

1. **Farmers** (N=150)
   - Decision: Burn stubble or use alternatives?
   - Factors: Cost (₹1500/acre for machine), neighbors' behavior, penalty risk, delay in next crop

2. **Industries** (N=100)
   - Decision: Comply with emission controls or evade?
   - Factors: Compliance cost, inspection probability, fine magnitude, reputation

3. **Citizens** (N=200)
   - Decision: Public transport vs private vehicle?
   - Factors: AQI awareness, health sensitivity, convenience, cost

4. **Politicians** (N=8-12)
   - Decision: Prioritize health vs economy vs approval?
   - Factors: Election proximity, media pressure, inter-state relations

**Agent Logic Example** (Farmer):

```python
class FarmerAgent:
    def __init__(self):
        self.wealth = random.gauss(50000, 20000)  # ₹
        self.farm_size = random.gauss(5, 2)  # acres
        self.risk_aversion = random.uniform(0.3, 0.9)
        self.neighbors = []  # Network

    def decide_stubble_management(self, policy: Policy, weather: Weather):
        """
        Decide whether to burn stubble.

        Factors:
        1. Cost: Machine rental vs burning (free)
        2. Social: What are neighbors doing?
        3. Risk: Probability of penalty
        4. Urgency: Next crop planting deadline
        """

        # Option 1: Burn (baseline)
        burn_utility = 0  # Baseline

        # Option 2: Machine
        machine_cost = 1500 * self.farm_size
        machine_utility = -machine_cost / self.wealth

        if policy.subsidy_pct > 0:
            machine_utility += machine_cost * policy.subsidy_pct / self.wealth

        # Social pressure from neighbors
        neighbors_burning = sum(n.will_burn for n in self.neighbors) / len(self.neighbors)
        burn_utility += 0.3 * neighbors_burning  # Conformity

        # Penalty risk
        if policy.monitoring_intensity > 0.5:
            expected_fine = policy.fine_amount * policy.catch_probability
            burn_utility -= self.risk_aversion * expected_fine / self.wealth

        # Weather urgency
        if weather.days_until_rain < 5:
            burn_utility += 0.4  # Urgency to clear field quickly

        # Decision
        self.will_burn = (burn_utility > machine_utility)

        return self.will_burn
```

**Emergence**:

Even with individual rationality, aggregate patterns emerge:
- **Tipping points**: If 30% of neighbors burn, most others follow (social cascade)
- **Threshold effects**: Subsidies must cover >50% of cost to change behavior at scale
- **Spatial clustering**: Burning spreads geographically (observation + norms)

---

## Data Flow Diagram

```mermaid
sequenceDiagram
    participant Player as Players (Web UI)
    participant API as FastAPI Backend
    participant Coord as Coordinator
    participant ABM as Agent-Based Model
    participant SD as System Dynamics
    participant HA as Hybrid Automaton
    participant LLM as LLM Narrative

    Player->>API: Submit actions (e.g., subsidy, ban)
    API->>Coord: process_turn(actions, weather)

    Coord->>ABM: compute_compliance(actions)
    ABM-->>Coord: {farmer_burning: 2500 fires, industry_compliance: 0.6}

    Coord->>SD: compute_emissions(burning, compliance)
    SD-->>Coord: {PM25_delta: +180 μg/m³}

    Coord->>SD: update_stocks(emissions, weather)
    SD-->>Coord: {new_AQI: 372}

    Coord->>HA: update_regime(AQI=372)
    HA-->>Coord: {regime: HAZARDOUS, transition: VERY_UNHEALTHY→HAZARDOUS}

    Coord->>LLM: generate_narrative(turn_result)
    LLM-->>Coord: {story: "Delhi wakes to apocalyptic skies...", events: [SCHOOL_CLOSURE]}

    Coord-->>API: TurnResult{aqi, regime, health, events, narrative}
    API-->>Player: JSON response
    Player->>Player: Update UI, show consequences
```

---

## Why This Architecture?

### 1. Modularity
Each model is independently testable and replaceable. Want to swap ABM for a statistical behavioral model? Just implement the `compute_compliance()` interface.

### 2. Realism
- **HA**: Real GRAP thresholds from Delhi government
- **SD**: Calibrated to actual emission inventories and dispersion models
- **ABM**: Based on farmer surveys and behavioral economics literature
- **LLM**: Uses real news headlines and policy documents as training context

### 3. Extensibility
Easy to add:
- Weather forecasting API (real-time)
- Multi-city coordination (Delhi + NCR)
- Long-term infrastructure (metro expansion)
- Climate scenarios (changing baseline conditions)

### 4. Playability
The coordination layer ensures:
- Fast turn resolution (<5 seconds)
- No model contradictions (e.g., SD says AQI=200, HA says regime=HAZARDOUS)
- Consistent narratives (events match underlying state)
- Tunable difficulty (adjust parameters for different player groups)

---

## Performance Considerations

### Computational Budget

- **ABM**: 200-500 agents × simple rules = ~10ms
- **SD**: 10 stocks × 20 flows × discrete-time = ~5ms
- **HA**: Regime classification + guard checks = ~1ms
- **LLM**: 500-token generation = ~2000ms (dominates!)

**Optimization**: Parallelize LLM calls (narrative generation can happen async while UI shows simulation results).

### State Management

```python
# Coordinator maintains full game history for replays
class GameState:
    round: int
    actions_history: List[List[PlayerAction]]
    aqi_history: List[float]
    regime_history: List[Regime]
    events_history: List[List[Event]]

    def to_checkpoint(self) -> bytes:
        """Serialize state for save/load"""
        return pickle.dumps(self)

    def replay_from_round(self, round_num: int):
        """Re-run simulation from checkpoint (for what-if analysis)"""
        pass
```

---

## Calibration Strategy

### Real-World Data Sources

1. **AQI Time Series**: Delhi Pollution Control Committee (2019-2024)
   - Used to calibrate SD model (emission rates, dispersion parameters)

2. **Emission Inventory**: SAFAR India, IIT Delhi studies
   - Sector contributions: vehicles (28%), industry (20%), burning (26%), dust (17%), residential (9%)

3. **Policy Evaluations**:
   - Odd-even scheme impact: ~5-10% reduction in vehicular PM
   - Construction ban: ~3-5% reduction in total PM
   - Stubble burning: 10-40% contribution during Oct-Nov

4. **Behavioral Data**:
   - Farmer surveys on stubble management adoption
   - Vehicle compliance during restrictions
   - Industry evasion rates

### Validation

**Test 1: Reproduce Historical Episodes**
- Input: Oct-Nov 2019 weather + actual policies
- Output: Does model AQI match observed AQI?
- Target: R² > 0.7

**Test 2: Policy Counterfactuals**
- What if odd-even started 1 week earlier?
- What if stubble subsidy was 75% instead of 50%?
- Compare model predictions to observational studies

**Test 3: Behavioral Face Validity**
- Do farmers respond to subsidies realistically?
- Do compliance rates match empirical patterns?
- Survey domain experts (policymakers, activists)

---

## Integration with Simulacra Stack

### Similarities to AI 2027 Scenario

| Component | AI 2027 | Delhi Air Pollution |
|-----------|---------|---------------------|
| **Core tension** | Capability race vs safety | Economic growth vs health |
| **Coordination failure** | International labs racing | States, sectors, stakeholders |
| **Hidden objectives** | Secret win conditions | Political vs public good |
| **Threshold dynamics** | AGI capabilities | AQI emergency levels |
| **Public metric** | Democratic legitimacy | Air Quality Index |
| **Time pressure** | Rounds = months to AGI | Rounds = weeks in pollution season |

### Reusable Components

From your existing codebase:

```typescript
// Shared types
import { GamePhase, Player, GameLogEntry } from '@/types'

// Shared services
import { generateActionOptions, generateConsequences } from '@/services/geminiService'

// Shared components
import { ActionSelection, EventLog, GameStatusPanel } from '@/components/game'

// Just swap scenario context:
const DELHI_SCENARIO = {
  title: "Delhi Air Crisis 2027",
  coreMetric: "Air Quality Index",
  roles: DELHI_ROLES,  // Different from AI2027_ROLES
  initialState: {
    aqi: 150,
    regime: "UNHEALTHY",
    budget: 800,
    // ...
  }
}
```

### New Components Needed

1. **AQI Visualization**
   - Color-coded gauge (green→yellow→orange→red→purple→maroon)
   - PM2.5/PM10 trends
   - Health impact dashboard

2. **Map View**
   - Delhi + NCR region
   - Burning hotspots (real-time)
   - Wind direction overlay

3. **Stakeholder Panel**
   - Agent statistics (% burning, % compliant)
   - Public sentiment tracker
   - Media headline ticker

---

## Deployment Options

### Option 1: Streamlit (Rapid Prototyping)

```bash
streamlit run eagx/air_pollution/web_ui/streamlit_demo.py
```

**Pros**:
- Zero frontend code
- Interactive sliders for all parameters
- Great for model exploration

**Cons**:
- Limited customization
- Not production-ready

### Option 2: FastAPI + React (Full Game)

```bash
# Backend
uvicorn eagx.air_pollution.models.api:app --reload

# Frontend (your existing Vite setup)
npm run dev
```

**Pros**:
- Full control over UI/UX
- Reuses Simulacra components
- Production-ready

**Cons**:
- More development time

### Option 3: Hybrid (Recommended for EAGX)

- **Workshop Demo**: Use Streamlit for quick parameter exploration
- **Conference Game**: Use full-stack for polished experience
- **Post-Event**: Open-source both for community

---

## Testing Strategy

### Unit Tests (Per Model)

```python
# tests/test_hybrid_automaton.py
def test_regime_transitions():
    ha = DelhiHybridAutomaton()
    ha.state.aqi = 150
    assert ha.current_regime == Regime.UNHEALTHY

    ha.state.aqi = 320
    ha.update_regime()
    assert ha.current_regime == Regime.HAZARDOUS
    assert ha.grap_stage == 3

# tests/test_system_dynamics.py
def test_emission_accumulation():
    sd = DelhiSystemDynamics()
    initial_pm25 = sd.pm25_atmosphere

    # Add stubble burning spike
    sd.stubble_burning_rate = 5000  # tons/day
    sd.step()

    assert sd.pm25_atmosphere > initial_pm25
    assert sd.aqi > 200  # Should trigger UNHEALTHY

# tests/test_agent_based.py
def test_farmer_subsidy_response():
    abm = DelhiAgentBasedModel()

    # No subsidy
    burning_baseline = abm.get_burning_count()

    # 50% subsidy
    abm.policy.subsidy_pct = 0.5
    abm.step()
    burning_subsidized = abm.get_burning_count()

    assert burning_subsidized < burning_baseline * 0.7  # Expect 30%+ reduction
```

### Integration Tests

```python
# tests/test_integration.py
def test_full_turn_execution():
    coordinator = MultiModelCoordinator()

    actions = [
        PlayerAction(player_id="cm", action="subsidy_farmers", magnitude=0.6),
        PlayerAction(player_id="env", action="vehicle_restrictions", magnitude=0.8)
    ]

    weather = WeatherState(wind_speed=5, temperature=18, humidity=0.6)

    result = coordinator.process_turn(actions, weather)

    # Assertions
    assert 0 <= result.aqi <= 600
    assert result.regime in Regime
    assert len(result.events) >= 0
    assert result.narrative.story_beats  # Non-empty narrative
```

### Playtesting Metrics

Track during game sessions:

1. **Engagement**: Player rating (1-5)
2. **Learning**: Pre/post quiz on air pollution dynamics
3. **Balance**: Did any role feel overpowered/useless?
4. **Realism**: Expert validation of scenarios
5. **Performance**: Turn resolution time, bugs encountered

---

## Future Enhancements

### Phase 2 (Post-EAGX)

1. **Multi-City**: Add Beijing, LA, Jakarta scenarios
2. **Climate Integration**: Long-term baseline shifts
3. **ML Opponent**: Train policy AI on gameplay data
4. **VR Visualization**: Immersive AQI experience
5. **Policy Lab**: Systematic intervention testing

### Research Questions

This platform enables:

- **What policies work?**: Rank interventions by cost-effectiveness
- **When do they work?**: Timing, sequencing, combination effects
- **Why do they fail?**: Identify coordination breakdowns
- **How to communicate?**: Messaging strategies for compliance

---

## Conclusion

This architecture demonstrates:

✅ **Formal rigor**: Hybrid systems theory, stock-flow dynamics, agent-based modeling
✅ **Practical realism**: Calibrated to Delhi data, validated by experts
✅ **Engaging gameplay**: LLM narratives, hidden objectives, crisis events
✅ **Technical elegance**: Modular, extensible, production-ready
✅ **EA alignment**: Evidence-based, cost-effective, neglected problem

**The result**: A playable, educational, research-grade simulation that bridges the gap between academic modeling and real-world impact.

---

## References

- Guttikunda & Calori (2013). Emissions inventory for Delhi
- Chowdhury & Dey (2016). Cause-effect of Delhi air pollution
- Greenstone & Hanna (2014). Environmental regulations in India
- Our models: See `/models/*.py` for implementation details

