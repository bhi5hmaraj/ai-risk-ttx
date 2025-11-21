# Scenario Schema: Technical Specification

## Overview

This document defines the JSON schema for executable TTX scenarios. A scenario file contains everything needed to run a game session: stakeholders, parameters, events, and narratives.

---

## Top-Level Structure

```json
{
  "schema_version": "1.0",
  "metadata": { },
  "initial_state": { },
  "stakeholders": [ ],
  "events": [ ],
  "parameters": { },
  "win_conditions": { },
  "narrative_config": { },
  "validation_report": { }
}
```

---

## 1. Metadata

```json
"metadata": {
  "id": "october_crisis_2024",
  "name": "October Crisis 2024",
  "description": "Navigate Delhi's worst pollution season in a decade",
  "author": "Dr. Anjali Sharma",
  "created_at": "2025-01-15T10:30:00Z",
  "version": "1.2",

  "target_audience": "graduate_students",
  "difficulty": "medium",

  "learning_objectives": [
    "Understand multi-stakeholder coordination challenges",
    "Experience policy trade-offs between economy and environment"
  ],

  "duration": {
    "rounds": 5,
    "minutes_per_round": 8,
    "estimated_total_minutes": 75
  },

  "tags": ["air_pollution", "delhi", "coordination", "stubble_burning"],

  "source_documents": [
    "SAFAR_Delhi_Emission_Inventory_2023.pdf",
    "IIT_Delhi_Stubble_Burning_Study.pdf"
  ]
}
```

---

## 2. Initial State

```json
"initial_state": {
  // Environmental
  "aqi": 150,
  "pm25": 80,
  "pm10": 160,
  "season": "pre_diwali",

  // Economic
  "budget_delhi": 800,
  "budget_central": 500,

  // Social
  "public_approval": 65,
  "public_alarm": 40,

  // Behavioral
  "farmers_compliance": 0.30,
  "industry_compliance": 0.50,
  "enforcement_capacity": 0.50,

  // Temporal
  "round": 0,
  "current_date": "2024-10-15"
}
```

---

## 3. Stakeholders

```json
"stakeholders": [
  {
    "id": "delhi_cm",
    "name": "Delhi Chief Minister",
    "description": "Elected official managing Delhi government",

    "public_objective": {
      "short": "Keep AQI below 300",
      "detailed": "Maintain air quality below severe levels throughout pollution season"
    },

    "hidden_objective": {
      "condition": "public_approval > 60 AND major_actions_taken >= 3",
      "description": "Win re-election by maintaining approval while being decisive"
    },

    "initial_resources": {
      "budget": 800,
      "political_capital": 100
    },

    "constraints": [
      "Cannot force Punjab/Haryana actions",
      "Election in 18 months",
      "Supreme Court oversight"
    ],

    "action_permissions": {
      "allowed_primitives": ["SUBSIDIZE", "BAN", "MONITOR", "PUBLICIZE", "BUILD"],
      "forbidden_primitives": ["NEGOTIATE_INTERSTATE"],
      "budget_limit": 800,
      "geographic_scope": "delhi"
    },

    "ai_persona": {
      "strategy": "Balance public health and political survival",
      "risk_tolerance": "moderate",
      "priority_order": ["public_approval", "aqi", "budget"]
    }
  },

  {
    "id": "punjab_farmer",
    "name": "Punjab Farmer Representative",
    // ... similar structure
  }
  // ... 5 more stakeholders
]
```

---

## 4. Events

### Scheduled Event

```json
{
  "id": "diwali_spike",
  "name": "Diwali Firecracker Spike",
  "type": "scheduled",

  "trigger": {
    "round": 3
  },

  "effects": {
    "state_changes": {
      "aqi": "+100",
      "public_alarm": "+20",
      "media_attention": "+30"
    }
  },

  "narrative": {
    "template": "Despite bans, firecrackers lit across Delhi through the night. By morning, a thick, acrid haze blankets the city. Satellite imagery shows PM2.5 levels tripled in 12 hours.",
    "media_headline": "Delhi Chokes: AQI Hits {aqi} After Diwali",
    "stakeholder_quotes": [
      {
        "role": "activist",
        "quote": "Every year, the same story. When will we learn?"
      }
    ]
  },

  "flavor": {
    "severity": "high",
    "tone": "crisis",
    "visual_cue": "red alert"
  }
}
```

### Conditional Event

