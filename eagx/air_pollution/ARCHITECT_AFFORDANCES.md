# Architect Affordances: What Game Masters Should Control

## Philosophy

**Principle**: Give GMs control over **strategic decisions** (what matters), automate **tactical details** (how it works).

```
High Abstraction (GM controls)
    ↓
Medium Abstraction (GM can override defaults)
    ↓
Low Abstraction (Auto-generated, GM shouldn't touch)
```

---

## Tier 1: GM MUST Control (Core Scenario Decisions)

### 1. Scenario Framing

**What**: The narrative context and learning goals

**GM Specifies**:
- Scenario name and description
- Target audience (students, policymakers, general public)
- Learning objectives (what should players learn?)
- Historical or hypothetical setting

**Example**:
```yaml
name: "October Crisis 2024"
description: "Navigate Delhi's worst air pollution season in a decade"
audience: "Policy students with environmental background"
learning_goals:
  - "Understand coordination failures across jurisdictions"
  - "Experience trade-offs between economic and health goals"
```

**Why GM Controls**: Only GM knows pedagogical intent.

---

### 2. Stakeholder Roles

**What**: Who plays, what they care about

**GM Specifies**:
- Which roles exist (select templates or create custom)
- Public objectives (visible to all)
- Hidden objectives (secret win conditions)
- Initial resources

**Example**:
```yaml
roles:
  - name: "Delhi Chief Minister"
    public_objective: "Keep AQI below 300 throughout season"
    hidden_objective: "Maintain public approval >60% while spending <₹600cr"
    initial_resources:
      budget: 800  # ₹ crores
      political_capital: 100

  - name: "Punjab Farmer Representative"
    public_objective: "Protect farmer livelihoods"
    hidden_objective: "Ensure >70% of farmers can plant wheat on time"
```

**Why GM Controls**: Roles define the game's tensions.

---

### 3. Initial Conditions

**What**: Starting state of the world

**GM Specifies**:
- Key state variables (AQI, budget, approval, etc.)
- Initial values
- "Crisis level" (how bad is it at start?)

**Example**:
```yaml
initial_state:
  aqi: 150  # Unhealthy
  pm25: 80
  budget_delhi: 800
  budget_central: 500
  public_approval: 65
  farmers_compliance: 0.30  # Only 30% using alternatives
  season: "pre_diwali"
```

**Why GM Controls**: Sets difficulty and narrative tone.

---

### 4. Win/Lose Conditions

**What**: How do players succeed or fail?

**GM Specifies**:
- Public win condition (shared goal)
- Hidden win conditions (per role)
- Failure conditions (game over triggers)

**Example**:
```yaml
win_conditions:
  public:
    - aqi_average < 250  # Keep average AQI reasonable
    - rounds_completed: 5  # Survive all 5 rounds

  hidden:
    chief_minister:
      - public_approval > 60
      - budget_spent < 600

    farmer_rep:
      - farmers_income_loss < 20%  # Minimize farmer losses

failure_conditions:
  - aqi > 500  # Severe crisis, game over
  - budget < 0  # Bankrupt
  - public_approval < 30  # Lose legitimacy
```

**Why GM Controls**: Defines what "winning" means educationally.

---

### 5. Major Events

**What**: Key plot points that shape the narrative

**GM Specifies**:
- Scheduled events (happen at specific rounds)
- Conditional events (triggered by state)
- Event consequences

**Example**:
```yaml
events:
  - name: "Diwali Firecracker Spike"
    trigger:
      type: "scheduled"
      round: 3
    effects:
      aqi: +100
      public_alarm: +20
    narrative: "Despite bans, firecrackers lit across Delhi..."

  - name: "Supreme Court Hearing"
    trigger:
      type: "conditional"
      condition: "aqi > 400 for 2 consecutive rounds"
    effects:
      public_alarm: +30
      government_accountability: +50
    narrative: "Supreme Court summons Delhi and Central governments..."
```

**Why GM Controls**: Events drive dramatic tension and learning moments.

