# Formal Model Examples

This directory contains executable examples demonstrating different formal models for AI risk scenarios.

## Examples

### 1. Simple LTS (`01_simple_lts.py`)

**Model**: Labeled Transition System (LTS) - deterministic finite-state machine

**Scenario**: AI development lifecycle from research to deployment

**Key concepts**:
- Deterministic transitions
- Terminal states (aligned vs catastrophe)
- No probabilities, no time constraints

**Run**:
```bash
python3 01_simple_lts.py
```

**Generates**: `ai_lifecycle_lts.png` and `ai_lifecycle_lts.svg`

### 2. Time-Indexed Model (`02_time_indexed_model.py`)

**Model**: Time-Indexed Kripke Structure - state machine with temporal constraints

**Scenario**: AI race with regulatory deadlines (2024-2028 timeline)

**Key concepts**:
- State = (world_state, time)
- Time guards on transitions (e.g., "deploy before 2026-Q1")
- Still deterministic, but temporally constrained

**Run**:
```bash
python3 02_time_indexed_model.py
```

**Generates**: `ai_race_time_indexed.png` and `ai_race_time_indexed.svg`

### 3. Simple MDP (`03_simple_mdp.py`)

**Model**: Markov Decision Process - stochastic state machine with actions

**Scenario**: AI deployment decisions under uncertainty

**Key concepts**:
- Probabilistic transitions P(s'|s,a)
- Actions have uncertain outcomes
- Can compute P(catastrophe) via Monte Carlo
- Policy comparison (aggressive vs cautious)

**Run**:
```bash
python3 03_simple_mdp.py
```

**Output**: Terminal output with policy comparison and PCTL property checking

## Prerequisites

Install required Python packages:

```bash
pip install transitions pygraphviz
```

**Note**: `pygraphviz` requires Graphviz to be installed on your system:

- **Ubuntu/Debian**: `sudo apt-get install graphviz graphviz-dev`
- **macOS**: `brew install graphviz`
- **Windows**: Download from https://graphviz.org/download/

## Usage

### Run all examples:

```bash
./run_all.sh
```

### Run individual examples:

```bash
python3 01_simple_lts.py
python3 02_time_indexed_model.py
python3 03_simple_mdp.py
```

## Output

Each example generates:

1. **Terminal output** - Demonstrates scenarios and prints formal definitions
2. **Visualizations** (where applicable) - PNG and SVG diagrams

## Understanding the Progression

These examples demonstrate **progressive complexity**:

```
01_simple_lts.py         → Deterministic FSM (simplest)
  ↓ add time guards
02_time_indexed_model.py → Temporal constraints
  ↓ add probabilities
03_simple_mdp.py         → Stochastic transitions
```

This mirrors the MVP implementation plan:
- **Phase 1**: Start with deterministic LTS (Example 1)
- **Phase 2**: Add time guards (Example 2)
- **Phase 3**: Add probabilities/MDP (Example 3)

## Related Documentation

- **MVP Implementation Plan**: [../mvp_docs/impl_plan.md](../mvp_docs/impl_plan.md)
- **Model Design**: [../mvp_docs/model_design.md](../mvp_docs/model_design.md)
- **Formal Models**: [../formal_models/README.md](../formal_models/README.md)
- **Tools Survey**: [../TOOLS_LITERATURE_SURVEY.md](../TOOLS_LITERATURE_SURVEY.md)

## Extending These Examples

To create your own examples:

1. Copy one of the existing scripts as a template
2. Modify the states and transitions for your scenario
3. Run to generate diagrams and verify behavior
4. Add temporal properties to check

See the `transitions` library documentation for more features: https://github.com/pytransitions/transitions
