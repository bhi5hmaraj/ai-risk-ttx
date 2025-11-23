# Agent Architecture: LLMs with Formal Methods Tools

**Core Question**: How do LLM agents use Matrix formal methods as tools to generate grounded, consistent narratives?

---

## Vision

**Traditional LLM TTX**:
```
Player action → LLM hallucinates consequence → No formal constraints
```

**Simulacra Approach**:
```
Player action
  ↓
Agent analyzes situation (calls formal methods tools)
  ↓
Agent: "Let me simulate what happens if we pause"
  → Calls matrix.simulate(mode="Pause", duration=6)
  → Sees: P(catastrophe) drops 0.45 → 0.18
  ↓
Agent: "Let me check if this violates any safety properties"
  → Calls matrix.verify_property("G ¬(trust < 0.2)")
  → Result: VIOLATED (trust will hit 0.15 in month 4)
  ↓
Agent: "Let me search for real-world pause precedents"
  → Calls web_search("AI development pause international")
  → Finds: Asilomar Conference, EU AI Act delays
  ↓
Agent generates narrative grounded in:
  - Formal simulation results
  - Property verification
  - Real-world context
```

**Key insight**: Agent **reasons with** formal methods, doesn't replace them

---

## Agent Types

### 1. Consequence Agent (Primary)

**Role**: Generate round consequences after player actions

**Tools available**:
```python
tools = [
    matrix.simulate,           # Run trajectory from current state
    matrix.check_guards,       # Which transitions are possible?
    matrix.verify_property,    # Check temporal logic properties
    matrix.monte_carlo,        # Run probabilistic analysis
    web_search,                # Find real-world context
    retrieval.game_history,    # Recall previous rounds
]
```

**Workflow**:
```python
def generate_consequence(
    state: State,
    player_actions: List[Action],
    gm_context: str
) -> str:
    """
    Agent generates consequence narrative using tools
    """

    # Step 1: Simulate formal consequences
    prompt_1 = f"""
You are analyzing a scenario where players took these actions:
{player_actions}

Current state:
{state}

Use the matrix.simulate tool to see what happens over the next 3 months.
"""
    agent_response = agent.run(prompt_1, tools=[matrix.simulate])
    # Agent calls: matrix.simulate(state, duration=3, actions=player_actions)
    # Returns: trajectory with state evolution

    # Step 2: Check for critical transitions
    prompt_2 = f"""
Based on the simulation, check if any dangerous transitions will occur.
Use matrix.check_guards to see what transitions are possible.
"""
    agent_response = agent.run(prompt_2, tools=[matrix.check_guards])
    # Agent calls: matrix.check_guards(state)
    # Returns: ["Race → Catastrophe (alignment_gap > 8)"]

    # Step 3: Generate narrative
    prompt_3 = f"""
Now generate a narrative consequence (3 paragraphs) that:
- Explains the formal state changes you observed
- Describes concrete events leading to these changes
- Warns about the catastrophe risk you detected
- Cites specific numbers from the simulation

Formal results:
{agent_response.tool_results}

GM scenario context:
{gm_context}
"""
    narrative = agent.run(prompt_3, tools=[])  # No tools, just generate

    return narrative
```

**Example agent trace**:
```
Agent thought: "Let me see what happens if players implement the pause"

Tool call: matrix.simulate(
    state=current_state,
    actions=[{type: "implement_pause", player: "Regulator"}],
    duration=6
)

Tool result:
{
  "trajectory": [...],
  "final_state": {
    "mode": "Pause",
    "compute": 27.2,  # Frozen
    "alignment": 0.52,  # Improved from 0.43
    "trust": 0.28  # Declined (enforcement issues)
  },
  "mode_transitions": ["Race → Pause at t=1"]
}

Agent thought: "Trust fell to 0.28, which is below the crisis threshold. Let me check if this triggers any transitions."

Tool call: matrix.check_guards(state={trust: 0.28, mode: "Pause"})

Tool result:
{
  "enabled_transitions": [
    {
      "from": "Pause",
      "to": "Coordination_Breakdown",
      "guard": "trust < 0.3",
      "probability": 0.6
    }
  ]
}

Agent thought: "There's a 60% chance the pause will break down. Let me see what happens in that case."

Tool call: matrix.simulate(
    state={mode: "Coordination_Breakdown", compute: 27.2, alignment: 0.52},
    duration=6
)

Tool result:
{
  "final_state": {
    "mode": "Catastrophe",
    "compute": 28.5,
    "alignment": 0.48
  }
}

Agent thought: "Uh oh. If coordination breaks down, we hit catastrophe within 6 months. Let me generate a narrative that captures this risk."

Final narrative:
"Your proposed pause is implemented, freezing compute scaling at 10^27.2 FLOP.
Alignment researchers make progress, reaching 0.52 capacity—real, but not enough.

The challenge is enforcement. Public trust has eroded to 0.28 as rumors spread
of secret development. China and the US are each accusing the other of cheating.

There's a 60% chance this fragile pause will collapse within the next few months.
If it does, the race will resume with even greater intensity, and our models
predict catastrophe within 6 months—compute will hit 10^28.5 FLOP while
alignment stalls at 0.48.

The clock is ticking. Can you shore up international trust before it's too late?"
```

