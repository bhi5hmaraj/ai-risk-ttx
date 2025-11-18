"""
Agent-Based Model (ABM) for AI 2027 Scenario

Agent-Based Modeling:
- Individual agents with local information and strategies
- Emergent behavior from agent interactions
- Heterogeneous agents (different roles, objectives, beliefs)
- Network effects and spatial structure

Good for: Studying emergence, analyzing equilibria, understanding micro→macro dynamics

Libraries: Mesa (Python ABM framework), but we'll use a lightweight implementation
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set, Tuple
from enum import Enum
import numpy as np
import random


class Role(Enum):
    """Agent roles with different objectives"""
    TECH_CEO = "tech_ceo"
    REGULATOR = "regulator"
    JOURNALIST = "journalist"
    RESEARCHER = "researcher"


class Strategy(Enum):
    """Strategic stances agents can take"""
    RACE = "race"  # Maximize capability growth
    COORDINATE = "coordinate"  # Build cooperation
    DEFECT = "defect"  # Break from coordination
    WAIT_AND_SEE = "wait"  # Observe others first


@dataclass
class Agent:
    """
    Individual strategic actor in the AI governance scenario.

    Agents have:
    - Local beliefs about the world
    - Hidden objectives
    - Bounded rationality
    - Learning from experience
    """
    id: int
    role: Role
    strategy: Strategy = Strategy.WAIT_AND_SEE

    # Internal state
    belief_capability: float = 20.0  # What they think capabilities are
    belief_coordination: float = 40.0  # What they think coordination level is
    trust_in_others: Dict[int, float] = field(default_factory=dict)  # Trust in other agents

    # Objectives (hidden from other players)
    hidden_objective: str = "maximize_capability"  # or "maximize_safety", "maximize_transparency"
    risk_aversion: float = 0.5  # [0,1] where 1 is very risk averse

    # Learning parameters
    memory: List[Dict] = field(default_factory=list)  # Past observations
    learning_rate: float = 0.1

    def perceive(self, world_state: Dict, other_agents: List['Agent']) -> None:
        """
        Update beliefs based on observations.

        Agents have IMPERFECT INFORMATION - they observe noisy signals.
        """
        true_capability = world_state['capabilities']
        true_coordination = world_state['coordination']

        # Noisy observation (agents don't have perfect info)
        noise_level = 5.0
        self.belief_capability = true_capability + np.random.normal(0, noise_level)
        self.belief_coordination = true_coordination + np.random.normal(0, noise_level)

        # Observe other agents' actions (but not their objectives)
        for other in other_agents:
            if other.id == self.id:
                continue

            # Update trust based on observed behavior
            if other.id not in self.trust_in_others:
                self.trust_in_others[other.id] = 50.0

            # Trust evolves based on consistency
            if other.strategy == Strategy.COORDINATE:
                self.trust_in_others[other.id] += 2.0
            elif other.strategy == Strategy.DEFECT:
                self.trust_in_others[other.id] -= 10.0  # Defection hurts trust a lot
            elif other.strategy == Strategy.RACE:
                self.trust_in_others[other.id] -= 1.0

            # Clip trust [0, 100]
            self.trust_in_others[other.id] = np.clip(self.trust_in_others[other.id], 0, 100)

    def decide_strategy(self, world_state: Dict, other_agents: List['Agent']) -> Strategy:
        """
        Decide strategy based on beliefs, objectives, and trust.

        This implements BOUNDED RATIONAL decision-making:
        - Agents use heuristics, not perfect optimization
        - Different roles have different decision rules
        - Trust in others affects cooperation
        """
        # Calculate average trust in others
        if self.trust_in_others:
            avg_trust = np.mean(list(self.trust_in_others.values()))
        else:
            avg_trust = 50.0

        # Role-based decision making
        if self.role == Role.TECH_CEO:
            return self._ceo_strategy(avg_trust, world_state, other_agents)
        elif self.role == Role.REGULATOR:
            return self._regulator_strategy(avg_trust, world_state)
        elif self.role == Role.JOURNALIST:
            return self._journalist_strategy(avg_trust, world_state)
        elif self.role == Role.RESEARCHER:
            return self._researcher_strategy(avg_trust, world_state)

        return Strategy.WAIT_AND_SEE

    def _ceo_strategy(self, avg_trust: float, world_state: Dict, others: List['Agent']) -> Strategy:
        """Tech CEO decision heuristic"""
        # CEOs want capability growth (hidden objective)
        # But also respond to competitive pressure

        # Count how many others are racing
        racing_count = sum(1 for a in others if a.strategy == Strategy.RACE)

        # If others are racing, strong pressure to race too (competitive dynamics)
        if racing_count >= 2:
            return Strategy.RACE

        # If capabilities are low and trust is high, might coordinate
        if self.belief_capability < 50 and avg_trust > 60:
            return Strategy.COORDINATE

        # If capabilities are high, race to finish line
        if self.belief_capability > 70:
            return Strategy.RACE

        # Default: keep racing moderately
        return Strategy.RACE if np.random.rand() > 0.3 else Strategy.WAIT_AND_SEE

    def _regulator_strategy(self, avg_trust: float, world_state: Dict) -> Strategy:
        """Regulator decision heuristic"""
        # Regulators prioritize safety and coordination
        public_trust = world_state.get('public_trust', 70)

        # If trust is low, push for transparency and coordination
        if public_trust < 40:
            return Strategy.COORDINATE

        # If capabilities growing too fast without safety, intervene
        safety = world_state.get('safety_research', 30)
        if self.belief_capability > 60 and safety < 40:
            return Strategy.COORDINATE

        # If coordination is high, maintain it
        if self.belief_coordination > 60:
            return Strategy.COORDINATE

        return Strategy.COORDINATE  # Regulators default to coordination

    def _journalist_strategy(self, avg_trust: float, world_state: Dict) -> Strategy:
        """Journalist decision heuristic"""
        # Journalists want transparency
        public_trust = world_state.get('public_trust', 70)

        # If trust is low, push for transparency (coordination)
        if public_trust < 50:
            return Strategy.COORDINATE

        # If see signs of racing without transparency, oppose
        if avg_trust < 40:
            return Strategy.COORDINATE

        return Strategy.COORDINATE

    def _researcher_strategy(self, avg_trust: float, world_state: Dict) -> Strategy:
        """Researcher decision heuristic"""
        # Researchers balance progress with safety

        # If capabilities outpacing safety, slow down
        safety = world_state.get('safety_research', 30)
        if self.belief_capability - safety > 40:
            return Strategy.COORDINATE

        # If others defecting, might race to stay relevant
        if avg_trust < 30:
            return Strategy.RACE

        # Prefer coordination if possible
        return Strategy.COORDINATE if avg_trust > 50 else Strategy.RACE

    def act(self) -> Dict:
        """
        Convert strategy to concrete action.

        Returns action that affects world state.
        """
        action = {
            'investment': 0.0,
            'transparency': 0.0,
            'safety': 0.0,
            'coordinate_signal': False
        }

        if self.strategy == Strategy.RACE:
            action['investment'] = 8.0 if self.role == Role.TECH_CEO else 5.0
            action['transparency'] = 1.0
            action['safety'] = 2.0

        elif self.strategy == Strategy.COORDINATE:
            action['investment'] = 4.0
            action['transparency'] = 7.0
            action['safety'] = 6.0
            action['coordinate_signal'] = True

        elif self.strategy == Strategy.DEFECT:
            action['investment'] = 9.0
            action['transparency'] = 0.0
            action['safety'] = 1.0

        elif self.strategy == Strategy.WAIT_AND_SEE:
            action['investment'] = 3.0
            action['transparency'] = 4.0
            action['safety'] = 3.0

        return action


class ABMSimulation:
    """
    Agent-Based Model simulation environment.

    Manages:
    - Multiple heterogeneous agents
    - World state evolution
    - Agent interactions (network)
    - Emergent outcomes
    """

    def __init__(self, num_agents: int = 6):
        """Initialize simulation with agents"""
        self.agents: List[Agent] = []
        self.time = 0

        # Create heterogeneous agents
        roles = [Role.TECH_CEO, Role.TECH_CEO, Role.REGULATOR,
                Role.JOURNALIST, Role.RESEARCHER, Role.RESEARCHER]

        for i in range(min(num_agents, len(roles))):
            agent = Agent(
                id=i,
                role=roles[i],
                risk_aversion=np.random.uniform(0.3, 0.8)
            )
            self.agents.append(agent)

        # World state (global variables)
        self.world_state = {
            'capabilities': 20.0,
            'public_trust': 70.0,
            'coordination': 40.0,
            'safety_research': 30.0
        }

        # History
        self.history = []

    def step(self) -> Dict:
        """
        Execute one time step of ABM simulation.

        1. Agents perceive world
        2. Agents decide strategies
        3. Agents act
        4. World state updates (aggregate of actions)
        5. Record results
        """
        # Phase 1: Perception
        for agent in self.agents:
            agent.perceive(self.world_state, self.agents)

        # Phase 2: Decision
        for agent in self.agents:
            agent.strategy = agent.decide_strategy(self.world_state, self.agents)

        # Phase 3: Action
        actions = [agent.act() for agent in self.agents]

        # Phase 4: Update world state (aggregate agent actions)
        total_investment = sum(a['investment'] for a in actions)
        total_transparency = sum(a['transparency'] for a in actions)
        total_safety = sum(a['safety'] for a in actions)
        coordinating = sum(1 for a in actions if a['coordinate_signal'])

        # Capability growth (affected by aggregate investment)
        cap_growth = 0.05 * total_investment * self.world_state['capabilities'] / 100
        self.world_state['capabilities'] = min(100, self.world_state['capabilities'] + cap_growth)

        # Trust dynamics
        racing_count = sum(1 for agent in self.agents if agent.strategy == Strategy.RACE)
        trust_delta = total_transparency * 0.5 - racing_count * 2.0
        self.world_state['public_trust'] = np.clip(self.world_state['public_trust'] + trust_delta, 0, 100)

        # Coordination (emergent from agent decisions)
        if coordinating >= len(self.agents) * 0.5:  # Majority coordinating
            self.world_state['coordination'] = min(100, self.world_state['coordination'] + 3.0)
        else:
            self.world_state['coordination'] = max(0, self.world_state['coordination'] - 2.0)

        # Safety research
        self.world_state['safety_research'] = min(100,
                                                  self.world_state['safety_research'] + total_safety * 0.3)

        # Record history
        step_result = {
            'time': self.time,
            'world_state': self.world_state.copy(),
            'agent_strategies': {agent.id: agent.strategy for agent in self.agents},
            'trust_network': {agent.id: agent.trust_in_others.copy() for agent in self.agents}
        }
        self.history.append(step_result)

        self.time += 1

        return step_result

    def run(self, num_steps: int = 20) -> List[Dict]:
        """Run simulation for specified number of steps"""
        print(f"=== ABM Simulation: {len(self.agents)} agents ===\n")

        for step in range(num_steps):
            result = self.step()

            # Print summary
            print(f"Step {self.time}:")
            print(f"  Capabilities: {self.world_state['capabilities']:.1f}")
            print(f"  Public Trust: {self.world_state['public_trust']:.1f}")
            print(f"  Coordination: {self.world_state['coordination']:.1f}")

            # Print agent strategies
            strategies = {}
            for agent in self.agents:
                if agent.strategy not in strategies:
                    strategies[agent.strategy] = []
                strategies[agent.strategy].append(agent.role.value)

            print("  Agent strategies:")
            for strategy, roles in strategies.items():
                print(f"    {strategy.value}: {', '.join(roles)}")
            print()

            # Check for terminal conditions
            if self.world_state['public_trust'] < 20:
                print("⚠️  TRUST COLLAPSE - Simulation ended")
                break

            if self.world_state['capabilities'] > 95:
                print("✓ SUPERHUMAN CAPABILITIES REACHED")
                if self.world_state['safety_research'] > 70 and self.world_state['coordination'] > 60:
                    print("✓ SAFE TRANSITION ACHIEVED!")
                else:
                    print("⚠️  UNSAFE TRANSITION - Insufficient safety/coordination")
                break

        return self.history

    def analyze_emergence(self):
        """Analyze emergent patterns from agent interactions"""
        print("\n=== Emergence Analysis ===")

        # Did coordination emerge?
        final_coord = self.world_state['coordination']
        if final_coord > 60:
            print("✓ Coordination EMERGED from individual decisions")
        else:
            print("✗ Coordination FAILED to emerge")

        # Racing dynamics
        racing_count_over_time = []
        for step_data in self.history:
            racing = sum(1 for s in step_data['agent_strategies'].values()
                        if s == Strategy.RACE)
            racing_count_over_time.append(racing)

        if any(count >= 4 for count in racing_count_over_time):
            print("⚠️  RACING EPIDEMIC occurred (most agents racing simultaneously)")

        # Trust network analysis
        final_trust = self.history[-1]['trust_network']
        avg_trust_by_agent = {
            agent_id: np.mean(list(trust_dict.values())) if trust_dict else 50
            for agent_id, trust_dict in final_trust.items()
        }

        print(f"\nFinal trust levels:")
        for agent in self.agents:
            avg = avg_trust_by_agent.get(agent.id, 50)
            print(f"  Agent {agent.id} ({agent.role.value}): {avg:.1f}")


if __name__ == "__main__":
    # Run ABM simulation
    sim = ABMSimulation(num_agents=6)
    history = sim.run(num_steps=15)
    sim.analyze_emergence()
