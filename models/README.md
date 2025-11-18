# Formal Models for AI 2027 Scenario

This directory contains multiple formal modeling approaches for the AI governance scenario. Each model offers different insights and is suited for different purposes.

## Models Overview

### 1. **Hybrid Automaton** (`hybrid_automaton.py`)
**Discrete-time hybrid system with mode switching**

**What it is:**
- Combines discrete modes (states like "pre-AGI", "racing", "crisis") with continuous variables
- Uses discrete-time difference equations for continuous evolution
- Guard conditions trigger mode transitions
- State resets at mode boundaries

**When to use:**
- Need to model discrete regime shifts (e.g., "racing" vs "coordinating" modes)
- Want formal verification of safety properties
- Analyzing tipping points and critical transitions
- Need predictable, deterministic dynamics

**Strengths:**
- Models both continuous evolution AND discrete jumps
- Clear semantics for state transitions
- Can verify invariants formally
- Good for systems with distinct operating modes

**Example output:**
```
Simulation ended: Crisis with trust collapse at t=4.2
Mode transitions:
  t=2.1: pre_agi → capability_threshold
  t=2.5: capability_threshold → racing
  t=3.8: racing → crisis
```

---

### 2. **Markov Decision Process** (`mdp_model.py`)
**Discrete states, actions, and probabilistic transitions**

