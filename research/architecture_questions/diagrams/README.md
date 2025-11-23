# Architecture Diagrams

Visual representations of Simulacra's LLM-driven formal modeling architecture.

All diagrams are generated from Graphviz `.dot` files and rendered as SVG (vector graphics - fully zoomable).

---

## Diagrams

### 1. Overall Pipeline
**File**: `01_overall_pipeline.svg` ([source](01_overall_pipeline.dot))

**Shows**: End-to-end flow from GM's informal mental model to playable TTX

**Layers**:
- **Input**: GM's blogs, notes, conversations
- **Elicitation**: LLM extraction → semi-formal spec → human iteration
- **Formalization**: Validated spec → Matrix adapter → executable simulation
- **Runtime**: LLM agent + Matrix tools → grounded narrative
- **Output**: Playable TTX + insights loop back to GM

**Key insight**: Progressive transformation from informal (text) to formal (executable) to playable (narrative)

---

### 2. Agent Architecture
**File**: `02_agent_architecture.svg` ([source](02_agent_architecture.dot))

**Shows**: How LLM agents use Matrix formal methods as tools

**Workflow**:
1. Player submits action ("Implement pause")
2. Agent thinks: "Let me simulate what happens"
3. Agent calls `matrix.simulate()` tool
4. Gets formal results (trajectory, state changes)
5. Agent thinks: "Let me check for dangerous transitions"
6. Agent calls `matrix.check_guards()` tool
7. Gets transition probabilities
8. Agent generates narrative grounded in formal results

**Key insight**: Agents reason WITH formal methods, don't replace them

**Available tools**:
- `matrix.simulate()` - ODE integration
- `matrix.check_guards()` - Find enabled transitions
- `matrix.verify_property()` - Temporal logic checking
- `matrix.monte_carlo()` - Probabilistic analysis

---

### 3. Multi-Agent Verification
**File**: `03_multi_agent_verification.svg` ([source](03_multi_agent_verification.dot))

**Shows**: Three-agent pipeline ensuring narrative consistency

**Agents**:
1. **Storyteller LLM**: Generates engaging narrative from formal state
2. **Fact-Checker LLM**: Verifies narrative matches formal state, finds inconsistencies
3. **Editor LLM**: Rewrites to fix issues while maintaining quality

**Flow**:
```
Formal State → Storyteller → Narrative v1
                            ↓
                        Fact-Checker
                            ↓
                    Issues found? → No: Output
                            ↓ Yes
                        Editor
                            ↓
                        Narrative v2 (fixed) → Re-verify → Output
```