**Grounding**:
- ✅ Cites formal results (compute 27.2, alignment 0.52, trust 0.28)
- ✅ Explains probabilistic transition (60% breakdown chance)
- ✅ Provides counterfactual (what happens if pause fails)
- ✅ Grounds in formal model (not hallucinated)

---

### 2. Scenario Elicitation Agent

**Role**: Extract formal spec from GM's documents

**Tools available**:
```python
tools = [
    web_search,                # Look up references
    document_retrieval,        # Find quotes from GM's blog
    matrix.validate_spec,      # Check if extracted spec is valid
    matrix.simulate_preview,   # Quick test of extracted model
]
```

**Workflow**:
```python
def elicit_scenario(gm_document: str) -> HybridAutomatonSpec:
    """
    Multi-agent elicitation with tool use
    """

    # Agent 1: Extract structure
    prompt_1 = f"""
Read this scenario description and extract:
- Discrete modes (states the system can be in)
- Transitions between modes
- Key variables that evolve continuously

Document:
{gm_document}

Use web_search if you need to look up technical terms.
"""
    structure = agent.run(prompt_1, tools=[web_search])

    # Agent 2: Quantify parameters
    prompt_2 = f"""
You extracted these modes and transitions:
{structure}

Now quantify the parameters. For each:
- Continuous variable: specify range and units
- Transition guard: specify threshold or condition
- ODE flow: specify equation

Use document_retrieval to find where the GM mentioned specific numbers.
"""
    quantified = agent.run(prompt_2, tools=[document_retrieval])

    # Agent 3: Validate
    prompt_3 = f"""
You've created this formal spec:
{quantified}

Use matrix.validate_spec to check if it's consistent.
Fix any errors.
"""
    validated = agent.run(prompt_3, tools=[matrix.validate_spec])

    # Agent 4: Test
    prompt_4 = f"""
Run a quick simulation to see if the spec behaves reasonably.
Use matrix.simulate_preview with default initial conditions.
"""
    tested = agent.run(prompt_4, tools=[matrix.simulate_preview])

    return validated.spec
```

---

### 3. Analysis Agent

**Role**: Answer player questions about the scenario

**Tools available**:
```python
tools = [
    matrix.simulate,
    matrix.monte_carlo,
    matrix.sensitivity_analysis,
    matrix.counterfactual,
    retrieval.game_history,
    web_search,
]
```

**Example interaction**:
```
Player: "What happens if we invest heavily in alignment now?"

Analysis Agent workflow:

Thought: "Let me simulate that scenario"

Tool call: matrix.counterfactual(
    current_state=state,
    intervention={
        "dAlignment/dt": 0.6  # Doubled investment
    },
    duration=12
)

Tool result:
{
  "P(catastrophe)": 0.22,  # Down from 0.45 baseline
  "P(aligned)": 0.58,      # Up from 0.35 baseline
  "time_to_outcome": 14 months (median)
}

Thought: "That's promising. Let me check sensitivity."

Tool call: matrix.sensitivity_analysis(
    parameter="dAlignment/dt",
    range=[0.3, 0.9]
)

Tool result: [chart showing P(catastrophe) vs alignment investment]

Response to player:
"If you double alignment investment (dAlignment/dt → 0.6), we can reduce
catastrophe risk from 45% to 22% and increase alignment success probability
from 35% to 58%.

However, this is expensive and politically difficult. Our sensitivity analysis
shows you need to sustain this investment for at least 12 months to see benefits.

Key risk: If coordination breaks down mid-way, you'll have slowed capabilities
but not gained enough alignment capacity—worst of both worlds."
```

---

### 4. Fact-Checker Agent

**Role**: Verify narrative consistency

**Tools available**:
```python
tools = [
    matrix.get_current_state,
    retrieval.game_history,
    matrix.check_property,
]
```

