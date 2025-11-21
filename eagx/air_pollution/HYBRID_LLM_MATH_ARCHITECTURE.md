# Hybrid LLM + Math Model Architecture

## The Core Problem

You've identified the fundamental tension in combining LLMs with formal models for TTX:

| Aspect | Math Models | LLMs | Players Want |
|--------|-------------|------|--------------|
| **Action Space** | Small, bounded, enumerable | Infinite, unbounded, generative | Open-ended creativity |
| **State Space** | Fixed dimensions, known variables | Can introduce anything | Emergent complexity |
| **Effects** | Parametric, deterministic | Learned, contextual | Both predictability AND surprise |
| **Control** | Precise, reproducible | Stochastic | "Illusion of control" + agency |

**The Question**: How do we design a system that is:
- ✅ Mathematically tractable (formal models can compute)
- ✅ Creatively open (LLM can generate novel actions)
- ✅ Player-empowering (custom actions feel meaningful)

---

## Solution: Three-Layer Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              LAYER 1: NATURAL LANGUAGE INTERFACE            │
│  Player: "I want to pay farmers to not burn + enforce it"  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│         LAYER 2: LLM TRANSLATOR + VALIDATOR                 │
│  Maps: Natural Language → Formal Action Representation      │
│  Validates: Feasibility, Budget, Authority, Physics         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│          LAYER 3: HYBRID EXECUTOR                           │
│  Parametric Effects (Math) + Emergent Effects (LLM)         │
│  Updates: Base State (Math) + Dynamic State (LLM)           │
└─────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Action Grammar (Bounded but Composable)

### Core Insight: Actions = Primitives + Parameters + Narrative

Instead of:
- ❌ **Fixed menu** (boring, no agency): ["Subsidy", "Ban", "Monitor"]
- ❌ **Pure free-form** (intractable): "Do whatever you want"

We use:
- ✅ **Compositional grammar**: Small set of primitives that combine

### Action Primitives (12 Core Types)

```python
class ActionPrimitive(Enum):
    # Resource allocation
    SUBSIDIZE = "subsidize"  # Transfer money to sector
    TAX = "tax"              # Impose cost

    # Regulation
    BAN = "ban"              # Prohibit activity
    MANDATE = "mandate"      # Require activity
    CAP = "cap"              # Set upper limit

    # Information
    MONITOR = "monitor"      # Increase surveillance
    PUBLICIZE = "publicize"  # Make info public

    # Infrastructure
    BUILD = "build"          # Long-term investment
    UPGRADE = "upgrade"      # Improve existing

    # Coordination
    NEGOTIATE = "negotiate"  # Broker agreement
    COMPENSATE = "compensate" # Side payment

    # Custom
    NOVEL = "novel"          # Entirely new (LLM-defined)
```

### Why This Works

**Example Player Input**: "I want to give farmers money to buy machinery AND increase enforcement to make sure they use it"

**LLM Decomposes**:
1. Primary: `SUBSIDIZE(target=farmers, magnitude=0.7, cost=300)`
2. Secondary: `MONITOR(target=farmers, magnitude=0.6, cost=50)`

**Math Model Computes**:
- Subsidy effect: `reduction = 0.6 * 0.7 * (1 - current_compliance)`
- Monitor effect: `enforcement = 0.6 * base_enforcement`
- Combined: `total_reduction = subsidy_effect + (monitor_effect * synergy_bonus)`

**LLM Generates Narrative**:
"The government announced a ₹300 crore subsidy covering 70% of Happy Seeder costs, paired with satellite monitoring of farm fires. Farmer leaders cautiously welcomed the move, though some questioned whether enforcement would be fair..."

### Compositionality Gives Exponential Variety

- **12 primitives** × **5 sectors** × **10 magnitude levels** × **3 duration options** = **1,800 basic actions**
- **Combinations**: `[SUBSIDIZE + MONITOR]`, `[BAN + COMPENSATE]` = **66+ pairs**
- **Custom parameters**: Geographic scope, timing, conditions = **thousands of variants**

**Result**: Feels open-ended to players, but math model only needs 12 effect functions.

---

## Layer 2: LLM Translator (Natural Language → Formal Representation)

