# Architect Mode: Game Master Scenario Creation Workflow

## Overview

**Architect Mode** is the interface for Game Masters (GMs) to create custom TTX scenarios from domain knowledge (PDFs, presentations, expert knowledge) without writing code.

```
Game Engine Designers (us)
    ↓ Build tools
Game Masters (policy experts)
    ↓ Create scenarios
Players (participants)
```

---

## The Core Problem

**Scenario**: A policy researcher has:
- 5 PDFs on Delhi air pollution (SAFAR reports, IIT Delhi studies)
- A PowerPoint deck from a workshop
- Personal notes from field visits
- Domain expertise in environmental policy

**They want to**: Create a custom TTX where players navigate Oct-Nov 2024 pollution crisis with specific stakeholders (farmers, industry, activists).

**Challenges**:
1. How to go from PDFs → structured game definition?
2. What parameters should GM control vs auto-generated?
3. How to balance fidelity (realistic) vs playability (engaging)?
4. How to validate scenario before players see it?

---

## Three-Phase Workflow

### Phase 1: **Ingestion** (Domain Knowledge → Structured Data)

```
PDFs, Presentations, Notes
    ↓
LLM Extraction
    ↓
Scenario Building Blocks
```

### Phase 2: **Compilation** (Structured Data → Game Definition)

```
Scenario Building Blocks
    ↓
GM-Guided Configuration
    ↓
Executable Scenario File
```

### Phase 3: **Validation** (Test Before Deploy)

```
Executable Scenario
    ↓
Simulation + AI Playtesting
    ↓
Refined Scenario
```

---

## Phase 1: Ingestion (Domain Knowledge → Structured)

### What the GM Provides

**Input Types**:
1. **Documents**: PDFs, Word docs, PowerPoint
2. **Data**: CSV files (AQI time series, emission inventories)
3. **Structured knowledge**: JSON/YAML (if technical)
4. **Natural language**: Text descriptions, interview transcripts

**Example GM Input**:
```
Files uploaded:
- SAFAR_Delhi_Emission_Inventory_2023.pdf
- IIT_Delhi_Stubble_Burning_Study.pdf
- Workshop_Notes_October_Crisis.docx

Text prompt:
"I want to create a scenario about the October 2024 crisis.
Key stakeholders: farmers (Punjab, Haryana), Delhi government,
central government, industry association, health activists.

Main tension: Farmers need to burn to clear fields before wheat
planting, but Delhi faces severe AQI spike. Government can subsidize
alternatives but budget is limited. Industry is also contributing
but gets less attention.

I have data on typical emission levels, subsidy effectiveness from
past programs, and political constraints."
```

### LLM Extraction Process

**Step 1: Document Parsing**
- Extract key facts, numbers, relationships
- Identify stakeholders, resources, constraints
- Map to scenario schema

**Output Example**:
```json
{
  "stakeholders": [
    {
      "name": "Punjab Farmers",
      "description": "5 million acres to clear before Nov 15",
      "constraints": ["Cost: ₹1500/acre for Happy Seeder", "Time pressure"],
      "objectives": ["Clear fields", "Plant wheat on time", "Minimize costs"]
    },
    {
      "name": "Delhi Chief Minister",
      "description": "Elected official, up for re-election in 18 months",
      "constraints": ["Budget: ₹800 crores", "Public pressure"],
      "objectives": ["Keep AQI <300", "Maintain approval >60%"]
    }
  ],

  "resources": [
    {"name": "Delhi Budget", "initial": 800, "unit": "₹ crores"},
    {"name": "Central Subsidy Fund", "initial": 500, "unit": "₹ crores"}
  ],

  "key_parameters": {
    "stubble_burning_baseline": "3000 tons/day PM2.5 (Oct-Nov)",
    "subsidy_effectiveness": "60% reduction at 75% subsidy coverage",
    "vehicle_contribution": "28% of total emissions",
    "industry_contribution": "20% of total emissions"
  },

  "events": [
    {
      "trigger": "AQI > 400",
      "name": "GRAP Stage 4 Activation",
      "consequences": ["Schools close", "Construction halts", "Public alarm +30"]
    },
    {
      "trigger": "Round 3",
      "name": "Diwali Firecracker Spike",
      "consequences": ["AQI +100", "Media coverage +50"]
    }
  ]
}
```

