# Matrix Adapters: Pluggable Simulation Engines

**Purpose**: Provide a unified interface for different modeling formalisms, allowing seamless comparison and switching between approaches.

**Philosophy**: "Write once, run with any formalism" - same scenario, different mathematical foundations.

---

## Architecture

### Canonical Contract

All adapters implement the same interface, making them **interchangeable**:

```python
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import numpy as np

@dataclass
class State:
    """Simulation state at a point in time"""
    tick: int
    mode: str
    continuous: Dict[str, float]  # {compute: 26.0, alignment: 0.15, trust: 0.7}
    discrete: Dict[str, Any]      # {evidence_count: 2, regime: "competitive"}
    agents: Optional[List[Dict]] = None  # Agent states (for ABM)

@dataclass
class Action:
    """Player/policy action"""
    actor: str
    action_type: str
    parameters: Dict[str, Any]

@dataclass
class Transition:
    """Mode transition"""
    from_mode: str
    to_mode: str
    guard_satisfied: bool
    probability: Optional[float] = None  # For stochastic
    reset: Optional[Dict[str, float]] = None

@dataclass
class Trajectory:
    """Complete simulation run"""
    states: List[State]
    transitions: List[Transition]
    metrics: Dict[str, Any]  # {time_to_catastrophe: 45, final_alignment: 0.8}

@dataclass
class GraphResponse:
    """Model structure"""
    nodes: List[Dict]  # Modes
    edges: List[Dict]  # Transitions
    variables: Dict[str, Dict]  # Variable metadata

class ModelAdapter(ABC):
    """Base class for all adapters"""

    @abstractmethod
    def get_graph(self) -> GraphResponse:
        """Return model structure (modes, transitions, variables)"""
        pass

    @abstractmethod
    def step(self, state: State, action: Optional[Action] = None) -> State:
        """
        Advance simulation by one discrete time step (Δt)

        Returns:
            New state after Δt time has elapsed
        """
        pass

    @abstractmethod
    def simulate(
        self,
        initial: State,
        horizon: int,
        actions: Optional[List[Action]] = None
    ) -> Trajectory:
        """
        Run full trajectory from initial state for horizon steps

        Args:
            initial: Starting state
            horizon: Number of time steps
            actions: Optional pre-planned actions (for policy evaluation)

        Returns:
            Complete trajectory with all states and transitions
        """
        pass

    # Optional methods (not all formalisms need these)

    def evolve(
        self,
        mode: str,
        state: State,
        duration: float
    ) -> State:
        """
        Continuous evolution within a mode (for HA/SHA)

        Integrates ODEs: dx/dt = f(x, mode)
        Used by HybridAutomatonAdapter, not by discrete-only adapters
        """
        raise NotImplementedError("This adapter doesn't support continuous evolution")

    def check_guards(self, mode: str, state: State) -> List[Transition]:
        """
        Find all enabled transitions from current mode

        Used by HA/SHA to detect mode switches
        """
        return []

    def get_mode_invariant(self, mode: str) -> Optional[str]:
        """
        Return invariant condition for a mode (if any)

        Example: "trust >= 0.3"
        """
        return None

    # Utility methods (provided by base class)

    def monte_carlo(
        self,
        initial: State,
        horizon: int,
        num_runs: int = 1000,
        seed: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Run Monte Carlo simulation

        Returns:
            Statistics: mean, std, percentiles, distributions
        """
        np.random.seed(seed)
        trajectories = []

        for _ in range(num_runs):
            traj = self.simulate(initial, horizon)
            trajectories.append(traj)

        return self._aggregate_trajectories(trajectories)

    def _aggregate_trajectories(self, trajectories: List[Trajectory]) -> Dict:
        """Compute statistics across Monte Carlo runs"""
        # Implementation omitted for brevity
        pass
```

---

## Adapters

### 1. SystemDynamicsAdapter

**Formalism**: Discrete-time difference equations (stock-flow)