```json
{
  "id": "supreme_court_hearing",
  "name": "Supreme Court Summons Government",
  "type": "conditional",

  "trigger": {
    "condition": "(aqi > 400) AND (days_in_severe >= 2)",
    "earliest_round": 2
  },

  "effects": {
    "state_changes": {
      "government_accountability": "+50",
      "public_alarm": "+30",
      "political_pressure": "+40"
    },

    "forced_actions": [
      {
        "stakeholder": "delhi_cm",
        "must_select_from": ["BAN", "MANDATE", "BUILD"],
        "deadline_rounds": 1
      }
    ]
  },

  "narrative": {
    "template": "The Supreme Court issues notice to Delhi and Central governments demanding immediate action plan. 'The right to breathe clean air is a fundamental right,' the bench declares.",
    "legal_citation": "Based on SC judgment in MC Mehta vs Union of India (1998)"
  }
}
```

### Dynamic Event (LLM-Generated)

```json
{
  "id": "emergent_event_slot_1",
  "type": "dynamic",

  "generation_trigger": {
    "condition": "farmer_trust < 30 AND round >= 3",
    "llm_prompt": "Generate a farmer protest event. Context: Trust in government is low, subsidies haven't reached farmers, wheat planting deadline approaching. Create realistic protest with demands."
  },

  "effects": {
    "llm_computed": true,
    "state_change_bounds": {
      "public_alarm": [-10, +40],
      "government_pressure": [0, +60],
      "farmer_trust": [-20, +10]
    }
  }
}
```

---

## 5. Parameters

### Calibrated Model Parameters

```json
"parameters": {
  "emission_model": {
    "stubble_burning_baseline": {
      "value": 3000,
      "unit": "tons_pm25_per_day",
      "source": "SAFAR 2023, Table 4.2",
      "confidence": "high"
    },

    "sector_shares": {
      "vehicles": 0.28,
      "industry": 0.20,
      "construction": 0.17,
      "stubble_burning": 0.26,
      "residential": 0.09
    },
    "source": "SAFAR Delhi Emission Inventory 2023"
  },

  "behavioral_model": {
    "subsidy_elasticity": {
      "value": -0.60,
      "description": "60% reduction in burning at 75% subsidy coverage",
      "source": "IIT Delhi Stubble Study, p.42",
      "calibration_method": "regression on 2019-2023 data"
    },

    "enforcement_compliance_factor": {
      "value": 0.80,
      "description": "Compliance rate with active enforcement",
      "source": "Literature review (Greenstone & Hanna 2014)"
    }
  },

  "dispersion_model": {
    "wind_dispersion_coeff": 0.40,
    "rain_removal_rate": 0.85,
    "inversion_trapping_factor": 0.70
  }
}
```

### Difficulty Knobs

```json
"difficulty": {
  "preset": "medium",

  "multipliers": {
    "budget": 1.0,
    "action_effectiveness": 1.0,
    "event_severity": 1.0,
    "time_pressure": 1.0
  },

  "constraints": {
    "allow_deficit_spending": false,
    "allow_cross_jurisdiction_actions": false,
    "strict_timeline": true
  }
}
```

---

## 6. Win Conditions

```json
"win_conditions": {
  "public_goal": {
    "description": "Keep Delhi breathable",
    "conditions": [
      {
        "metric": "aqi_average",
        "operator": "<",
        "threshold": 250,
        "weight": 1.0
      },
      {
        "metric": "rounds_completed",
        "operator": "==",
        "threshold": 5,
        "weight": 1.0
      }
    ],
    "required": "all"
  },

  "hidden_goals": {
    "delhi_cm": {
      "description": "Maintain approval while being decisive",
      "conditions": [
        {"metric": "public_approval", "operator": ">", "threshold": 60},
        {"metric": "major_actions_taken", "operator": ">=", "threshold": 3}
      ],
      "required": "all"
    },

    "punjab_farmer": {
      "description": "Protect farmer livelihoods OR secure compensation",
      "conditions": [
        {"metric": "farmer_income_loss", "operator": "<", "threshold": 0.30}
      ],
      "alternative_conditions": [
        {"metric": "compensation_secured", "operator": ">", "threshold": 200}
      ],
      "required": "one_of"
    }
  },

  "failure_conditions": [
    {
      "metric": "aqi",
      "operator": ">",
      "threshold": 500,
      "description": "Public health catastrophe",
      "game_over": true
    },
    {
      "metric": "budget",
      "operator": "<",
      "threshold": 0,
      "description": "Bankruptcy",
      "game_over": true
    }
  ]
}
```

---

## 7. Narrative Configuration

