"""
Markov Decision Process (MDP) Model for AI 2027 Scenario

MDP formulation:
- States: Discrete game states (combinations of capability level, trust level, coordination status)
- Actions: Player decisions (invest, coordinate, transparency, etc.)
- Transitions: P(s' | s, a) - probabilistic state transitions
- Rewards: Immediate payoff for each state-action pair
- Policy: π(a | s) - strategy for action selection

Good for: Finding optimal policies, analyzing equilibria, computing expected outcomes
"""

from dataclasses import dataclass
from typing import Dict, List, Tuple, Set
from enum import Enum
import numpy as np
from collections import defaultdict


class CapabilityLevel(Enum):
    LOW = "low"  # < 40
    MEDIUM = "medium"  # 40-70
    HIGH = "high"  # 70-90
    SUPERHUMAN = "superhuman"  # > 90


class TrustLevel(Enum):
    COLLAPSED = "collapsed"  # < 30
    LOW = "low"  # 30-50
    MEDIUM = "medium"  # 50-70
    HIGH = "high"  # > 70


class CoordinationStatus(Enum):
    NONE = "none"  # < 30
    PARTIAL = "partial"  # 30-60
    STRONG = "strong"  # > 60


@dataclass(frozen=True)
class State:
    """
    Discrete state in the MDP.

    Using frozen dataclass so it can be hashed (used as dict key).
    """
    capability: CapabilityLevel
    trust: TrustLevel
    coordination: CoordinationStatus
    round: int  # Which round of the game (0-10)

    def is_terminal(self) -> bool:
        """Check if this is a terminal state"""
        return (
            self.trust == TrustLevel.COLLAPSED or
            self.capability == CapabilityLevel.SUPERHUMAN or
            self.round >= 10
        )


class Action(Enum):
    """Discrete actions available to players"""
    RACE = "race"  # Maximize capability growth
    COORDINATE = "coordinate"  # Build coordination, moderate growth
    TRANSPARENCY = "transparency"  # Increase trust, slow growth
    SAFETY_FOCUS = "safety_focus"  # Invest in safety research
    STATUS_QUO = "status_quo"  # No major changes