---

## Tier 2: GM CAN Control (Fine-Tuning)

### 6. Model Parameters

**What**: Calibration of mathematical relationships

**GM Can Specify** (or use defaults from literature):
- Subsidy effectiveness (% reduction per ₹ spent)
- Enforcement compliance rates
- Weather impact factors
- Public alarm sensitivity

**Example**:
```yaml
parameters:
  subsidy_effectiveness: 0.60  # 60% reduction at full coverage
  enforcement_baseline: 0.50   # 50% compliance without monitoring
  public_alarm_sensitivity: 0.75  # How quickly public reacts to AQI

  # Sector contributions (from SAFAR data)
  emission_shares:
    vehicles: 0.28
    industry: 0.20
    construction: 0.17
    stubble_burning: 0.26  # Seasonal
    residential: 0.09
```

**Default Behavior**: If GM doesn't specify, use calibrated values from literature.

**Why GM Can Control**: Domain experts may have better local estimates.

---

### 7. Action Availability

**What**: Which actions are available to which roles

**GM Can Specify**:
- Which action primitives each role can use
- Cost ranges for actions
- Effectiveness ranges

**Example**:
```yaml
action_restrictions:
  Delhi_CM:
    can_use: [SUBSIDIZE, BAN, MONITOR, PUBLICIZE]
    cannot_use: [NEGOTIATE_INTERSTATE]  # No authority outside Delhi
    budget_limit: 800

  Central_Env_Minister:
    can_use: [SUBSIDIZE, NEGOTIATE, MANDATE]
    cannot_use: [BAN]  # Cannot unilaterally ban without state approval
    budget_limit: 500
```

**Default Behavior**: Roles get standard action sets based on real-world authority.

**Why GM Can Control**: Scenario-specific constraints (e.g., "What if Delhi had more autonomy?").

---

### 8. Difficulty Knobs

**What**: Make scenario easier/harder

**GM Can Adjust**:
- Budget amounts (more = easier)
- Action costs (lower = easier)
- Event severity (less = easier)
- Time pressure (more rounds = easier)

**Example**:
```yaml
difficulty_settings:
  level: "medium"

  knobs:
    budget_multiplier: 1.0  # 1.0 = normal, 1.5 = 50% more budget
    action_effectiveness_multiplier: 1.0  # 1.2 = actions 20% more effective
    event_severity_multiplier: 1.0  # 0.8 = events 20% less severe
    time_per_round_minutes: 8
```

**Default Behavior**: "Medium" difficulty balanced for typical players.

**Why GM Can Control**: Adjust for audience skill level.

---

## Tier 3: GM SHOULD NOT Control (Auto-Generated)

### 9. Low-Level Math

**What**: Detailed effect calculations

**Auto-Generated**:
- Emission dispersion coefficients
- AQI calculation formulas
- Health burden exposure-response curves
- Compliance decay rates

**Why Locked**: These must be scientifically accurate. GMs without technical background might break the model.

**GM Override**: Only via "advanced mode" with warnings.

---

### 10. Narrative Details

**What**: Specific story beats, character names, dialogue

**Auto-Generated by LLM**:
- Round introductions
- Consequence narratives
- Stakeholder quotes
- Media headlines

**Why Locked**: LLM generates these contextually based on game state. GM provides high-level tone, LLM fills details.

**GM Influence**: GM can specify:
- Narrative tone (serious, dramatic, hopeful)
- Named locations (prefer specific Delhi neighborhoods)
- Cultural references (Diwali, crop cycles, local politics)

---

### 11. Dynamic State Variables

**What**: New state variables that emerge during gameplay

**Auto-Generated by LLM**:
- Example: "Farmer revolt intensity" appears if farmers ignored for 3 rounds
- Example: "Media scrutiny" appears after controversial action

**Why Locked**: These emerge naturally from gameplay. Pre-specifying them reduces emergent complexity.

**GM Override**: Can disable dynamic state growth if they want fixed state space.