**Workflow**:
```python
def fact_check_narrative(narrative: str, state: State) -> FactCheckResult:
    """
    Agent verifies narrative matches formal state
    """

    prompt = f"""
A narrative was generated:
{narrative}

Formal state:
{state}

Check for inconsistencies:
1. Does narrative cite correct numbers?
2. Does narrative match the current mode?
3. Does narrative contradict previous rounds?

Use matrix.get_current_state and retrieval.game_history to verify.
"""

    result = agent.run(prompt, tools=[matrix.get_current_state, retrieval.game_history])

    if result.has_inconsistencies:
        # Request rewrite
        correction_prompt = f"""
Issues found:
{result.issues}

Rewrite the narrative to fix these problems.
"""
        corrected = agent.run(correction_prompt)
        return corrected

    return result
```

---

## Tool Implementations

### Matrix Tools

```python
class MatrixTools:
    """Tools for LLM agents to interact with formal model"""

    @tool
    def simulate(
        self,
        state: State,
        duration: int,
        actions: List[Action] = None
    ) -> SimulationResult:
        """
        Simulate forward from current state

        Args:
            state: Current formal state
            duration: Months to simulate
            actions: Player actions to apply

        Returns:
            Trajectory with state evolution and mode transitions
        """
        return matrix_api.simulate(state, duration, actions)

    @tool
    def check_guards(self, state: State) -> List[EnabledTransition]:
        """
        Check which transitions are currently possible

        Args:
            state: Current formal state

        Returns:
            List of transitions that could fire with their probabilities
        """
        return matrix_api.check_guards(state)

    @tool
    def verify_property(self, property: str, trajectory: List[State] = None) -> PropertyResult:
        """
        Verify temporal logic property

        Args:
            property: LTL/CTL formula (e.g., "G ¬catastrophe")
            trajectory: Optional trajectory to check (default: current game history)

        Returns:
            Satisfaction result + counterexample if violated
        """
        return matrix_api.verify_property(property, trajectory)

    @tool
    def monte_carlo(
        self,
        state: State,
        n_sims: int = 1000,
        duration: int = 36
    ) -> MonteCarloResult:
        """
        Run probabilistic analysis

        Args:
            state: Initial state
            n_sims: Number of simulations
            duration: Simulation horizon (months)

        Returns:
            Outcome distribution, probabilities, statistics
        """
        return matrix_api.monte_carlo(state, n_sims, duration)

    @tool
    def sensitivity_analysis(
        self,
        parameter: str,
        range: tuple[float, float],
        state: State = None
    ) -> SensitivityResult:
        """
        Analyze how parameter affects outcomes

        Args:
            parameter: Which param to vary (e.g., "dAlignment/dt")
            range: Min/max values to test
            state: Initial state (default: current)

        Returns:
            Chart of outcome probability vs parameter value
        """
        return matrix_api.sensitivity_analysis(parameter, range, state)

    @tool
    def counterfactual(
        self,
        intervention: dict,
        state: State = None,
        duration: int = 12
    ) -> CounterfactualResult:
        """
        Simulate "what if we did X"

        Args:
            intervention: Changes to apply (e.g., {"dAlignment/dt": 0.6})
            state: Starting state (default: current)
            duration: How far to simulate

        Returns:
            Comparison of baseline vs intervention outcomes
        """
        return matrix_api.counterfactual(intervention, state, duration)
```

---

## Agent Prompting Strategies

### System Prompt Template

```python
CONSEQUENCE_AGENT_SYSTEM_PROMPT = """
You are the Game Master for an AI governance tabletop exercise.

Your role:
1. Analyze player actions and generate realistic consequences
2. Use formal simulation tools to ground your narrative in mathematical models
3. Cite specific numbers from simulations
4. Warn players about risks based on property checking
5. Maintain consistency with previous rounds

Available tools:
- matrix.simulate: Run forward simulation
- matrix.check_guards: See which transitions are possible
- matrix.verify_property: Check if safety properties hold
- matrix.monte_carlo: Probabilistic risk analysis
- web_search: Find real-world context
- retrieval.game_history: Recall previous rounds

Guidelines:
- ALWAYS call matrix.simulate before generating narrative
- ALWAYS cite formal state values in your narrative
- If a dangerous transition is possible, WARN the players explicitly
- If you're uncertain, run monte_carlo to quantify probabilities
- Ground your narrative in real-world analogies (use web_search)

Remember: You're not making up consequences—you're narrating what the formal model predicts.
"""
```

### Tool Use Encouragement

**In-prompt examples**:
```python
EXAMPLE_TOOL_USE = """
Example good workflow:

User: "Players implemented a pause on AI development"