**When to use**:
- Macro-level aggregate dynamics
- Feedback loops and delays
- Communication to non-technical audiences
- Fast prototyping

**Implementation**:

```python
class SystemDynamicsAdapter(ModelAdapter):
    """
    System Dynamics: stocks + flows + feedback loops

    State update: x[t+1] = x[t] + Δt * flow(x[t])

    Example:
        compute[t+1] = compute[t] + Δt * (investment - depreciation)
        trust[t+1] = trust[t] + Δt * (evidence_effect - decay)
    """

    def __init__(self, dt: float = 1.0):
        """
        Args:
            dt: Time step (in months for AI-2027, e.g., 1 month)
        """
        self.dt = dt
        self.stocks: Dict[str, float] = {}
        self.flows: Dict[str, callable] = {}
        self.feedback_loops: List[str] = []

    def add_stock(self, name: str, initial: float):
        """Add stock variable"""
        self.stocks[name] = initial

    def add_flow(self, name: str, equation: callable):
        """
        Add flow equation

        Example:
            adapter.add_flow(
                "compute_growth",
                lambda state: 0.15 * state.continuous["compute"]
            )
        """
        self.flows[name] = equation

    def step(self, state: State, action: Optional[Action] = None) -> State:
        """
        Euler integration: x[t+1] = x[t] + Δt * f(x[t])
        """
        new_continuous = state.continuous.copy()

        for stock_name in self.stocks:
            # Compute net flow
            net_flow = 0.0
            for flow_name, flow_func in self.flows.items():
                if stock_name in flow_name:  # Simple matching
                    net_flow += flow_func(state)

            # Update stock
            new_continuous[stock_name] += self.dt * net_flow

        # Apply action effects (if any)
        if action:
            new_continuous = self._apply_action_effects(new_continuous, action)

        return State(
            tick=state.tick + 1,
            mode=state.mode,  # SD typically single-mode
            continuous=new_continuous,
            discrete=state.discrete
        )

    def simulate(self, initial: State, horizon: int, actions=None) -> Trajectory:
        """Run SD simulation for horizon steps"""
        states = [initial]
        current = initial

        for t in range(horizon):
            action = actions[t] if actions else None
            current = self.step(current, action)
            states.append(current)

        return Trajectory(
            states=states,
            transitions=[],  # No mode transitions in pure SD
            metrics=self._compute_metrics(states)
        )

    def get_graph(self) -> GraphResponse:
        """Return stock-flow diagram"""
        # Convert stocks/flows to graph format
        nodes = [{"id": name, "type": "stock"} for name in self.stocks]
        edges = [{"from": "flow", "to": stock} for stock in self.stocks]

        return GraphResponse(nodes=nodes, edges=edges, variables=self.stocks)
```

**Example usage**:

```python
# AI-2027 SD model
adapter = SystemDynamicsAdapter(dt=1.0)  # 1 month steps

adapter.add_stock("compute", initial=26.0)
adapter.add_stock("alignment", initial=0.15)
adapter.add_stock("trust", initial=0.70)

adapter.add_flow("compute_growth", lambda s: 0.15 * s.continuous["compute"])
adapter.add_flow("alignment_progress", lambda s: 0.05 * (1 - s.continuous["alignment"]))
adapter.add_flow("trust_decay", lambda s: -0.02 * s.continuous["trust"])

initial = State(tick=0, mode="baseline", continuous={"compute": 26.0, ...}, discrete={})
trajectory = adapter.simulate(initial, horizon=120)  # 10 years
```

---

### 2. HybridAutomatonAdapter

**Formalism**: Modes + continuous dynamics + guards + resets

**When to use**:
- Critical regime changes (baseline → race → crisis)
- Combining continuous evolution with discrete jumps
- Verification-friendly abstractions
- Medium complexity (3-10 modes)

**Implementation**:

```python
class HybridAutomatonAdapter(ModelAdapter):
    """
    Hybrid Automaton: (Q, X, Init, Flow, Inv, E, Guard, Reset)

    Q = finite modes
    X = continuous variables
    Flow(q) = dx/dt = f(x, q) for each mode
    Guard(e) = condition for transition e
    Reset(e) = x' = r(x) after transition
    """

    def __init__(self, dt: float = 1.0, integration_method: str = "euler"):
        self.dt = dt
        self.integration_method = integration_method

        self.modes: Dict[str, Mode] = {}
        self.transitions: List[HATransition] = []

    def add_mode(
        self,
        name: str,
        flow: callable,
        invariant: Optional[callable] = None
    ):
        """
        Add mode with continuous dynamics

        Args:
            name: Mode identifier
            flow: Function computing dx/dt = f(x, mode)
            invariant: Optional condition that must hold in this mode
        """
        self.modes[name] = Mode(name, flow, invariant)

    def add_transition(
        self,
        from_mode: str,
        to_mode: str,
        guard: callable,
        reset: Optional[callable] = None,
        priority: int = 0
    ):
        """
        Add transition between modes

        Args:
            guard: Boolean function guard(state) -> bool
            reset: Optional x' = reset(x) after transition
            priority: Higher priority transitions checked first
        """
        self.transitions.append(HATransition(
            from_mode, to_mode, guard, reset, priority
        ))

    def step(self, state: State, action: Optional[Action] = None) -> State:
        """
        HA step:
        1. Evolve continuous vars in current mode for Δt
        2. Check guards (any transitions enabled?)
        3. If yes, take transition (apply reset, change mode)
        4. If no, stay in current mode
        """
        # 1. Continuous evolution
        mode_obj = self.modes[state.mode]
        new_state = self.evolve(state.mode, state, self.dt)

        # Apply action effects
        if action:
            new_state = self._apply_action_effects(new_state, action)

        # 2. Check guards
        enabled = self.check_guards(state.mode, new_state)

        # 3. Take transition (if any enabled)
        if enabled:
            transition = enabled[0]  # Take highest priority
            new_state.mode = transition.to_mode

            if transition.reset:
                new_state.continuous = transition.reset(new_state.continuous)

        new_state.tick = state.tick + 1
        return new_state

    def evolve(self, mode: str, state: State, duration: float) -> State:
        """
        Integrate ODEs for duration in given mode

        Uses scipy.integrate.solve_ivp or simple Euler
        """
        mode_obj = self.modes[mode]
        x0 = np.array([state.continuous[v] for v in sorted(state.continuous)])

        if self.integration_method == "euler":
            # Simple Euler: x[t+dt] = x[t] + dt * f(x[t])
            dx_dt = mode_obj.flow(state)
            x_new = x0 + duration * np.array([dx_dt[v] for v in sorted(dx_dt)])
        else:
            # Use scipy for higher accuracy
            from scipy.integrate import solve_ivp

            def ode_func(t, x):
                temp_state = state.copy()
                temp_state.continuous = dict(zip(sorted(state.continuous), x))
                dx = mode_obj.flow(temp_state)
                return np.array([dx[v] for v in sorted(dx)])

            sol = solve_ivp(ode_func, [0, duration], x0, method='RK45')
            x_new = sol.y[:, -1]

        new_continuous = dict(zip(sorted(state.continuous), x_new))

        return State(
            tick=state.tick,
            mode=mode,
            continuous=new_continuous,
            discrete=state.discrete
        )

    def check_guards(self, mode: str, state: State) -> List[Transition]:
        """Find all enabled transitions from current mode"""
        enabled = []

        for trans in sorted(self.transitions, key=lambda t: -t.priority):
            if trans.from_mode == mode and trans.guard(state):
                enabled.append(trans)

        return enabled

    def simulate(self, initial: State, horizon: int, actions=None) -> Trajectory:
        """Run HA simulation with mode tracking"""
        states = [initial]
        transitions = []
        current = initial

        for t in range(horizon):
            action = actions[t] if actions else None
            prev_mode = current.mode
            current = self.step(current, action)

            # Track mode transitions
            if current.mode != prev_mode:
                transitions.append(Transition(
                    from_mode=prev_mode,
                    to_mode=current.mode,
                    guard_satisfied=True
                ))

            states.append(current)

        return Trajectory(
            states=states,
            transitions=transitions,
            metrics=self._compute_metrics(states)
        )
```

