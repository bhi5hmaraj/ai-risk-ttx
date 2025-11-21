# Architect Mode: Scenario Creation Workflow

## Overview

**Architect Mode** is a three-phase workflow that allows Game Masters (policy experts with technical background) to create custom TTX scenarios from domain documents (PDFs, presentations, notes) without writing code.

```
┌─────────────────┐
│  Game Engine    │ ← We (designers) build this
│  Designers      │
└────────┬────────┘
         │ Build tools
         ▼
┌─────────────────┐
│  Game Masters   │ ← Policy experts use Architect Mode
│  (Policy Experts)│
└────────┬────────┘
         │ Create scenarios
         ▼
┌─────────────────┐
│  Players        │ ← Participants play the scenarios
│  (Participants) │
└─────────────────┘
```

## Quick Start

### Full Workflow (Recommended)

Create a complete scenario in one command:

```bash
python architect_cli.py create \
    --docs SAFAR_report.pdf workshop_notes.txt \
    --prompt "I want to create a scenario about the October 2024 Delhi air pollution crisis. Key stakeholders: farmers, Delhi government, central government, industry, health activists. Main tension: farmers need to burn stubble but Delhi faces severe AQI spike." \
    --name "October Crisis 2024" \
    --difficulty medium \
    --rounds 5 \
    --output october_crisis_2024.json
```

This will:
1. ✅ Extract scenario blocks from documents (2 min)
2. ✅ Compile into executable scenario (instant)
3. ✅ Validate balance and playability (10 simulations, ~1 min)
4. ✅ Save final scenario JSON

### Step-by-Step Workflow

For more control, run each phase separately:

```bash
# Phase 1: Extract from documents
python architect_cli.py extract \
    --docs SAFAR_report.pdf IIT_study.pdf \
    --prompt "Create October crisis scenario..." \
    --output extracted.json

# Phase 2: Compile (with custom config)
python architect_cli.py compile \
    --input extracted.json \
    --name "October Crisis 2024" \
    --difficulty hard \
    --rounds 7 \
    --output compiled.json

# Phase 3: Validate
python architect_cli.py validate \
    --scenario compiled.json \
    --simulations 20 \
    --output validation_report.json
```

## Three-Phase Architecture

### Phase 1: Document Ingestion

**Module**: `document_ingestion.py`

**Purpose**: Extract scenario building blocks from PDFs, presentations, notes.

**What it does**:
- Parses documents (currently .txt, TODO: PDF/DOCX)
- Uses LLM to identify:
  - Stakeholders (who plays)
  - Parameters (calibrated values from literature)
  - Events (triggers and consequences)
  - Initial conditions
  - Constraints (political, temporal, jurisdictional)
- Outputs structured JSON