**Example issues caught**:
- Wrong numbers (trust = 0.30 vs actual 0.32)
- Missing key information (didn't mention compute level)
- Omitted warnings (alignment gap risk)

**Key insight**: Multi-agent verification prevents hallucination

---

### 4. GM Control Panel
**File**: `04_gm_control_panel.svg` ([source](04_gm_control_panel.dot))

**Shows**: Complete workflow for runtime spec adjustment

**Phases**:
1. **Monitor & Detect**: GM reviews state, health checks run automatically
2. **AI Assistance**: System suggests edits when anomalies detected
3. **GM Decision**: GM chooses/modifies edit, sees impact preview
4. **Apply & Log**: Edit applied with version control, can rollback

**Example scenario**:
- Round 3 completes
- Health check: Trust = 0.55 (expected 0.35) ⚠️
- AI suggests: Increase trust decay rate (-0.05 → -0.12)
- Preview: Shows 3 rounds ahead with new parameter
- GM approves → Edit logged → Game continues

**Key insight**: No model survives contact with players - runtime tweaking is essential

**Safety features**:
- Impact preview (simulate 3 rounds ahead)
- Magnitude limits (warn if >50% change)
- Version control (can rollback)
- Cannot change past (only forward-looking edits)

---

### 5. Progressive Formalization
**File**: `05_progressive_formalization.svg` ([source](05_progressive_formalization.dot))

**Shows**: Six-level ladder from informal to calibrated

**Levels**:
- **Level 0**: Pure informal (blog post text) - 0% formality
- **Level 1**: Extracted structure (modes, transitions) - 20% formality
- **Level 2**: Quantified parameters (thresholds, equations) - 50% formality
- **Level 3**: Validated spec (consistency checks pass) - 70% formality
- **Level 4**: Tested spec (simulation runs successfully) - 85% formality
- **Level 5**: Calibrated spec (validated against data) - 95% formality

**Key insights**:
- GM can stop at any level (doesn't need full rigor)
- Level 4 is sufficient for Simulacra TTX
- Level 5 is optional (validation is GM's choice)
- Iteration paths allow refinement at each stage

**Example progression**:
```
"If we hit 10^28 FLOP without solving alignment,
and China steals the weights, we're doomed"
                ↓ (LLM extraction)
Modes: {Baseline, Race, Catastrophe}
                ↓ (Quantification)
Guard: compute ≥ 27.5 ∧ alignment < 0.6 → Catastrophe
                ↓ (Validation)
✅ All modes reachable, no undefined variables
                ↓ (Testing)
🧪 Simulation: Catastrophe at month 24
                ↓ (Optional calibration)
📈 Fits historical compute scaling (2018-2024)
```

---

### 6. Multi-View System
**File**: `06_multi_view_system.svg` ([source](06_multi_view_system.dot))

**Shows**: Same simulation engine, different presentations for different audiences

**Architecture**:
```
Matrix Core (Universal Backend)
  - Formal spec (Hybrid Automaton)
  - Adapters (SD, HA, ABM, Kripke, MDP)
  - Simulation engine (scipy, networkx, numpy)
        ↓
  View System (Presentation Layer)
    ↓         ↓         ↓         ↓
  View 1    View 2    View 3    View 4
```

**Views**:

1. **Simulacra TTX**
   - Audience: Players, policymakers
   - Interface: Narrative, action cards, scores
   - Purpose: Interactive exploration

2. **Policy Dashboard**
   - Audience: Analysts, decision-makers
   - Interface: Levers, distributions, P(catastrophe)
   - Purpose: Policy analysis, risk quantification

3. **Research View**
   - Audience: Researchers, formal methods experts
   - Interface: Full model, verification results, LaTeX export
   - Purpose: Rigorous analysis, paper writing

4. **Education View**
   - Audience: Students, public
   - Interface: Interactive explainer, animations, playground
   - Purpose: Teaching, building intuition

**Key insight**: Same formal model, packaged differently for each audience

**Matrix provides**:
- View 1: State updates + narrative prompts
- View 2: Monte carlo + statistics
- View 3: MDP abstraction + verification
- View 4: Simplified model + step-by-step control

---

## How to Regenerate

If you need to modify or regenerate diagrams:

```bash
# Edit the .dot file
vim 01_overall_pipeline.dot

# Regenerate SVG
dot -Tsvg 01_overall_pipeline.dot -o 01_overall_pipeline.svg

# Or regenerate all
for f in *.dot; do
    dot -Tsvg "$f" -o "${f%.dot}.svg"
done
```

**Requirements**: `graphviz` package
```bash
# Install on Ubuntu/Debian
sudo apt-get install graphviz

# Install on macOS
brew install graphviz
```

---

## Design Principles

**Color coding**:
- **Light orange** (#FFE4B5): Input/GM layer
- **Light blue** (#87CEEB): LLM/AI processing
- **Light green** (#90EE90): Formal methods/Matrix
- **Light pink** (#FFB6C1): Runtime/Agent layer
- **Purple** (#DDA0DD): Output/Player layer

**Node shapes**:
- **Rounded boxes**: Processes, agents, components
- **Notes**: Data/state representations
- **Diamonds**: Decision points
- **Ellipses**: Thoughts/reasoning steps

**Edge styles**:
- **Solid**: Main flow
- **Dashed**: Iteration/feedback loops
- **Dotted**: Reference/lookup
- **Red**: Warning/error paths

---

## Related Documentation

- [../README.md](../README.md) - Main architecture questions overview
- [../01_llm_elicitation_strategy.md](../01_llm_elicitation_strategy.md) - Uses diagram 5
- [../02_grounding_validation.md](../02_grounding_validation.md) - Uses diagram 3
- [../03_runtime_dynamics.md](../03_runtime_dynamics.md) - Uses diagram 4
- [../04_agent_architecture.md](../04_agent_architecture.md) - Uses diagram 2

---

**Created**: 2025-11-23
**Format**: Graphviz DOT → SVG
**Total diagrams**: 6
**Total size**: ~85 KB (all SVGs combined)