**Step 2: Gap Filling**
- LLM identifies missing parameters
- Asks GM for clarification or uses defaults
- Suggests ranges based on literature

**GM Interaction**:
```
LLM: "I found farmer subsidy effectiveness of 60% in the IIT Delhi
study, but no data on enforcement compliance rates. Options:

1. Use default from literature (50-70%)
2. Let me infer from context
3. You specify manually

What would you like?"

GM: "Use 60% as baseline, but I want to make enforcement strength
a variable that government can increase."

LLM: "Got it. Added 'enforcement_capacity' as state variable
(default: 0.5, range: 0-1). Government actions can modify this."
```

---

## Phase 2: Compilation (Structured → Executable)

### GM Configuration Interface

**Parameters GM Controls** (see ARCHITECT_AFFORDANCES.md for full list):

**1. Scenario Metadata**
- Name, description, target audience
- Duration (rounds), time per round
- Difficulty level

**2. Stakeholders**
- Which roles exist (select from templates or create custom)
- Public vs hidden objectives
- Initial resources, constraints

**3. State Space**
- Which variables matter (AQI, budget, approval, etc.)
- Initial values, bounds
- Dynamic variables (can emerge during play?)

**4. Action Space**
- Which action primitives available
- Costs, effectiveness ranges
- Role-specific restrictions

**5. Events & Triggers**
- Conditional events (if AQI > X, trigger Y)
- Scheduled events (Round 3: Diwali)
- Random events (weather, political surprises)

**6. Win Conditions**
- Public goal (AQI <200 by end)
- Hidden goals (role-specific)
- Failure conditions (AQI >500, budget negative)

**7. Narrative Style**
- Tone (serious, dramatic, educational)
- Level of detail (technical vs accessible)
- Regional flavor (Delhi-specific references)

### Compilation Process

**Input**: Structured scenario data + GM configuration

**Output**: Executable scenario file

```python
# Example: compiled scenario
scenario = DelhiPollutionScenario(
    metadata={
        "name": "October Crisis 2024",
        "author": "Dr. Sharma",
        "difficulty": "medium",
        "rounds": 5
    },

    initial_state={
        "aqi": 150,
        "pm25": 80,
        "budget": 800,
        "public_approval": 65,
        "farmers_compliance": 0.3,
        "enforcement_capacity": 0.5
    },

    stakeholders=[
        Stakeholder(
            role="Delhi Chief Minister",
            public_objective="Keep AQI below 300",
            hidden_objective="Maintain approval >60%, spend <₹600cr",
            action_restrictions=["Cannot force Punjab actions", "Controls Delhi budget"]
        ),
        # ... more stakeholders
    ],

    events=[
        ConditionalEvent(
            trigger="aqi > 400",
            name="Health Emergency",
            effects={"public_alarm": +30, "hospitalizations": +500}
        ),
        # ... more events
    ],

    model_parameters={
        "stubble_burning_base": 3000,
        "subsidy_effectiveness": 0.6,
        "enforcement_factor": 0.8
    }
)
```

### GM Sees Preview

Before finalizing, GM gets:
1. **Scenario summary** (auto-generated)
2. **Expected difficulty** (based on constraints)
3. **Estimated playtime**
4. **Balance warnings** (if any role has no viable path to win)

---

## Phase 3: Validation (Test Before Deploy)

### Automated Checks