---

### 12. Action Synergies

**What**: How actions combine (e.g., subsidy + enforcement = 1.3x effect)

**Auto-Generated**:
- Detected by effect functions
- Based on game theory and behavioral economics

**Why Locked**: Complex interactions are hard to manually specify. Math model computes these.

---

## Summary: GM Control Matrix

| Element | GM Must Control | GM Can Control | Auto-Generated |
|---------|----------------|----------------|----------------|
| **Scenario framing** | ✅ | | |
| **Stakeholder roles** | ✅ | | |
| **Initial conditions** | ✅ | | |
| **Win/lose conditions** | ✅ | | |
| **Major events** | ✅ | | |
| **Model parameters** | | ✅ | Defaults |
| **Action availability** | | ✅ | Defaults |
| **Difficulty knobs** | | ✅ | Defaults |
| **Low-level math** | | ⚠️ Advanced | ✅ |
| **Narrative details** | | Tone only | ✅ |
| **Dynamic states** | | Enable/disable | ✅ |
| **Action synergies** | | | ✅ |

---

## GM Interface Levels

### Level 1: Wizard (Guided)
**For**: Non-technical GMs
**Exposes**: Tier 1 only (must control)
**Abstracts**: Everything else auto-generated

**Flow**:
1. Upload documents
2. Answer 10 questions (roles, objectives, events)
3. Set difficulty (easy/medium/hard)
4. Done! Scenario generated.

---

### Level 2: Designer (Balanced)
**For**: GMs with some technical background
**Exposes**: Tier 1 + Tier 2 (can fine-tune)
**Abstracts**: Tier 3 (math, narratives)

**Flow**:
1. Upload documents
2. Configure roles, events, conditions (detailed)
3. Optionally adjust parameters (subsidy effectiveness, etc.)
4. Preview & validate
5. Done!

---

### Level 3: Advanced (Full Control)
**For**: Technical GMs (game designers, researchers)
**Exposes**: All tiers (can override everything)
**Warnings**: "Changing this may break calibration"

**Flow**:
1. Upload documents OR write JSON directly
2. Full access to all parameters
3. Can modify effect functions (Python code)
4. Extensive validation and simulation
5. Deploy

---

## Design Rationale

### Why This Split?

**GM Strengths**:
- Domain knowledge (know what matters in air pollution)
- Pedagogical intent (know what players should learn)
- Scenario creativity (can imagine novel situations)

**System Strengths**:
- Mathematical accuracy (compute effects correctly)
- Narrative generation (produce coherent stories)
- Balance detection (spot unwinnable scenarios)

**Result**: GM focuses on high-level strategy, system handles low-level tactics.

---

## Validation Questions

After GM configures, system checks:

1. ✅ **Can this scenario be won?** (Simulate with optimal play)
2. ✅ **Can this scenario be lost?** (Simulate with no action)
3. ✅ **Are roles balanced?** (All have ~40-60% win rate in simulations)
4. ✅ **Do events make sense?** (Triggers are reachable, effects are plausible)
5. ✅ **Is narrative coherent?** (LLM check: do objectives contradict?)
6. ✅ **Are parameters calibrated?** (Within known ranges from literature)

If any fail, system suggests fixes:
```
⚠️ Balance Issue: "Farmer" role wins 0% in simulations.

Problem: Hidden objective "No subsidies given" is too hard
given that AQI can only be controlled with subsidies.

Suggested Fix: Change to "Subsidies <₹300cr" (allows some flexibility)

[Accept Suggestion] [Ignore] [Manually Edit]
```

---

## Future: Adaptive Affordances

**Idea**: System learns which controls GMs actually use.

If 90% of GMs never touch "enforcement_baseline" parameter:
→ Hide it in default view
→ Add tooltip: "Rarely changed, using calibrated default"

If GMs frequently struggle with "event triggers":
→ Add wizard: "Tell me when you want this event, I'll write the condition"

**Result**: Interface adapts to actual GM needs over time.