**Input**:
- Document files (PDFs, .txt, .docx)
- User prompt (GM's description of desired scenario)

**Output**:
- `extracted_scenario.json` with scenario building blocks

**Example**:
```python
from document_ingestion import DocumentIngestion

ingestion = DocumentIngestion()

extraction = ingestion.process_documents(
    file_paths=["SAFAR_2023.pdf", "workshop_notes.txt"],
    user_prompt="Create October crisis scenario with 5 stakeholders...",
    domain="air_pollution"
)

ingestion.save_extraction(extraction, "extracted.json")
```

### Phase 2: Scenario Compilation

**Module**: `scenario_compiler.py`

**Purpose**: Compile extracted blocks into executable scenario matching `SCENARIO_SCHEMA.md`.

**What it does**:
- Takes extracted blocks + GM configuration
- Applies difficulty settings (budget multipliers, event severity)
- Generates complete scenario JSON with:
  - Metadata
  - Initial state
  - Stakeholders (with hidden objectives)
  - Events (scheduled + conditional)
  - Win/lose conditions
  - Narrative configuration
  - Model parameters

**Input**:
- Extracted scenario JSON
- GM configuration:
  ```python
  config = {
      "difficulty": "medium",  # easy/medium/hard
      "rounds": 5,
      "name": "October Crisis 2024",
      "author": "Dr. Sharma"
  }
  ```

**Output**:
- Complete scenario JSON (ready for game engine)

**Example**:
```python
from scenario_compiler import ScenarioCompiler

compiler = ScenarioCompiler()

with open("extracted.json") as f:
    extraction = json.load(f)

config = {
    "name": "October Crisis 2024",
    "difficulty": "medium",
    "rounds": 5
}

scenario = compiler.compile(extraction, config)
compiler.save_scenario(scenario, "scenario.json")
```

### Phase 3: Validation

**Module**: `scenario_validator.py`

**Purpose**: Validate scenario is balanced and playable before deployment.

**What it does**:
- **Consistency checks**: Required fields, value bounds, non-contradictory conditions
- **Balance checks**: Simulate 10-20 games with different AI strategies
  - Measures win rate (target: 40-60%)
  - Detects dominant strategies
  - Checks role balance
- **Playability checks**: Meaningful choices, budget pacing, event spacing

**Input**:
- Compiled scenario JSON
- Number of simulations (default: 10)

**Output**:
- Validation report with:
  - All checks passed? (boolean)
  - Issues (must fix)
  - Warnings (should review)
  - Suggestions (improvements)

**Example**:
```python
from scenario_validator import ScenarioValidator

validator = ScenarioValidator()

with open("scenario.json") as f:
    scenario = json.load(f)

report = validator.validate(scenario, num_simulations=10, verbose=True)

if report["all_checks_passed"]:
    print("✅ Scenario ready for deployment!")
else:
    print("❌ Issues:", report["issues"])
    print("Suggestions:", report["suggestions"])
```

## Scenario Schema

Scenarios are JSON files matching the specification in `../SCENARIO_SCHEMA.md`.

**Key sections**:

1. **Metadata**: Name, author, difficulty, duration
2. **Initial State**: AQI, budgets, approval ratings, etc.
3. **Stakeholders**: Roles, objectives (public + hidden), resources, constraints
4. **Events**: Scheduled (Diwali spike at round 3) and conditional (Supreme Court if AQI > 400)
5. **Parameters**: Calibrated model parameters (emission rates, subsidy effectiveness)
6. **Win Conditions**: Public goal + hidden goals + failure conditions
7. **Narrative Config**: LLM settings, tone, templates
8. **Validation Report**: Balance checks, playability metrics

**Example structure**:
```json
{
  "schema_version": "1.0",
  "metadata": {
    "name": "October Crisis 2024",
    "difficulty": "medium",
    "rounds": 5
  },
  "initial_state": {
    "aqi": 150,
    "budget_delhi": 800,
    "public_approval": 65
  },
  "stakeholders": [
    {
      "id": "delhi_cm",
      "name": "Delhi Chief Minister",
      "public_objective": "Keep AQI below 300",
      "hidden_objective": {
        "condition": "public_approval > 60 AND budget_spent < 600",
        "description": "Win re-election"
      }
    }
  ],
  "events": [...],
  "parameters": {...},
  "win_conditions": {...}
}
```

## GM Control Levels

See `../ARCHITECT_AFFORDANCES.md` for detailed breakdown.

### Tier 1: GM MUST Control (Core Decisions)
- Scenario framing (who, what, why)
- Stakeholder roles and objectives
- Initial conditions (starting AQI, budgets)
- Win/lose conditions
- Major events

### Tier 2: GM CAN Control (Fine-Tuning)
- Model parameters (subsidy effectiveness, etc.)
- Action availability (which stakeholder can do what)
- Difficulty knobs (budget multipliers, event severity)

### Tier 3: Auto-Generated (System Controls)
- Low-level math (emission dispersion, AQI formulas)
- Narrative details (character names, dialogue)
- Dynamic state variables (emerge during gameplay)
- Action synergies (how actions combine)

## Difficulty Presets

Three presets available: **easy**, **medium**, **hard**

| Setting | Easy | Medium | Hard |
|---------|------|--------|------|
| Budget multiplier | 1.5x | 1.0x | 0.7x |
| Action effectiveness | 1.3x | 1.0x | 0.8x |
| Event severity | 0.7x | 1.0x | 1.3x |
| Deficit spending allowed | Yes | No | No |
| Cross-jurisdiction actions | Yes | No | No |

**Example**:
- Easy mode: ₹1200 crore budget, subsidies 30% more effective, events 30% less severe
- Hard mode: ₹560 crore budget, subsidies 20% less effective, events 30% more severe

## Validation Metrics

### Consistency Checks

✅ **Required fields present**: All mandatory sections exist
✅ **Initial values in bounds**: AQI 0-999, budgets > 0, rates 0-1
✅ **Win conditions non-contradictory**: No impossible conditions (x > 100 AND x < 50)
✅ **Event triggers reachable**: Scheduled events don't exceed max rounds
✅ **Budget consistency**: Stakeholder resources match initial state

### Balance Checks

**Win Rate**: Target 40-60% (balanced challenge)
- < 20%: Too hard
- 20-40%: Challenging but fair
- 40-60%: **Balanced** ✅
- 60-80%: Easy
- > 80%: Too easy

**Role Balance**: All roles should have ~40-60% win rate
- Variance < 0.3 = balanced
- Variance > 0.5 = some roles much easier/harder

**Dominant Strategy**: Detected if one approach always wins
- Should have multiple viable strategies

### Playability Checks

**Meaningful Choices**: Average actions per round
- < 2: Too restrictive
- 2-5: **Good** ✅
- > 5: May be overwhelming

**Budget Pacing**: Don't run out too early
- Warn if late rounds have < ₹100cr average remaining

## File Sizes

**Typical sizes**:
- Minimal scenario: ~50 KB (2 stakeholders, 3 events)
- Medium scenario: ~500 KB (5 stakeholders, 8 events) ← Most scenarios
- Complex scenario: ~2-5 MB (10+ stakeholders, 20+ events, extensive narratives)

## Example Use Cases

### 1. Policy Researcher Creating Custom Crisis

**User**: Dr. Sharma (environmental policy expert)

**Input**:
- 3 PDFs (SAFAR report, IIT study, Supreme Court judgment)
- 1 PowerPoint (workshop presentation)
- Text prompt: "Create October 2024 scenario with farmers, Delhi govt, central govt, industry, activists"

**Process**:
```bash
python architect_cli.py create \
    --docs SAFAR_2023.pdf IIT_study.pdf SC_judgment.pdf workshop.pptx \
    --prompt "October 2024 crisis, 5 stakeholders..." \
    --name "October Crisis 2024" \
    --difficulty medium \
    --output october_crisis.json
```

**Output**: `october_crisis.json` (2.1 MB) ready to load in game engine

**Time**: ~80 minutes total
- Document extraction: 2 min
- GM configuration: 45 min (reviewing stakeholders, tweaking objectives)
- Validation: 20 min (10 simulations, iteration)
- Deploy: Instant

### 2. Rapid Prototyping for Game Designers

**User**: Game engine designers (us) testing different starting scenarios

**Input**:
- Mock data (no documents)
- Quick prompt variations

**Process**:
```bash
# Test easy mode
python architect_cli.py create \
    --prompt "Easy mode with high budgets" \
    --difficulty easy \
    --output easy_test.json

# Test hard mode
python architect_cli.py create \
    --prompt "Hard mode with tight constraints" \
    --difficulty hard \
    --output hard_test.json

# Compare balance
python architect_cli.py validate --scenario easy_test.json --simulations 50
python architect_cli.py validate --scenario hard_test.json --simulations 50
```

**Time**: ~5 minutes per scenario

### 3. Educational Module Creation

**User**: University instructor

**Input**:
- Course readings (PDFs)
- Learning objectives (text)

**Process**:
1. Extract from course materials
2. Configure with pedagogical goals in mind
3. Validate for appropriate difficulty for students
4. Deploy multiple scenarios for different class sessions

## Integration with Game Engine

Compiled scenarios are **ready to load** in the game engine:

```python
# In game engine
from scenario_loader import ScenarioLoader

scenario = ScenarioLoader.load("october_crisis_2024.json")

if scenario.validate():
    print("Scenario loaded successfully")

game = TTXGame(scenario)
game.start()
```

## Roadmap

### Current Status (MVP)
✅ Document ingestion (text files)
✅ Scenario compilation
✅ Validation suite
✅ CLI interface
✅ Mock data for testing

### Next Steps
🔲 PDF parsing (pypdf2 or pymupdf)
🔲 DOCX parsing (python-docx)
🔲 LLM integration for extraction (OpenAI/Gemini structured output)
🔲 Advanced condition parsing (convert NL to formal conditions)
🔲 Web UI for Architect Mode
🔲 Historical data validation (load real AQI data)
🔲 AI playtesting with multiple strategies

### Future Enhancements
🔲 Version control for scenarios (git-like diffing)
🔲 Scenario marketplace (share with other GMs)
🔲 Analytics dashboard (how players interact with scenarios)
🔲 Adaptive difficulty (adjust based on player skill)

## Testing

Run the test suite:

```bash
# Test full workflow with mock data
python test_architect.py

# Test individual components
python -m pytest tests/
```

## Architecture Diagrams

### Data Flow

```
Documents (PDFs, .txt)
    ↓
DocumentIngestion
    ↓
extracted_scenario.json
    ↓
ScenarioCompiler + GM Config
    ↓
compiled_scenario.json
    ↓
ScenarioValidator (simulations)
    ↓
validated_scenario.json (with report)
    ↓
Game Engine
```

### Component Dependencies

```
architect_cli.py
    ├── document_ingestion.py
    ├── scenario_compiler.py
    └── scenario_validator.py
```

All components are independent modules that can be used standalone or via the unified CLI.

## FAQ

**Q: Do I need to provide documents?**
A: No, you can run with just a text prompt. The system will use defaults from literature and mock data.

**Q: Can I edit the JSON directly?**
A: Yes! Advanced users can edit compiled scenarios directly. Just re-run validation afterward.

**Q: How accurate are the simulations?**
A: Currently simplified (random/optimal strategies). Full AI playtesting with realistic agent behavior is on the roadmap.

**Q: Can I create scenarios for domains other than air pollution?**
A: The architecture supports it, but you'd need to provide domain-specific templates and parameters. Currently optimized for air pollution TTX.

**Q: What LLM does document extraction use?**
A: Currently uses mock data. LLM integration (Gemini 2.0 Flash or GPT-4) planned for next release.

## Support

- **Issues**: Report bugs in main project issue tracker
- **Documentation**: See `SCENARIO_SCHEMA.md`, `ARCHITECT_AFFORDANCES.md`, `GM_WORKFLOW_CASE_STUDY.md`
- **Examples**: See `examples/` directory for sample scenarios

## License

Same as main project license.