### What the Translator Does

1. **Parse Intent**: "pay farmers to not burn" → `SUBSIDIZE(target=farmers)`
2. **Extract Parameters**: "generous" → `magnitude=0.75`, estimate cost
3. **Validate Feasibility**:
   - Budget check: `cost ≤ available_budget`
   - Authority check: Does player's role allow this?
   - Physics check: Can't reduce AQI by 1000 points
4. **Generate Formal Action**: Structured representation for math model
5. **Create Narrative**: Player-facing description

### Example Translation

**Input**: "I want to ban all farm fires in Punjab during October and compensate farmers for their losses"

**LLM Output**:
```json
{
  "feasible": true,
  "actions": [
    {
      "primitive": "BAN",
      "parameters": {
        "magnitude": 1.0,
        "target": {"sector": "farmers", "geographic_scope": "punjab"},
        "duration": 1,
        "cost": 5
      },
      "player_facing_name": "Total Stubble Burning Ban (Punjab, Oct)"
    },
    {
      "primitive": "COMPENSATE",
      "parameters": {
        "magnitude": 0.8,
        "target": {"sector": "farmers", "geographic_scope": "punjab"},
        "cost": 200
      },
      "player_facing_name": "Farmer Compensation Fund (₹200cr)"
    }
  ],
  "total_cost": 205,
  "expected_effects": {
    "aqi_delta": -80,
    "farmer_approval": -30,
    "public_approval": +15
  },
  "narrative": "A sweeping ban on all agricultural burning in Punjab during October, coupled with a ₹200 crore compensation fund for affected farmers. Enforcement will rely on satellite imagery and local inspectors."
}
```

### Validation Layer (Critical for Tractability)

```python
def validate_action(action, game_state, player_role):
    """
    Ensures action is feasible before execution.

    Prevents:
    - Spending non-existent money
    - Taking actions outside authority
    - Violating physics (e.g., instant infrastructure)
    - Creating degenerate states
    """

    # Budget check
    if action.cost > game_state["budget"]:
        return False, f"Insufficient budget: need ₹{action.cost}cr, have ₹{game_state['budget']}cr"

    # Authority check
    if not player_has_authority(player_role, action.primitive):
        return False, f"{player_role} cannot {action.primitive.value}"

    # Magnitude bounds check
    if not (0 <= action.parameters.magnitude <= 1):
        return False, f"Magnitude must be [0, 1], got {action.parameters.magnitude}"

    # Physics check
    if action.primitive == ActionPrimitive.BUILD:
        if action.parameters.delay_rounds < 2:
            return False, "Infrastructure takes at least 2 rounds to build"

    return True, "OK"
```

---

## Layer 3: Hybrid Executor (Math + LLM Effects)

### Key Innovation: Split Effects into Parametric + Emergent

**Parametric Effects** (Math-based, deterministic):
- Direct causal relationships with clear parameters
- Example: Subsidy of magnitude M reduces burning by `0.6 * M * (1 - compliance)`
- Fast to compute, reproducible, interpretable

**Emergent Effects** (LLM-based, contextual):
- Second-order consequences
- Narrative developments
- Behavioral responses hard to model parametrically
- Example: "Subsidy triggers industry lobby fears they'll be next"

### Execution Flow

```python
def execute_action(action, current_state, game_context):
    """
    Execute action using hybrid approach.

    Returns:
        (new_state, narrative)
    """

    state_delta = {}

    # 1. PARAMETRIC EFFECTS (Math)
    for effect_fn in action.parametric_effects:
        param_delta = effect_fn(current_state, action.parameters)
        state_delta.update(param_delta)

    # Example for SUBSIDIZE:
    # param_delta = {
    #     "aqi_delta": -60,
    #     "farmers_compliance": 0.7,
    #     "budget_delta": -300
    # }

    # 2. EMERGENT EFFECTS (LLM)
    if action.requires_llm_effects():
        llm_delta, narrative = compute_llm_effects(
            action, current_state, state_delta
        )
        state_delta.update(llm_delta)

    # Example LLM output:
    # llm_delta = {
    #     "media_attention": +20,
    #     "farmer_trust": +10,
    #     "industry_lobbying": +5
    # }
    # narrative = "Farmer leaders cautiously welcomed..."

    else:
        narrative = generate_basic_narrative(action, state_delta)

    # 3. UPDATE STATE
    new_state = apply_delta(current_state, state_delta)

    # 4. UPDATE DYNAMIC VARIABLES
    new_state = update_dynamic_states(new_state)

    return new_state, narrative
```

