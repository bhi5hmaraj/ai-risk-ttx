# Data Structure Documentation

All AI2027 state machine data is separated from code for easy maintenance.

## Directory Structure

```
src/
├── data/                      # All state machine data (JSON)
│   ├── states.json            # State definitions
│   ├── initial_state.json     # Starting global state values
│   └── transitions.json       # Transition definitions
├── utils/
│   └── effectsParser.js       # Parse and execute effects/conditions from data
└── model.js                   # Logic layer (loads data, provides functions)
```

## Data Files

### `states.json`

Defines all states in the state machine.

**Format:**
```json
{
  "state_id": {
    "id": "state_id",
    "name": "Display Name",
    "description": "Human-readable description",
    "time": "When this state occurs (e.g., '2025-2026')",
    "probability": 0.7,
    "isStartState": false,
    "isEndState": false,
    "outcomeType": "catastrophic | success (only for end states)"
  }
}
```

**Example:**
```json
{
  "gpt5_level": {
    "id": "gpt5_level",
    "name": "GPT-5 Level (~College Graduate)",
    "description": "Models can do most knowledge work at graduate level",
    "time": "2025-2026",
    "probability": 0.7,
    "isStartState": false,
    "isEndState": false
  }
}
```

### `initial_state.json`

Defines starting values for all global state variables.

**Format:**
```json
{
  "compute_flop": 1e25,
  "algorithmic_efficiency": 1.0,
  "capability_level": "GPT-4 level (~smart high schooler)",
  "us_china_relations": 0.5,
  "race_pressure": 0.0,
  "espionage_risk": 0.5,
  "alignment_investment": 0.5,
  "safety_margin": 0.7,
  "simDays": 0,
  "simDate": "2024-10-01"
}
```

**Variable Types:**
- **Numeric**: `compute_flop`, `algorithmic_efficiency` (can use scientific notation like `1e25`)
- **Normalized (0-1)**: `us_china_relations`, `race_pressure`, `espionage_risk`, `alignment_investment`, `safety_margin`
- **String**: `capability_level`
- **Time**: `simDays` (number), `simDate` (ISO date string, converted to Date object)

### `transitions.json`

Defines all state transitions with conditions and effects.

**Format:**
```json
[
  {
    "id": "transition_id",
    "from": "source_state_id",
    "to": "target_state_id",
    "trigger": "Human-readable trigger description",
    "mechanism": "How the transition happens",
    "type": "automatic | probabilistic | choice",

    "timeRequired": 180,
    "baseProbability": 0.4,

    "epistemicConfidence": 0.60,
    "contested": false,
    "citation": "Source from AI2027 research",

    "conditionCode": "JavaScript expression returning boolean",
    "effectsCode": "var1: expression; var2: expression"
  }
]
```

**Transition Types:**

1. **Automatic** - Triggered when conditions met
   ```json
   {
     "type": "automatic",
     "timeRequired": 180,
     "conditionCode": "globalState.compute_flop >= 1e26",
     "effectsCode": "compute_flop: globalState.compute_flop * 3.4"
   }
   ```

2. **Probabilistic** - User rolls dice, happens with base probability
   ```json
   {
     "type": "probabilistic",
     "baseProbability": 0.65,
     "conditionCode": "globalState.capability_level !== 'GPT-4 level'",
     "effectsCode": "race_pressure: Math.min(1.0, globalState.race_pressure + 0.3)"
   }
   ```

3. **Choice** - User makes decision between options
   ```json
   {
     "type": "choice",
     "choices": [
       {
         "id": "choice_id",
         "label": "Button label",
         "description": "Explanation",
         "probability": 0.15,
         "timeRequired": 120,
         "targetState": "optional_override_state",
         "effectsCode": "capability_level: 'AGI'; alignment_investment: globalState.alignment_investment * 0.8",
         "outcomes": [
           {
             "id": "outcome_id",
             "probability": 0.3,
             "description": "What happens",
             "targetState": "success_state",
             "effectsCode": "safety_margin: 1.0"
           }
         ]
       }
     ]
   }
   ```

## Code Expression Language

Both `conditionCode` and `effectsCode` use simple JavaScript expressions.

### Condition Code

**Available context:**
- `globalState` - Current global state object
- `Math` - JavaScript Math object

**Format:** Single JavaScript expression returning boolean
```javascript
"globalState.compute_flop >= 1e26"
"globalState.safety_margin > 0.7 && globalState.alignment_investment > 0.8"
"globalState.us_china_relations > 0.6"
```

### Effects Code