**Example: AI-2027 HA**

```python
adapter = HybridAutomatonAdapter(dt=1.0)

# Modes
adapter.add_mode(
    "baseline",
    flow=lambda s: {
        "compute": 0.10 * s.continuous["compute"],
        "alignment": 0.05 * (1 - s.continuous["alignment"]),
        "trust": -0.01 * s.continuous["trust"]
    }
)

adapter.add_mode(
    "race",
    flow=lambda s: {
        "compute": 0.20 * s.continuous["compute"],  # Faster growth
        "alignment": 0.02 * (1 - s.continuous["alignment"]),  # Slower progress
        "trust": -0.05 * s.continuous["trust"]  # Faster decay
    }
)

adapter.add_mode(
    "catastrophe",
    flow=lambda s: {"compute": 0, "alignment": 0, "trust": 0}  # Absorbing
)

# Transitions
adapter.add_transition(
    from_mode="baseline",
    to_mode="race",
    guard=lambda s: s.continuous["compute"] > 26.5 and s.discrete["evidence"] < 3
)

adapter.add_transition(
    from_mode="race",
    to_mode="catastrophe",
    guard=lambda s: s.continuous["alignment"] < 0.2 and s.continuous["compute"] > 28
)

# Simulate
initial = State(
    tick=0,
    mode="baseline",
    continuous={"compute": 26.0, "alignment": 0.15, "trust": 0.7},
    discrete={"evidence": 0}
)

traj = adapter.simulate(initial, horizon=120)
print(f"Mode transitions: {len(traj.transitions)}")
print(f"Final mode: {traj.states[-1].mode}")
```

---

### 3. StochasticHAAdapter

**Formalism**: Hybrid Automaton + probabilistic transitions

**When to use**:
- Uncertainty in regime changes
- Risk assessment (P(catastrophe), expected time)
- Monte Carlo required (many runs)

**Key differences from HA**:

```python
class StochasticHAAdapter(HybridAutomatonAdapter):
    """
    SHA: HA + probabilistic transitions

    Transitions now have probabilities:
        Guard satisfied → transition with probability p
    """

    def add_stochastic_transition(
        self,
        from_mode: str,
        to_mode: str,
        guard: callable,
        probability: float,  # NEW: P(transition | guard)
        reset: Optional[callable] = None
    ):
        """Probabilistic transition"""
        self.transitions.append(StochasticTransition(
            from_mode, to_mode, guard, probability, reset
        ))

    def check_guards(self, mode: str, state: State) -> List[Transition]:
        """
        Check guards and sample stochastic transitions
        """
        enabled = []

        for trans in self.transitions:
            if trans.from_mode == mode and trans.guard(state):
                # Sample: does transition fire?
                if np.random.rand() < trans.probability:
                    enabled.append(trans)

        return enabled
```

**Example: Stochastic AI race**

```python
adapter = StochasticHAAdapter(dt=1.0)

# Race → Pause (probabilistic breakthrough)
adapter.add_stochastic_transition(
    from_mode="race",
    to_mode="pause",
    guard=lambda s: s.continuous["alignment"] > 0.5,
    probability=0.1  # 10% chance per month if alignment high
)

# Race → Catastrophe (probabilistic failure)
adapter.add_stochastic_transition(
    from_mode="race",
    to_mode="catastrophe",
    guard=lambda s: s.continuous["trust"] < 0.3,
    probability=0.05  # 5% chance per month if trust low
)

# Monte Carlo
results = adapter.monte_carlo(initial, horizon=120, num_runs=1000)
print(f"P(catastrophe) = {results['catastrophe_prob']:.2%}")
print(f"E[time to catastrophe | catastrophe] = {results['mean_catastrophe_time']:.1f} months")
```