### Example: SUBSIDIZE Action

**Parametric Effect Function**:
```python
def subsidize_effect(current_state, params):
    """
    Subsidy reduces unwanted behavior.

    Model based on behavioral economics:
    - Elasticity: How responsive is behavior to price changes?
    - Baseline compliance: Can't subsidize people already complying
    - Diminishing returns: Hard to reach last 20%
    """

    target = params.target.sector
    magnitude = params.magnitude  # [0, 1]

    # Parameters calibrated from real data
    base_elasticity = 0.6  # Literature: 50-70% reduction at full subsidy
    current_compliance = current_state.get(f"{target}_compliance", 0.3)

    # Behavioral response
    reduction = base_elasticity * magnitude * (1 - current_compliance)

    # Diminishing returns (hard to reach 100%)
    if current_compliance > 0.8:
        reduction *= 0.5

    # Map to AQI (sector-specific)
    sector_aqi_contribution = {
        "farmers": 30,  # Oct-Nov burning
        "industry": 20,
        "vehicles": 25
    }

    aqi_delta = -sector_aqi_contribution[target] * reduction

    # Political effects
    subsidy_popularity = magnitude * 5  # People like subsidies

    return {
        "aqi_delta": aqi_delta,
        f"{target}_compliance": current_compliance + reduction,
        "public_approval_delta": subsidy_popularity,
        "budget_delta": -params.cost
    }
```

**LLM Emergent Effects**:
```python
def compute_llm_effects(action, current_state, parametric_delta):
    """
    LLM computes effects hard to model parametrically.

    Examples:
    - Media narrative: Does subsidy get positive or cynical coverage?
    - Political consequences: Does it embolden other sectors to demand subsidies?
    - Unintended behaviors: Do farmers take subsidy but still burn?
    - Trust dynamics: Does government follow-through build credibility?
    """

    prompt = f"""
    Action: {action.narrative_description}

    Parametric effects computed:
    - AQI will decrease by {parametric_delta['aqi_delta']}
    - Farmer compliance will increase to {parametric_delta['farmers_compliance']}
    - Public approval will increase by {parametric_delta['public_approval_delta']}

    What emergent/second-order effects might occur?

    Consider:
    1. Media framing (positive: "government helps farmers", negative: "rewarding polluters")
    2. Political spillovers (do industries now demand subsidies too?)
    3. Trust dynamics (does this build or erode government credibility?)
    4. Unintended behaviors (farmers take money but still burn)
    5. Inter-state tensions (does Punjab resent Delhi's demands?)

    Return:
    {{
      "emergent_effects": {{
        "media_sentiment": -5,  // Cynical coverage
        "industry_lobbying_intensity": +10,  // They want subsidies too
        "farmer_trust": +5,  // Appreciate gesture
        "punjab_delhi_tension": +3  // Mild resentment
      }},
      "narrative": "...",
      "risks": ["Industry lobby fears they're next", "Some farmers pocket money and still burn"]
    }}
    """

    llm_output = call_llm(prompt)

    return llm_output["emergent_effects"], llm_output["narrative"]
```

---

## Dynamic State Space (LLM Can Add Variables)

### Problem: Fixed State is Limiting

**Traditional approach**:
```python
state = {
    "aqi": 250,
    "budget": 800,
    "public_approval": 60
}
```

What if gameplay introduces:
- "Farmer revolt intensity"
- "Media scrutiny of government"
- "Inter-state political tension"
- "Industry confidence in regulations"

**Fixed state can't handle this.**

### Solution: Dynamic State Manager