**1. Consistency Checks**
- Do win conditions contradict? (Can't have AQI <100 AND budget >₹1000 if all actions cost money)
- Are initial values within bounds?
- Do events make sense? (Can't trigger "rain" in May in Delhi)

**2. Balance Checks**
- Can scenario be won? (Simulate with optimal play)
- Can scenario be lost? (Simulate with no action)
- Is there a dominant strategy? (Always subsidy = win)

**3. Playability Checks**
- Are rounds too short/long?
- Do players have meaningful choices each round?
- Does narrative match game state?

### AI Playtesting

**Run 10 simulated games with AI agents**:
- Agents follow different strategies (cooperative, selfish, random)
- Measure: Win rate, engagement signals, balance

**Report to GM**:
```
Simulation Results (10 games):
- Win rate: 60% (good, not too easy/hard)
- Avg final AQI: 220 (within reasonable range)
- Dominant strategy detected: None (good, variety of strategies work)
- Balance issue: "Farmer" role won 0% (hidden objective too hard)

Suggestion: Relax farmer hidden objective from "No subsidies"
to "Subsidies <₹300cr"
```

### GM Iteration

GM can:
1. **Tweak parameters** (increase budget, adjust event triggers)
2. **Add/remove events**
3. **Rebalance objectives**
4. **Re-run validation**

---

## Example: Complete Workflow

### Step 1: GM Uploads Documents

**Files**:
- `SAFAR_2023_Report.pdf` (40 pages, emission inventory)
- `Farmer_Survey_Results.xlsx` (5000 responses on subsidy preferences)
- `Workshop_Notes.docx` (10 pages, stakeholder discussions)

**LLM Extraction** (2 minutes):
- Parses PDFs, extracts tables
- Identifies: 6 stakeholders, 12 parameters, 8 potential events
- Creates draft scenario structure

### Step 2: GM Reviews & Configures

**GM sees**:
```
Extracted Scenario: "Delhi Stubble Burning Crisis"

Stakeholders: ✅ 6 identified
Parameters: ✅ 12 calibrated from documents
Events: ⚠️ 8 proposed, please review

Click to configure:
- Initial conditions (AQI, budget, etc.)
- Win conditions (how to succeed?)
- Event triggers (when do crises happen?)
- Difficulty knobs (make easier/harder)
```

**GM adjusts**:
- Sets initial AQI to 150 (typical Oct level)
- Adds hidden objective for Farmer: "Ensure >70% of farmers can plant on time"
- Enables dynamic variable: "Farmer trust in government"
- Sets difficulty: Medium (balanced constraints)

### Step 3: Validation & Refinement

**Automated validation**:
```
✅ Consistency: All constraints satisfied
✅ Balance: Win rate 55% in simulations
⚠️ Playability: Round 4 has limited choices (most budget spent)

Suggestion: Add "Emergency fund release" event in Round 4
```

**GM accepts suggestion**, re-validates

**Final validation**:
```
✅ All checks passed
✅ Ready for deployment

Scenario file generated: delhi_october_2024.json (2.3 MB)
Can be loaded in game engine
```

### Step 4: Deployment

GM loads scenario into game engine. Players see:
- Scenario name, description
- Their role assignment
- Initial briefing
- Ready to play!

---

## GM Affordances Matrix

See `ARCHITECT_AFFORDANCES.md` for detailed breakdown of:
- **What GMs SHOULD control** (high-level decisions)
- **What GMs CAN control** (if they want detail)
- **What GMs SHOULD NOT control** (auto-generated for consistency)

---

## Technical Requirements

### For Game Engine Designers (Us)

**Build**:
1. Document ingestion pipeline (LLM + parsers)
2. Scenario compiler (structured data → executable)
3. Validation suite (consistency, balance, playability checks)
4. AI playtesting framework (simulate games with bots)
5. GM interface (web UI or API)

### For Game Masters

**Requires**:
- Domain knowledge (can be documents or personal expertise)
- 1-2 hours to create first scenario
- 30 min to refine after validation
- No coding required

---

## Success Criteria

**A good Architect Mode enables GMs to**:
1. ✅ Create scenarios from domain knowledge (PDFs → game) in <2 hours
2. ✅ Validate scenarios work before players see them
3. ✅ Iterate quickly (adjust parameters, re-validate)
4. ✅ Share scenarios (JSON file, load in engine)
5. ✅ Maintain scientific rigor (parameters grounded in data)

---

## Next Steps

1. **Prototype Document Ingestion** (LLM extraction from PDFs)
2. **Define Scenario Schema** (JSON format for executable scenarios)
3. **Build Validation Suite** (automated checks)
4. **Create GM Interface** (start with CLI, then web UI)

See:
- `ARCHITECT_AFFORDANCES.md` - What controls to expose to GMs
- `GM_WORKFLOW_CASE_STUDY.md` - Detailed walkthrough example
- `SCENARIO_SCHEMA.md` - Technical spec for scenario files