**What it is:**
- States: Discrete combinations of (capability, trust, coordination, round)
- Actions: Player decisions (race, coordinate, transparency, etc.)
- Transitions: P(s' | s, a) - stochastic outcomes
- Rewards: Payoffs for hidden objectives + public score

**When to use:**
- Finding optimal strategies (via value iteration, policy iteration)
- Computing expected outcomes under uncertainty
- Analyzing Nash equilibria in multi-agent settings
- Quantifying risk vs reward tradeoffs

**Strengths:**
- Well-established theory (Bellman equations, dynamic programming)
- Can compute provably optimal policies
- Natural representation of strategic decision-making
- Handles uncertainty explicitly

**Example output:**
```
Total states: 480
Value iteration converged after 47 iterations
Optimal policy from (LOW_CAP, HIGH_TRUST, PARTIAL_COORD):
  Round 0: COORDINATE (expected value: 42.3)
```

---

### 3. **Mealy Machine** (`mealy_machine.py`)
**Finite state machine for narrative generation**

**What it is:**
- States: Game phases (lobby, early development, racing, crisis, etc.)
- Inputs: Player actions
- Outputs: Narrative text + score changes + events
- Deterministic transitions and outputs

**When to use:**
- Generating consistent, context-aware narratives
- Ensuring deterministic game responses
- Modeling reactive systems (player action → game response)
- Creating branching storylines

**Strengths:**
- Deterministic and predictable
- Easy to debug and visualize (state diagrams)
- Perfect for narrative consistency
- Output depends on (state, input) pair - very flexible

**Example output:**
```
State: CAPABILITY_RACE
Input: race (magnitude: 9.0, players: 3)
Output: "Competition intensifies. Safety protocols are cut. Trust erodes."
Score changes: {capabilities: +27, public_trust: -18}
```

---

### 4. **System Dynamics** (`system_dynamics.py`)
**Stock-and-flow model with feedback loops**

**What it is:**
- Stocks: Accumulated quantities (capabilities, trust, research)
- Flows: Rates of change (growth rates, erosion rates)
- Feedback loops: Reinforcing and balancing cycles
- Discrete-time difference equations

**When to use:**
- Understanding systemic behavior and feedback loops
- Identifying leverage points and tipping points
- Analyzing delays and accumulation effects
- Finding counterintuitive dynamics

**Strengths:**
- Explicitly models feedback loops (trust erosion, capability acceleration)
- Natural for accumulation processes
- Good for policy analysis (what interventions work?)
- Visual (stock-flow diagrams)

**Key feedback loops modeled:**
```
REINFORCING (NEGATIVE):
  Racing → Trust erosion → Harder coordination → More racing

REINFORCING (POSITIVE):
  Capabilities → Investment → Faster growth → More capabilities

BALANCING:
  High capabilities → Public alarm → Regulatory drag → Slower growth
```

---

### 5. **Agent-Based Model** (`agent_based_model.py`)
**Bottom-up simulation of strategic actors**

**What it is:**
- Individual agents with roles (CEO, regulator, journalist, researcher)
- Heterogeneous objectives and beliefs
- Local information and bounded rationality
- Emergent macro behavior from micro interactions

**When to use:**
- Studying emergent phenomena (coordination emergence, racing epidemics)
- Modeling heterogeneous actors with different goals
- Analyzing trust networks and social dynamics
- Understanding micro→macro linkages

**Strengths:**
- Captures heterogeneity (different roles, different strategies)
- Models imperfect information and learning
- Shows emergence naturally
- Realistic representation of multi-agent systems

**Example emergent behaviors:**
```
✓ Coordination EMERGED from individual decisions
⚠️ RACING EPIDEMIC occurred (4/6 agents racing simultaneously)
Trust network fragmentation: avg trust dropped from 50 → 23
```

---

## Model Comparison Matrix

| Model | Continuous Dynamics | Stochastic | Multi-Agent | Optimization | Emergence | Narrative |
|-------|-------------------|-----------|-------------|--------------|-----------|-----------|
| **Hybrid Automaton** | ✓ (discrete-time) | ✗ | ✗ | ✗ | ✗ | ✗ |
| **MDP** | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ |
| **Mealy Machine** | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| **System Dynamics** | ✓ (discrete-time) | ✗ | ✗ | ✗ | ✓ | ✗ |
| **ABM** | ✓ (emergent) | ✓ | ✓ | ✗ | ✓ | ✗ |

---

## Usage Recommendations

### For Simulacra Game Engine:

**Use Hybrid Automaton when:**
- Implementing core game loop with distinct phases
- Enforcing invariants (e.g., "can't race before capability threshold")
- Need predictable state transitions

**Use Mealy Machine for:**
- Narrative generation (converting game states → story text)
- Deterministic event responses
- Branching storylines

**Use MDP for:**
- AI opponent decision-making (compute optimal strategies)
- Difficulty tuning (make AI smarter or more realistic)
- Computing counterfactuals ("what if all players coordinated?")

**Use System Dynamics for:**
- Parameter tuning (finding realistic growth rates, decay rates)
- Understanding feedback loops in game balance
- Testing interventions (e.g., "what if transparency was more effective?")

**Use ABM for:**
- Multiplayer simulations (each player is an agent)
- Testing emergent scenarios
- Research mode (batch simulations with heterogeneous agents)

---

## Integration Architecture

### Three-Tier Proposed System:

```
┌─────────────────────────────────────────────┐
│         Frontend (React/TypeScript)         │
│  - UI, player inputs, narrative display    │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│      Game Server (Stein - TypeScript)       │
│  - XState for discrete states               │
│  - Mealy machine for narrative generation   │
│  - WebSocket/Colyseus for multiplayer       │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│    Simulation Engine (Python - via API)     │
│  - Hybrid Automaton for core dynamics       │
│  - System Dynamics for parameter evolution  │
│  - ABM for batch research simulations       │
│  - MDP for AI opponent strategies           │
└─────────────────────────────────────────────┘
```

**Why this architecture:**
- TypeScript (Stein) handles real-time multiplayer, UI state
- Python handles complex simulations, research analytics
- Clean separation: game logic vs simulation models
- Can swap simulation backends without changing game code

---

## Running the Models

Each model file is standalone and executable:

```bash
# Hybrid Automaton
python models/hybrid_automaton.py

# MDP
python models/mdp_model.py

# Mealy Machine
python models/mealy_machine.py

# System Dynamics
python models/system_dynamics.py

# Agent-Based Model
python models/agent_based_model.py
```

**Dependencies:**
```bash
pip install numpy matplotlib
```

---

## Next Steps

### Immediate (for Simulacra v1):
1. **Implement Hybrid Automaton** in TypeScript (using XState)
2. **Use Mealy Machine** for narrative generation
3. **Parameter tuning** via System Dynamics analysis

### Phase 2 (Research Tools):
1. **ABM for batch simulations** (research dashboard)
2. **MDP for AI tuning** (smart opponents)
3. **Python API** for simulation engine

### Phase 3 (Advanced):
1. Integrate all models into unified framework
2. Machine learning on ABM outputs
3. Real-time parameter adaptation

---

## References

**Hybrid Automata:**
- Henzinger, T. A. (1996). "The theory of hybrid automata"
- Alur, R., et al. (1995). "Hybrid automata: An algorithmic approach"

**MDPs:**
- Sutton & Barto (2018). "Reinforcement Learning"
- Puterman, M. (1994). "Markov Decision Processes"

**System Dynamics:**
- Sterman, J. (2000). "Business Dynamics"
- Forrester, J. W. (1961). "Industrial Dynamics"

**Agent-Based Modeling:**
- Wilensky & Rand (2015). "An Introduction to Agent-Based Modeling"
- Epstein, J. M. (1996). "Growing Artificial Societies"

**Finite State Machines:**
- Hopcroft & Ullman (1979). "Introduction to Automata Theory"
- Lee & Seshia (2017). "Introduction to Embedded Systems"
