# LLM Elicitation Strategy

**Question**: How do we extract formal specs from GMs' informal mental models using LLMs?

---

## The Pipeline

```
GM's Mental Model (blogs, notes, conversations)
    ↓
LLM + Structured Output (Zod/Pydantic schemas)
    ↓
Semi-Formal Spec (modes, transitions, rough parameters)
    ↓
Human Iteration (GM refines, corrects, fills gaps)
    ↓
Formal Spec (Hybrid Automaton JSON)
    ↓
Matrix Adapter (executable simulation)
    ↓
Simulacra TTX (playable game)
```

---

## Key Design Decisions

### 1. Progressive Refinement (Not One-Shot)

**Approach**: Multiple LLM passes with increasing formality

```
Pass 1: Extract high-level structure
  Input: GM's blog post
  Output: "There are 4 main phases: Baseline, Race, Pause, Catastrophe"

Pass 2: Extract transitions
  Input: Pass 1 + GM's document
  Output: "Race happens when compute > threshold AND competition detected"

Pass 3: Quantify parameters
  Input: Pass 2 + follow-up questions
  Output: "Compute threshold = 10^26.5 FLOP"

Pass 4: Validate consistency
  Input: Full spec
  Output: "Warning: Trust can go negative in Race mode - is this intended?"
```

**Why**: Reduces hallucination risk, allows GM to catch errors early

---

### 2. Structured Output Enforcement

**Use libraries**: Instructor (Python), Zod (TypeScript)

**Example schema**:
```python
from pydantic import BaseModel, Field
from typing import List, Literal

class Mode(BaseModel):
    name: str = Field(..., description="Mode name (e.g., 'Baseline', 'Race')")
    description: str
    continuous_dynamics: dict[str, str]  # variable -> ODE equation
    invariant: str | None = None

class Transition(BaseModel):
    from_mode: str
    to_mode: str
    guard: str = Field(..., description="Condition triggering transition")
    probability: float | None = Field(None, ge=0, le=1)
    reset_actions: dict[str, str] = {}

class HybridAutomatonSpec(BaseModel):
    modes: List[Mode]
    transitions: List[Transition]
    continuous_variables: dict[str, tuple[float, float]]  # name -> (min, max)
    initial_mode: str
    initial_state: dict[str, float]
```

**LLM prompt**:
```
Extract a hybrid automaton from this scenario description.
Return JSON matching this schema:
{schema}

Rules:
- Guards must be boolean expressions (e.g., "compute >= 26.5 && trust < 0.4")
- ODE equations use variable names (e.g., "dC/dt = 0.5 * C")
- All numeric values must have units specified in description
```

**Benefits**:
- Catches malformed output immediately
- Forces LLM to be precise
- Provides clear error messages to GM

---

### 3. Uncertainty Tracking

**Mark LLM-inferred values**:
```json
{
  "transitions": [
    {
      "from_mode": "Race",
      "to_mode": "Catastrophe",
      "guard": "alignment_gap > 8.0",
      "metadata": {
        "source": "LLM_INFERRED",
        "confidence": "low",
        "requires_GM_approval": true,
        "rationale": "GM mentioned 'alignment lag' but didn't specify threshold"
      }
    }
  ]
}
```

**UI workflow**:
```
Simulacra: "We extracted these transitions. Please review:"

  ✓ Baseline → Race (when compute >= 26.5)  [GM explicitly stated]
  ⚠ Race → Catastrophe (when alignment_gap > 8.0)  [LLM inferred - confirm?]

GM: [Edits] "Change to alignment_gap > 6.0"
```

---

### 4. Interactive Calibration Wizard

**For parameters that need numeric values**:

```
Wizard: "How fast does compute grow in Race mode?"

[Slider: Doubling time]
3 months ←•→ 24 months
          ↑
        12 months

Preview: "This means compute goes 26 → 28 in 24 months (4x growth)"

GM: "That's too fast. More like 18 months."

[Slider adjusts]

Wizard: "Got it. Setting α_compute = ln(2)/18 = 0.0385"
```

**For qualitative parameters**:
```
Wizard: "How does public trust change in Race mode?"

○ Rises slowly
○ Stays roughly constant
● Falls moderately    ← GM selects
○ Collapses rapidly

Wizard: "Setting dTrust/dt = -0.05 * Trust (half-life ~14 months)"
```

---

## Open Questions

### Q1: How to handle conflicting information?

**Scenario**: GM's blog post says "compute doubles every 6 months" but later mentions "18-month timeline to ASI"

**Options**:
- Flag conflict, ask GM to resolve
- Use latest statement (recency bias)
- Average the values
- Let GM see both, choose

**Proposed**: Flag + ask GM

---

### Q2: How to validate LLM extraction quality?

**Metrics**:
- **Coverage**: Did LLM extract all modes mentioned by GM?
- **Precision**: Are extracted parameters within reasonable ranges?
- **Consistency**: Do transitions form a valid graph (no orphaned modes)?

**Validation workflow**:
```python
def validate_extraction(spec: HybridAutomatonSpec, gm_document: str):
    # Check 1: All modes reachable from initial mode
    reachable = compute_reachable_modes(spec)
    if len(reachable) < len(spec.modes):
        warn("Some modes unreachable - missing transitions?")

    # Check 2: All variables used in guards are defined
    used_vars = extract_variables_from_guards(spec)
    if not used_vars.issubset(spec.continuous_variables.keys()):
        error("Guard references undefined variable")

    # Check 3: Terminal states have no outgoing transitions
    terminal_modes = ["Catastrophe", "Aligned"]
    for trans in spec.transitions:
        if trans.from_mode in terminal_modes:
            warn(f"Terminal mode {trans.from_mode} has outgoing transition")

    # Check 4: Parameter ranges are sane
    for var, (min_val, max_val) in spec.continuous_variables.items():
        if min_val >= max_val:
            error(f"Invalid range for {var}: [{min_val}, {max_val}]")
```