```json
"narrative_config": {
  "tone": "serious_journalistic",
  "detail_level": "medium",
  "region_specificity": "delhi",

  "llm_settings": {
    "model": "gemini-2.0-flash-exp",
    "temperature": 0.7,
    "system_prompt": "You are a game master for a policy simulation...",

    "narrative_constraints": [
      "Use Delhi-specific references (India Gate, Connaught Place, etc.)",
      "Reference real policies (GRAP, odd-even, Happy Seeder)",
      "Include diverse perspectives (farmers, patients, activists)",
      "Maintain scientific accuracy (cite actual AQI thresholds)"
    ]
  },

  "templates": {
    "round_intro": "Round {round}: {date_range}. Current AQI: {aqi} ({regime}). {weather_description}",

    "consequence_structure": [
      "Opening: Describe initial state",
      "Action effects: What changed due to player actions",
      "Emergent dynamics: Unintended consequences",
      "Stakeholder reactions: Quotes from affected parties",
      "Forward tension: What's at stake next round"
    ],

    "media_headline_style": "Delhi Times journalistic"
  },

  "character_database": {
    "farmer_names": ["Ram Singh", "Gurpreet Kaur", "Amarjit Singh"],
    "locations": ["Ludhiana", "Karnal", "Rohtak", "Meerut"],
    "hospitals": ["AIIMS", "RML Hospital", "GTB Hospital"]
  }
}
```

---

## 8. Validation Report

```json
"validation_report": {
  "validated_at": "2025-01-15T12:45:00Z",
  "validator_version": "1.0",

  "consistency_checks": {
    "all_passed": true,
    "checks": [
      {"name": "initial_values_in_bounds", "passed": true},
      {"name": "win_conditions_non_contradictory", "passed": true},
      {"name": "event_triggers_reachable", "passed": true}
    ]
  },

  "balance_checks": {
    "simulation_runs": 20,
    "win_rate": 0.55,
    "avg_final_aqi": 242,
    "role_win_rates": {
      "delhi_cm": 0.60,
      "punjab_farmer": 0.45,
      "industry_leader": 0.40
    },
    "dominant_strategy_detected": false
  },

  "playability_checks": {
    "avg_meaningful_choices_per_round": 4.2,
    "round_budget_warnings": [
      {"round": 4, "avg_budget_remaining": 150, "status": "acceptable"}
    ]
  },

  "issues": [],
  "warnings": [
    "Round 4 may have limited options if budget depleted early"
  ],

  "gm_overrides": [
    {
      "parameter": "farmer_hidden_objective",
      "reason": "Added alternative win path per validation suggestion"
    }
  ]
}
```

---

## Usage

### Loading a Scenario

```python
from scenario_loader import ScenarioLoader

scenario = ScenarioLoader.load("october_crisis_2024.json")

# Validate
if scenario.validate():
    print("Scenario ready to run")

# Run game
game = TTXGame(scenario)
game.start()
```

### Creating a Scenario Programmatically

```python
from scenario_builder import ScenarioBuilder

builder = ScenarioBuilder()

builder.set_metadata(
    name="Custom Scenario",
    author="GM Name"
)

builder.add_stakeholder(
    id="player1",
    name="Role Name",
    public_objective="...",
    hidden_objective="..."
)

builder.add_event(
    type="conditional",
    trigger={"condition": "aqi > 400"},
    effects={"aqi_delta": -50}
)

scenario = builder.build()
scenario.save("custom_scenario.json")
```

---

## Versioning & Compatibility

**Schema Version**: 1.0

**Backward Compatibility**:
- Minor version changes (1.0 → 1.1): Additive only, old scenarios still work
- Major version changes (1.x → 2.x): Breaking changes, migration tool provided

**Migration**:
```bash
scenario-migrate october_crisis_2024.json --from 1.0 --to 2.0
```

---

## File Size & Performance

**Typical Sizes**:
- Minimal scenario: ~50 KB (2 stakeholders, 3 events)
- Medium scenario: ~500 KB (7 stakeholders, 10 events)
- Complex scenario: ~2-5 MB (15 stakeholders, 30 events, extensive narratives)

**Optimization**:
- Use template references instead of duplicating narratives
- Compress repeated structures
- Lazy-load event narratives (generate on-demand)

---

## Security & Validation

**Constraints**:
- All numeric values must have bounds checks
- Event conditions must be evaluable (no arbitrary code execution)
- LLM prompts are sandboxed
- File size limit: 10 MB

**Sanitization**:
- Stakeholder names: Max 100 chars, alphanumeric + spaces
- Descriptions: Max 1000 chars
- LLM prompts: Max 5000 chars
- Narrative templates: XSS prevention

---

## Example: Minimal Valid Scenario

```json
{
  "schema_version": "1.0",
  "metadata": {
    "id": "minimal_test",
    "name": "Minimal Test Scenario",
    "rounds": 3
  },
  "initial_state": {
    "aqi": 150,
    "budget": 500
  },
  "stakeholders": [
    {
      "id": "player1",
      "name": "Policy Maker",
      "public_objective": {"short": "Reduce AQI"},
      "hidden_objective": {"condition": "budget > 200", "description": "Save budget"}
    }
  ],
  "win_conditions": {
    "public_goal": {
      "conditions": [{"metric": "aqi", "operator": "<", "threshold": 200}]
    }
  }
}
```

This is the minimum required to run a game.