**Available context:**
- `globalState` - Current global state object
- `Math` - JavaScript Math object

**Format:** Semicolon-separated assignments
```javascript
"compute_flop: globalState.compute_flop * 3.4; capability_level: 'GPT-5 level'"
"race_pressure: Math.min(1.0, globalState.race_pressure + 0.3)"
"safety_margin: 0"
```

**Each assignment:**
- Format: `variableName: expression`
- Expression can reference `globalState.variableName` and use `Math.*`
- Results are merged into global state

## Epistemic Confidence

All transitions include `epistemicConfidence` from -1 to 1:
- `> 0.6`: Strong evidence (green)
- `0.3 - 0.6`: Moderate evidence (orange)
- `0 - 0.3`: Weak evidence (red)
- `< 0`: Contested by researchers (dark red)

This directly reflects the DAG analysis epistemic scores.

## Adding New Content

### Add a New State

1. Edit `src/data/states.json`
2. Add new entry with unique `id`
3. Set all required fields

### Add a New Transition

1. Edit `src/data/transitions.json`
2. Add new entry with:
   - Unique `id`
   - Valid `from` and `to` state IDs
   - Appropriate `type`
   - Condition and effects code
   - Citation to AI2027 source

### Add a New Global Variable

1. Edit `src/data/initial_state.json` - add initial value
2. Update `src/components/GlobalStateDisplay.jsx` - add visualization
3. Use in condition/effects code as `globalState.variableName`

## Examples

### Example 1: Simple Automatic Transition

```json
{
  "id": "compute_scaling",
  "from": "current_2024",
  "to": "gpt5_level",
  "trigger": "Continued investment in larger training runs",
  "mechanism": "Exponential scaling: compute doubles every 6 months",
  "type": "automatic",
  "timeRequired": 180,
  "epistemicConfidence": 0.60,
  "citation": "AI2027 Compute Forecast",
  "conditionCode": "globalState.compute_flop >= 1e26",
  "effectsCode": "compute_flop: globalState.compute_flop * 3.4; capability_level: 'GPT-5 level'"
}
```

### Example 2: Probabilistic Transition

```json
{
  "id": "espionage_begins",
  "from": "current_2024",
  "to": "race_dynamics",
  "trigger": "China recognizes strategic importance",
  "mechanism": "Full espionage apparatus targets US labs",
  "type": "probabilistic",
  "baseProbability": 0.65,
  "epistemicConfidence": 0.65,
  "citation": "AI2027 Security Forecast",
  "conditionCode": "globalState.capability_level !== 'GPT-4 level'",
  "effectsCode": "race_pressure: Math.min(1.0, globalState.race_pressure + 0.3); espionage_risk: 0.8"
}
```

### Example 3: Choice with Multiple Outcomes

```json
{
  "id": "to_foom",
  "from": "agi_2027",
  "to": "superintelligence",
  "trigger": "AGI systems recursively self-improve",
  "type": "choice",
  "epistemicConfidence": -0.10,
  "contested": true,
  "citation": "AI2027 Takeoff Forecast",
  "choices": [
    {
      "id": "attempt_foom",
      "label": "Attempt Recursive Self-Improvement",
      "description": "High-risk, high-reward",
      "probability": 0.2,
      "timeRequired": 60,
      "outcomes": [
        {
          "id": "foom_aligned",
          "probability": 0.3,
          "description": "ASI achieved, alignment holds",
          "targetState": "superintelligence",
          "effectsCode": "capability_level: 'ASI - Artificial Superintelligence'"
        },
        {
          "id": "foom_misaligned",
          "probability": 0.7,
          "description": "ASI achieved, but misaligned",
          "targetState": "extinction",
          "effectsCode": "capability_level: 'ASI - Misaligned'; safety_margin: 0"
        }
      ]
    }
  ]
}
```

## Validation

Before committing changes to data files:

1. **Valid JSON**: Run files through JSON linter
2. **State IDs**: All `from`/`to` references must exist in `states.json`
3. **Code expressions**: Test condition/effects code for syntax errors
4. **Citations**: All transitions should cite AI2027 source

## Migration from Old Model

The previous `model.js` had all data hardcoded. New structure:

**Old:**
```javascript
export const STATES = {
  CURRENT_2024: { id: 'current_2024', name: '...', ... }
}
```

**New:**
```javascript
import statesData from './data/states.json'
export const STATES = statesData
```

Benefits:
- Non-developers can edit data without touching code
- Clear separation of concerns
- Easy to generate data programmatically
- Version control shows exactly what changed
- Can validate data structure independently