---

### 4. ABMAdapter

**Formalism**: Agent-Based Model (heterogeneous agents)

**When to use**:
- Micro-level heterogeneity matters
- Emergent macro behavior
- Distributional outcomes (not just means)
- Strategic interactions

**Implementation sketch**:

```python
class ABMAdapter(ModelAdapter):
    """
    Agent-Based Model: heterogeneous agents + local interactions

    Agents:
        - State: individual attributes
        - Behavior: decision rules (potentially stochastic)
        - Interactions: network, spatial, market

    Macro state emerges from micro behavior
    """

    def __init__(self, num_agents: int, agent_class: type):
        self.num_agents = num_agents
        self.agent_class = agent_class
        self.agents: List[Agent] = []

        # Initialize agents
        for i in range(num_agents):
            self.agents.append(agent_class(id=i))

    def step(self, state: State, action: Optional[Action] = None) -> State:
        """
        ABM step:
        1. Each agent observes environment
        2. Each agent decides action
        3. Update agent states
        4. Aggregate to macro state
        """
        # 1-2. Agent decisions (potentially parallel)
        for agent in self.agents:
            agent.observe(state)
            agent.decide()

        # 3. Update
        for agent in self.agents:
            agent.update()

        # 4. Aggregate
        new_continuous = self._aggregate_to_macro(self.agents)

        return State(
            tick=state.tick + 1,
            mode=self._infer_mode(self.agents),  # Mode from agent patterns
            continuous=new_continuous,
            discrete=state.discrete,
            agents=[a.to_dict() for a in self.agents]
        )

    def _aggregate_to_macro(self, agents: List) -> Dict[str, float]:
        """
        Compute macro variables from agent states

        Example:
            compute = sum(agent.compute for agent in agents)
            trust = mean(agent.trust for agent in agents)
        """
        return {
            "compute": sum(a.compute for a in agents),
            "alignment": np.mean([a.alignment for a in agents]),
            "trust": np.mean([a.trust_in_others for a in agents])
        }

    def _infer_mode(self, agents: List) -> str:
        """
        Infer macro mode from agent states

        Example:
            If >50% agents in "racing" strategy → mode = "race"
        """
        racing_count = sum(1 for a in agents if a.strategy == "race")
        if racing_count > len(agents) * 0.5:
            return "race"
        return "baseline"
```

**Example: AI lab agents**

```python
class AILabAgent:
    def __init__(self, id: int):
        self.id = id
        self.compute = np.random.uniform(25, 27)
        self.alignment_belief = np.random.uniform(0.1, 0.3)
        self.strategy = "cautious"  # or "racing"

    def observe(self, state: State):
        self.global_compute = state.continuous["compute"]
        self.global_trust = state.continuous["trust"]

    def decide(self):
        # Strategic decision: race or cooperate?
        if self.global_trust < 0.5 and self.compute < self.global_compute * 0.8:
            self.strategy = "racing"  # Behind and low trust → race
        else:
            self.strategy = "cautious"

    def update(self):
        if self.strategy == "racing":
            self.compute *= 1.15  # Grow fast
            self.alignment_belief *= 0.95  # Neglect safety
        else:
            self.compute *= 1.05
            self.alignment_belief *= 1.05

adapter = ABMAdapter(num_agents=20, agent_class=AILabAgent)
traj = adapter.simulate(initial, horizon=120)

# Analyze distribution
final_agents = traj.states[-1].agents
print(f"Agent strategies: {Counter(a['strategy'] for a in final_agents)}")
print(f"Compute Gini: {compute_gini([a['compute'] for a in final_agents])}")
```

---

### 5. Other Adapters (Future)