class AI2027MDP:
    """
    Markov Decision Process for AI governance scenario.

    Supports:
    - Computing transition probabilities
    - Defining reward functions (hidden objectives + public score)
    - Value iteration to find optimal policies
    - Policy evaluation
    """

    def __init__(self, discount_factor: float = 0.95):
        """
        Args:
            discount_factor: γ ∈ [0,1] for future reward discounting
        """
        self.gamma = discount_factor
        self.states: Set[State] = self._generate_states()
        self.actions = list(Action)

        # Cache for transition probabilities
        self._transition_cache: Dict[Tuple[State, Action], Dict[State, float]] = {}

        # Value functions (learned through value iteration)
        self.V: Dict[State, float] = defaultdict(float)  # State values
        self.Q: Dict[Tuple[State, Action], float] = defaultdict(float)  # Action values
        self.policy: Dict[State, Action] = {}  # Current policy

    def _generate_states(self) -> Set[State]:
        """Generate all possible states"""
        states = set()

        for cap in CapabilityLevel:
            for trust in TrustLevel:
                for coord in CoordinationStatus:
                    for round_num in range(11):  # 0-10
                        states.add(State(cap, trust, coord, round_num))

        return states

    def transition_probability(self, state: State, action: Action,
                               next_state: State) -> float:
        """
        P(s' | s, a) - Probability of transitioning to next_state
        when taking action from state.

        This encodes the stochastic dynamics of the scenario.
        """
        # Cache key
        cache_key = (state, action)
        if cache_key in self._transition_cache:
            return self._transition_cache[cache_key].get(next_state, 0.0)

        # Round must increment by 1
        if next_state.round != state.round + 1:
            return 0.0

        # Compute transition probabilities based on action
        prob = 0.0

        # Capability transitions
        if action == Action.RACE:
            # Racing increases capability with high probability
            if state.capability == CapabilityLevel.LOW:
                if next_state.capability == CapabilityLevel.MEDIUM:
                    prob += 0.7
                elif next_state.capability == CapabilityLevel.LOW:
                    prob += 0.3
            elif state.capability == CapabilityLevel.MEDIUM:
                if next_state.capability == CapabilityLevel.HIGH:
                    prob += 0.6
                elif next_state.capability == CapabilityLevel.MEDIUM:
                    prob += 0.4
            elif state.capability == CapabilityLevel.HIGH:
                if next_state.capability == CapabilityLevel.SUPERHUMAN:
                    prob += 0.5
                elif next_state.capability == CapabilityLevel.HIGH:
                    prob += 0.5

        elif action == Action.COORDINATE:
            # Coordination moderates capability growth
            if state.capability == CapabilityLevel.LOW:
                if next_state.capability == CapabilityLevel.MEDIUM:
                    prob += 0.4
                elif next_state.capability == CapabilityLevel.LOW:
                    prob += 0.6
            elif state.capability == CapabilityLevel.MEDIUM:
                if next_state.capability == CapabilityLevel.HIGH:
                    prob += 0.3
                elif next_state.capability == CapabilityLevel.MEDIUM:
                    prob += 0.7
            elif state.capability == CapabilityLevel.HIGH:
                if next_state.capability == CapabilityLevel.SUPERHUMAN:
                    prob += 0.2
                elif next_state.capability == CapabilityLevel.HIGH:
                    prob += 0.8

        elif action == Action.TRANSPARENCY:
            # Transparency slows growth but builds trust
            if next_state.capability == state.capability:
                prob += 0.8
            elif next_state.capability.value == list(CapabilityLevel)[
                list(CapabilityLevel).index(state.capability) + 1
            ].value:
                prob += 0.2

        # Trust transitions (depends on action and current coordination)
        trust_delta = 0.0
        if action == Action.RACE:
            trust_delta = -1  # Racing erodes trust
        elif action == Action.TRANSPARENCY:
            trust_delta = +1  # Transparency builds trust
        elif action == Action.COORDINATE and state.coordination == CoordinationStatus.STRONG:
            trust_delta = +0.5  # Coordination helps if already coordinating

        # Apply trust transition logic
        # (simplified - full implementation would be more complex)

        # Coordination transitions
        coord_delta = 0
        if action == Action.COORDINATE:
            coord_delta = +1
        elif action == Action.RACE:
            coord_delta = -1

        # Cache result
        if cache_key not in self._transition_cache:
            self._transition_cache[cache_key] = {}
        self._transition_cache[cache_key][next_state] = max(0, min(1, prob))

        return prob

    def reward(self, state: State, action: Action, player_role: str = "tech_ceo") -> float:
        """
        R(s, a) - Immediate reward for taking action in state.

        Different roles have different reward functions (hidden objectives).
        """
        reward = 0.0

        # Public score component (shared by all)
        if state.trust == TrustLevel.COLLAPSED:
            reward -= 50  # Major penalty for trust collapse

        if state.trust == TrustLevel.HIGH:
            reward += 10  # Bonus for high trust

        # Role-specific hidden objectives
        if player_role == "tech_ceo":
            # CEO wants capability growth
            if state.capability == CapabilityLevel.SUPERHUMAN:
                reward += 30
            elif state.capability == CapabilityLevel.HIGH:
                reward += 15

            # Slight penalty for coordination (slows growth)
            if action == Action.COORDINATE:
                reward -= 5

        elif player_role == "regulator":
            # Regulator wants safety and coordination
            if state.coordination == CoordinationStatus.STRONG:
                reward += 20

            if action == Action.SAFETY_FOCUS:
                reward += 10

            # Penalty for racing
            if action == Action.RACE:
                reward -= 15

        elif player_role == "journalist":
            # Journalist wants transparency and trust
            if state.trust == TrustLevel.HIGH:
                reward += 20

            if action == Action.TRANSPARENCY:
                reward += 15

        # Terminal state rewards
        if state.is_terminal():
            if state.trust != TrustLevel.COLLAPSED and \
               state.capability == CapabilityLevel.SUPERHUMAN:
                reward += 100  # Safe transition achieved

        return reward

    def value_iteration(self, theta: float = 0.01, max_iterations: int = 1000) -> None:
        """
        Value iteration algorithm to compute optimal value function.

        Iteratively updates V(s) until convergence:
        V(s) = max_a Σ_{s'} P(s'|s,a)[R(s,a) + γV(s')]
        """
        for iteration in range(max_iterations):
            delta = 0

            for state in self.states:
                if state.is_terminal():
                    continue

                v = self.V[state]

                # Bellman optimality update
                action_values = []
                for action in self.actions:
                    q_value = 0
                    for next_state in self.states:
                        prob = self.transition_probability(state, action, next_state)
                        if prob > 0:
                            reward = self.reward(state, action)
                            q_value += prob * (reward + self.gamma * self.V[next_state])

                    action_values.append((action, q_value))

                # Update V(s) to max over actions
                best_action, best_value = max(action_values, key=lambda x: x[1])
                self.V[state] = best_value
                self.policy[state] = best_action

                # Track convergence
                delta = max(delta, abs(v - self.V[state]))

            if delta < theta:
                print(f"Value iteration converged after {iteration + 1} iterations")
                break

    def get_optimal_action(self, state: State) -> Action:
        """Get optimal action for state according to learned policy"""
        return self.policy.get(state, Action.STATUS_QUO)

    def simulate_episode(self, initial_state: State, max_steps: int = 10) -> List[Tuple[State, Action, float]]:
        """
        Simulate one episode following the learned policy.

        Returns:
            List of (state, action, reward) tuples
        """
        trajectory = []
        state = initial_state

        for step in range(max_steps):
            if state.is_terminal():
                break

            action = self.get_optimal_action(state)
            reward = self.reward(state, action)
            trajectory.append((state, action, reward))

            # Sample next state according to transition probabilities
            next_states = []
            probs = []
            for next_state in self.states:
                prob = self.transition_probability(state, action, next_state)
                if prob > 0:
                    next_states.append(next_state)
                    probs.append(prob)

            if next_states:
                # Normalize probabilities
                probs = np.array(probs)
                probs = probs / probs.sum()
                state = np.random.choice(next_states, p=probs)
            else:
                break

        return trajectory


if __name__ == "__main__":
    # Example usage
    mdp = AI2027MDP(discount_factor=0.95)

    print(f"Total states: {len(mdp.states)}")
    print(f"Total actions: {len(mdp.actions)}")

    # Learn optimal policy
    print("\nRunning value iteration...")
    mdp.value_iteration(theta=0.01, max_iterations=100)

    # Test simulation
    initial_state = State(
        capability=CapabilityLevel.LOW,
        trust=TrustLevel.HIGH,
        coordination=CoordinationStatus.PARTIAL,
        round=0
    )

    print(f"\nSimulating episode from initial state: {initial_state}")
    trajectory = mdp.simulate_episode(initial_state, max_steps=10)

    print("\nEpisode trajectory:")
    total_reward = 0
    for state, action, reward in trajectory:
        print(f"Round {state.round}: {action.value} (reward: {reward:.1f})")
        total_reward += reward

    print(f"\nTotal episode reward: {total_reward:.1f}")