```python
class DynamicStateManager:
    def __init__(self):
        self.base_variables = {
            "aqi": (0, 600),  # bounds
            "budget": (0, 10000),
            "public_approval": (0, 100)
        }

        self.dynamic_variables = {}  # LLM can add

    def add_variable(self, name, bounds, initial, update_rule):
        """
        LLM can introduce new state variable.

        Example:
            add_variable(
                "farmer_revolt_intensity",
                bounds=(0, 100),
                initial=20,
                update_rule=lambda s: s["farmer_revolt_intensity"] +
                    (5 if s["aqi"] > 300 else -2)
            )
        """

        # Constraints
        if len(self.dynamic_variables) >= 20:
            raise Exception("Too many dynamic variables")

        if name in self.base_variables:
            raise Exception("Cannot override base variable")

        self.dynamic_variables[name] = {
            "bounds": bounds,
            "value": initial,
            "update_rule": update_rule
        }
```

### How LLM Adds Variables

**Scenario**: Players repeatedly ignore farmers. Tension builds.

**LLM Detects Pattern**:
```python
# After round 3, LLM notices:
observations = {
    "farmer_actions_rejected": 3,
    "subsidies_blocked": 2,
    "burning_unchanged": True
}

# LLM proposes:
new_variable = {
    "name": "farmer_political_organization",
    "bounds": (0, 100),
    "initial": 40,
    "description": "Farmers organizing protests and political pressure",
    "update_rule": lambda s:
        s["farmer_political_organization"] +
        (10 if s["subsidy_blocked"] else -5)
}
```

**Effects**:
- New variable appears in game state
- Starts at 40, evolves each round
- If reaches 80: triggers "Farmer Protest Event"
- Math model can now use this variable in effect calculations

---

## Example: Complete Player Turn

### Player Input (Free-Form)

"I want to launch a comprehensive campaign: subsidize Happy Seeder machines at 75% coverage, send inspectors to monitor compliance, and run a public awareness campaign showing health impacts of burning"

### LLM Translation

```python
actions = [
    FormalAction(
        primitive=SUBSIDIZE,
        parameters={
            "magnitude": 0.75,
            "target": "farmers",
            "cost": 300,
            "duration": 2
        },
        narrative="75% subsidy for Happy Seeder machinery"
    ),
    FormalAction(
        primitive=MONITOR,
        parameters={
            "magnitude": 0.6,
            "target": "farmers",
            "cost": 50
        },
        narrative="Satellite + ground monitoring of farm fires"
    ),
    FormalAction(
        primitive=PUBLICIZE,
        parameters={
            "magnitude": 0.7,
            "target": "all",
            "cost": 20
        },
        narrative="Health awareness campaign on PM2.5 dangers"
    )
]

total_cost = 370  # Within budget of 400
```

### Math Model Execution

```python
# Action 1: SUBSIDIZE
subsidize_delta = {
    "aqi_delta": -45,  # 75% subsidy × elasticity
    "farmers_compliance": 0.65,  # Up from 0.3
    "budget_delta": -300
}

# Action 2: MONITOR
monitor_delta = {
    "enforcement_capacity": 0.75,  # Up from 0.5
    "farmers_compliance": +0.1,  # Synergy with subsidy
    "budget_delta": -50
}

# Action 3: PUBLICIZE
publicize_delta = {
    "public_alarm": +15,  # People more aware
    "public_approval": +5,  # Appreciate action
    "farmers_compliance": +0.05,  # Social pressure
    "budget_delta": -20
}

# Combined (with synergies)
total_delta = {
    "aqi_delta": -52,  # Better than sum (synergy!)
    "farmers_compliance": 0.80,
    "budget_delta": -370,
    "public_approval_delta": +8
}
```

### LLM Emergent Effects