**KripkeAdapter**: Pure discrete, model checking
**MDPAdapter**: Markov Decision Process, optimal policies
**DEVSAdapter**: Discrete-event, large systems-of-systems
**PetriNetAdapter**: Concurrent processes, resource constraints

---

## Adapter Comparison

| Feature | SD | HA | SHA | ABM |
|---------|----|----|-----|-----|
| **Continuous dynamics** | ✓ | ✓ | ✓ | △ (emergent) |
| **Discrete modes** | △ | ✓ | ✓ | △ (inferred) |
| **Stochastic** | △ | ✗ | ✓ | ✓ |
| **Heterogeneity** | ✗ | ✗ | ✗ | ✓ |
| **Verification** | ✗ | △ | ✗ | ✗ |
| **Speed** | Fast | Medium | Medium | Slow |
| **Communication** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

**Guidelines**:
- Start with SD (fastest, most communicable)
- Upgrade to HA if modes matter
- Use SHA for risk quantification
- Use ABM when heterogeneity drives outcomes

---

## Testing Adapters

Every adapter must pass the **Adapter Test Suite**:

```python
def test_adapter_contract(adapter: ModelAdapter):
    """Validate adapter implements contract correctly"""

    # 1. get_graph() returns valid structure
    graph = adapter.get_graph()
    assert len(graph.nodes) > 0
    assert len(graph.variables) > 0

    # 2. step() advances state
    initial = create_test_state()
    next_state = adapter.step(initial)
    assert next_state.tick == initial.tick + 1

    # 3. simulate() produces trajectory
    traj = adapter.simulate(initial, horizon=10)
    assert len(traj.states) == 11  # initial + 10 steps

    # 4. Determinism (if applicable)
    traj2 = adapter.simulate(initial, horizon=10)
    if not adapter.is_stochastic():
        assert traj.states[-1] == traj2.states[-1]

    # 5. Monte Carlo works
    results = adapter.monte_carlo(initial, horizon=10, num_runs=100)
    assert "mean" in results
    assert "std" in results

def test_cross_adapter_consistency():
    """Validate different adapters produce similar results on same scenario"""

    sd_adapter = create_sd_adapter()
    ha_adapter = create_ha_adapter()

    initial = create_test_state()

    sd_traj = sd_adapter.simulate(initial, horizon=100)
    ha_traj = ha_adapter.simulate(initial, horizon=100)

    # Should reach similar outcomes (within 20%)
    sd_final_compute = sd_traj.states[-1].continuous["compute"]
    ha_final_compute = ha_traj.states[-1].continuous["compute"]

    relative_diff = abs(sd_final_compute - ha_final_compute) / sd_final_compute
    assert relative_diff < 0.20, "SD and HA should produce similar macro outcomes"
```

---

## Integration with The Architect

The Architect UI lets users:
1. Choose adapter from dropdown
2. Configure adapter-specific parameters
3. Switch adapters (preserving state where possible)
4. Compare side-by-side

**Adapter switching example**:

```typescript
// The Architect frontend
function switchAdapter(from: "SD", to: "HA", currentState: State) {
  // Preserve what can be preserved
  const preservedState = {
    tick: currentState.tick,
    continuous: currentState.continuous,  // ✓ Same continuous vars
    discrete: currentState.discrete,
    mode: inferMode(currentState)  // HA needs mode, SD doesn't have it
  };

  // Create new adapter
  const haAdapter = new HybridAutomatonAdapter(dt=1.0);

  // Continue simulation from current state
  const trajectory = haAdapter.simulate(preservedState, horizon=100);
}
```

---

## Related Documentation

- [../README.md](../README.md) - Matrix overview
- [../the_architect/README.md](../the_architect/README.md) - Power user interface
- [../views/README.md](../views/README.md) - View system
- [../../simulacra_integration/evals/](../../simulacra_integration/evals/) - Formalism comparison

---

**Status**: Design complete → Implementation starting

**Next**: Implement SystemDynamicsAdapter and HybridAutomatonAdapter in Python, deploy first version of Matrix API.