---

### Q3: How to handle narrative → math translation?

**GM says**: "If trust collapses, the public demands a pause"

**What does this mean formally?**
- `trust < 0.3 → transition to Pause mode` ?
- `trust < 0.3 → increases P(transition to Pause)` ?
- `dTrust/dt < -0.1 → transition` (derivative-based)?

**Approach**:
- LLM proposes 2-3 interpretations
- GM chooses or refines
- Store mapping for future scenarios

**Example library**:
```json
{
  "narrative_templates": {
    "X collapses → Y happens": [
      {"type": "threshold", "template": "{X} < {threshold} → transition to {Y}"},
      {"type": "rate", "template": "d{X}/dt < {rate} → transition to {Y}"},
      {"type": "probabilistic", "template": "{X} < {threshold} → P(transition to {Y}) = f({X})"}
    ]
  }
}
```

---

### Q4: How to incorporate GM's tacit knowledge?

**Problem**: Much of GM's model is implicit, never written down

**Example**: Kokotajlo knows AI labs' internal culture, but hasn't blogged about it

**Solutions**:
1. **Socratic LLM interview**:
   ```
   LLM: "You mentioned 'race dynamics'. What triggers a lab to accelerate?"
   GM: "Mostly if a competitor announces a capability breakthrough"
   LLM: "How fast does acceleration happen?"
   GM: "Almost immediately - within weeks"
   LLM: [Updates transition: guard="competitor_breakthrough", probability=0.9]
   ```

2. **Probing questions**:
   ```
   After extracting base spec, LLM asks:
   - "What makes Race mode end?"
   - "Can the system return to Baseline from Race?"
   - "Are there scenarios you're worried about that don't fit these modes?"
   ```

3. **Counterfactual testing**:
   ```
   LLM: "If trust = 0.2 and compute = 27, what happens next?"
   GM: "Hmm, depends on whether there's been a catastrophic incident"
   LLM: "Should I add an 'incident_occurred' flag to the state?"
   GM: "Yes, good catch"
   ```

---

## Implementation Sketch

### Phase 1: Basic Extraction
```python
def extract_hybrid_automaton(
    gm_document: str,
    model_type: Literal["deterministic", "probabilistic", "timed"]
) -> HybridAutomatonSpec:
    """
    Extract formal spec from GM's informal description

    Uses:
    - GPT-4 with structured output (Instructor)
    - Multi-pass refinement
    - Consistency validation
    """
    # Pass 1: Extract modes
    modes_prompt = build_modes_extraction_prompt(gm_document)
    modes = llm.query(modes_prompt, response_model=List[Mode])

    # Pass 2: Extract transitions
    transitions_prompt = build_transitions_prompt(gm_document, modes)
    transitions = llm.query(transitions_prompt, response_model=List[Transition])

    # Pass 3: Quantify parameters
    params_prompt = build_params_prompt(gm_document, modes, transitions)
    params = llm.query(params_prompt, response_model=dict)

    # Assemble and validate
    spec = HybridAutomatonSpec(
        modes=modes,
        transitions=transitions,
        continuous_variables=params["variables"],
        initial_mode=params["initial_mode"],
        initial_state=params["initial_state"]
    )

    validate_extraction(spec, gm_document)

    return spec
```

### Phase 2: Interactive Refinement
```python
def refine_with_gm(
    spec: HybridAutomatonSpec,
    gm_feedback: Callable[[str], str]
) -> HybridAutomatonSpec:
    """
    Interactive loop: show spec, get feedback, refine
    """
    while True:
        # Visualize spec for GM
        visualization = render_spec_for_review(spec)

        # Get feedback
        feedback = gm_feedback(visualization)

        if feedback == "approve":
            break

        # Apply corrections
        spec = apply_gm_corrections(spec, feedback)

    return spec
```

### Phase 3: Calibration Wizard
```python
def calibrate_parameters(
    spec: HybridAutomatonSpec,
    gm_responses: dict
) -> HybridAutomatonSpec:
    """
    Convert qualitative responses to quantitative parameters
    """
    for mode in spec.modes:
        for var, dynamics_str in mode.continuous_dynamics.items():
            if "NEEDS_CALIBRATION" in dynamics_str:
                # Launch wizard for this parameter
                calibrated_value = run_calibration_wizard(
                    variable=var,
                    mode=mode.name,
                    gm_responses=gm_responses
                )
                mode.continuous_dynamics[var] = calibrated_value

    return spec
```

---

## Success Criteria

A successful elicitation produces a spec where:

1. ✅ **Complete**: All modes mentioned by GM are captured
2. ✅ **Consistent**: State graph is valid (no unreachable modes, no undefined variables)
3. ✅ **Executable**: Matrix can simulate without errors
4. ✅ **Aligned**: GM confirms "yes, this captures my mental model"
5. ✅ **Transparent**: GM can see where each parameter came from (document quote vs LLM inference)

---

## Next Steps

- [ ] Build proof-of-concept: extract Kokotajlo's AI2027 from blog posts
- [ ] Test structured output schemas (Instructor + Pydantic)
- [ ] Design calibration wizard UI
- [ ] Create validation test suite
- [ ] Build GM feedback interface (show spec, collect corrections)