```python
llm_effects = {
    "media_attention": +25,
    "farmer_trust": +15,
    "industry_anxiety": +10,  # "Are we next?"
    "opposition_criticism": +5  # "Why subsidize polluters?"
}

narrative = """
The government unveiled a three-pronged strategy to tackle stubble burning:

**₹300 crore subsidy program** covering 75% of Happy Seeder costs reached 12,000 farmers across Punjab and Haryana within two weeks. Farmer cooperatives welcomed the move, with adoption rates exceeding expectations in Ludhiana and Karnal districts.

**Satellite monitoring** combined with ground inspections created real-time tracking of farm fires. Farmers received SMS alerts when burning detected, with first-time offenders given warnings rather than fines.

**Public health campaign** saturated TV and social media with stark images of children on ventilators and AQI maps. Delhi hospitals reported surge in mask sales and air purifier demand.

"This is the kind of comprehensive approach we've been demanding," said Dr. Sharma, environmental activist. But opposition leaders questioned "using taxpayer money to reward polluters," setting up political tensions ahead of elections.

**Early indications**: Satellite imagery shows 40% reduction in farm fire hotspots compared to last year. AQI forecasts predict drop to 200 by month-end if trend holds.
```

### Final State Update

```python
new_state = {
    "aqi": 198,  # Down from 250
    "farmers_compliance": 0.80,  # Up from 0.30
    "budget": 430,  # Down from 800
    "public_approval": 68,  # Up from 60
    "public_alarm": 65,  # Up from 50 (aware of crisis)

    # Dynamic variables (LLM-added)
    "media_attention": 65,  # High coverage
    "farmer_trust": 60,  # Moderately trusting
    "industry_anxiety": 35,  # Worried about regulations
    "opposition_criticism": 25  # Political attacks
}
```

---

## Advantages of This Architecture

### 1. Mathematical Tractability
- ✅ Core effects use parametric functions (fast, reproducible)
- ✅ Small set of primitives (12) keeps math manageable
- ✅ Validation prevents impossible states
- ✅ Deterministic base + stochastic layer = controllable variance

### 2. Creative Freedom
- ✅ Players can describe actions in natural language
- ✅ Compositions create exponential variety (1000s of actions)
- ✅ LLM can introduce novel effects and state variables
- ✅ Narratives make each playthrough unique

### 3. Player Agency
- ✅ "Illusion of control": Players feel their specific wording matters
- ✅ Real control: Parameters derived from their descriptions
- ✅ Transparency: Can see what action maps to ("SUBSIDIZE at 75%")
- ✅ Feedback: If infeasible, suggestions for alternatives

### 4. Adaptive Complexity
- ✅ Simple actions: Just use parametric effects (fast, predictable)
- ✅ Complex actions: Add LLM effects (richer, emergent)
- ✅ Dynamic state grows as needed (not preallocated)
- ✅ Difficulty adapts via LLM parameter tuning

---

## Implementation Priorities

### Phase 1: Core System (2 weeks)
1. ✅ Implement 12 action primitives
2. ✅ Build LLM translator
3. ✅ Create parametric effect functions
4. ✅ Validation layer

### Phase 2: LLM Integration (1 week)
5. ✅ Emergent effects computation
6. ✅ Narrative generation
7. ✅ Dynamic state manager

### Phase 3: Testing & Tuning (2 weeks)
8. Test translation accuracy (does LLM map correctly?)
9. Calibrate effect functions (do they match real data?)
10. Balance action costs (prevent dominant strategies)
11. Playtest with real users

---

## Evaluation: Does It Work?

### Metrics to Track

**Translation Quality:**
- % of natural language inputs successfully mapped
- % of players satisfied with translation
- Avg time for LLM to translate (<2 seconds)

**Mathematical Validity:**
- % of actions that violate constraints
- Distribution of action costs (balanced?)
- Correlation between intended and actual effects

**Player Experience:**
- Agency rating (1-5): "Did your custom actions feel meaningful?"
- Creativity rating: "Could you express novel strategies?"
- Transparency rating: "Did you understand what your action would do?"

**Emergent Behavior:**
- # of dynamic state variables introduced per game
- Diversity of action compositions used
- Narrative coherence (human rating)

---

## Conclusion

This architecture solves the "bounded vs unbounded" action space problem by:

1. **Compositional Grammar**: Small primitives combine to create rich variety
2. **LLM Translator**: Maps free-form to formal (with validation)
3. **Hybrid Executor**: Math for tractability + LLM for emergence
4. **Dynamic State**: Can grow as gameplay introduces complexity

**Result**: Players get open-ended creativity, math model gets bounded tractability, game gets engaging emergence.

**Next Step**: Implement and playtest!
