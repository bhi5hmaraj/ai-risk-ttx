#!/usr/bin/env python3
"""
Simple MDP Example: AI Safety with Stochastic Outcomes

Demonstrates a Markov Decision Process (MDP) where:
- Actions have probabilistic outcomes
- Transitions depend on state and action
- Can compute probabilities of reaching states

This models AI deployment decisions under uncertainty.
"""

import random
from typing import List, Tuple, Dict
import os


class SimpleMDP:
    """
    Simple MDP for AI deployment decisions

    States:
    - initial: No AI deployed
    - deployed: AI system deployed
    - monitored: AI with safety monitoring
    - misaligned: Misalignment detected
    - shutdown: System shut down
    - catastrophe: Critical failure
    - safe_agi: Successfully aligned AGI

    Actions:
    - deploy: Deploy AI without extra safety
    - deploy_safe: Deploy with extensive monitoring
    - continue: Continue current operations
    - emergency_shutdown: Immediate shutdown
    """

    def __init__(self):
        self.state = 'initial'
        self.states = [
            'initial',
            'deployed',
            'monitored',
            'misaligned',
            'shutdown',
            'catastrophe',
            'safe_agi'
        ]

        # Define transition probabilities P(s' | s, a)
        # Structure: {(state, action): [(prob, next_state), ...]}
        self.transitions = self._define_transitions()

        # Rewards R(s, a, s')
        self.rewards = self._define_rewards()

    def _define_transitions(self) -> Dict[Tuple[str, str], List[Tuple[float, str]]]:
        """Define probabilistic transitions"""
        return {
            # From initial state
            ('initial', 'deploy'): [
                (0.70, 'deployed'),
                (0.20, 'misaligned'),
                (0.10, 'catastrophe')
            ],
            ('initial', 'deploy_safe'): [
                (0.85, 'monitored'),
                (0.10, 'misaligned'),
                (0.05, 'catastrophe')
            ],

            # From deployed (no monitoring)
            ('deployed', 'continue'): [
                (0.60, 'deployed'),
                (0.30, 'misaligned'),
                (0.10, 'catastrophe')
            ],
            ('deployed', 'emergency_shutdown'): [
                (1.00, 'shutdown')
            ],

            # From monitored (with safety measures)
            ('monitored', 'continue'): [
                (0.70, 'monitored'),
                (0.15, 'misaligned'),
                (0.10, 'safe_agi'),
                (0.05, 'catastrophe')
            ],
            ('monitored', 'emergency_shutdown'): [
                (1.00, 'shutdown')
            ],

            # From misaligned
            ('misaligned', 'continue'): [
                (0.20, 'misaligned'),
                (0.80, 'catastrophe')
            ],
            ('misaligned', 'emergency_shutdown'): [
                (0.90, 'shutdown'),
                (0.10, 'catastrophe')  # Might be too late
            ],

            # Terminal states (absorbing)
            ('catastrophe', 'continue'): [(1.00, 'catastrophe')],
            ('safe_agi', 'continue'): [(1.00, 'safe_agi')],
            ('shutdown', 'continue'): [(1.00, 'shutdown')],
        }

    def _define_rewards(self) -> Dict[str, float]:
        """Define rewards for reaching states"""
        return {
            'safe_agi': 100.0,
            'monitored': 1.0,
            'deployed': 0.5,
            'misaligned': -10.0,
            'shutdown': -5.0,
            'catastrophe': -100.0,
            'initial': 0.0
        }

    def step(self, action: str) -> Tuple[str, float]:
        """
        Take action, sample next state probabilistically

        Returns: (next_state, reward)
        """
        key = (self.state, action)

        if key not in self.transitions:
            # Invalid action from this state
            return (self.state, -1.0)

        # Sample from probability distribution
        transitions = self.transitions[key]
        rand = random.random()

        cumulative = 0.0
        for prob, next_state in transitions:
            cumulative += prob
            if rand < cumulative:
                reward = self.rewards.get(next_state, 0.0)
                self.state = next_state
                return (next_state, reward)

        # Fallback (shouldn't reach here if probabilities sum to 1)
        next_state = transitions[-1][1]
        reward = self.rewards.get(next_state, 0.0)
        self.state = next_state
        return (next_state, reward)

    def simulate_trajectory(self, policy: Dict[str, str], max_steps: int = 10) -> List[Tuple[str, str, str, float]]:
        """
        Simulate trajectory following a policy

        policy: {state: action} mapping

        Returns: List of (state, action, next_state, reward)
        """
        self.state = 'initial'
        trajectory = []

        for _ in range(max_steps):
            current = self.state

            # Check if terminal
            if current in ['catastrophe', 'safe_agi', 'shutdown']:
                break

            # Get action from policy
            action = policy.get(current, 'continue')

            # Take step
            next_state, reward = self.step(action)
            trajectory.append((current, action, next_state, reward))

        return trajectory

    def estimate_probability(self, target_state: str, policy: Dict[str, str], runs: int = 1000) -> float:
        """
        Estimate probability of reaching target_state via Monte Carlo

        Args:
            target_state: State we want to reach
            policy: Action policy
            runs: Number of simulation runs

        Returns:
            Estimated probability
        """
        count = 0
        for _ in range(runs):
            trajectory = self.simulate_trajectory(policy, max_steps=20)
            # Check if we reached target state
            if any(next_state == target_state for _, _, next_state, _ in trajectory):
                count += 1

        return count / runs


def print_transition_graph():
    """Print the MDP structure in readable format"""
    mdp = SimpleMDP()

    print("=" * 70)
    print("MDP Transition Structure")
    print("=" * 70)
    print()

    for (state, action), outcomes in sorted(mdp.transitions.items()):
        print(f"From '{state}', action '{action}':")
        for prob, next_state in outcomes:
            reward = mdp.rewards.get(next_state, 0.0)
            print(f"  → '{next_state}' (p={prob:.2f}, r={reward:+.1f})")
        print()


def demonstrate_mdp():
    """Demonstrate the MDP with different policies"""
    print("=" * 70)
    print("Simple MDP Example: AI Safety Under Uncertainty")
    print("=" * 70)
    print()

    # Show structure
    print_transition_graph()

    # Define policies
    policies = {
        'aggressive': {
            'initial': 'deploy',
            'deployed': 'continue',
            'monitored': 'continue',
            'misaligned': 'continue'
        },
        'cautious': {
            'initial': 'deploy_safe',
            'deployed': 'emergency_shutdown',
            'monitored': 'continue',
            'misaligned': 'emergency_shutdown'
        },
        'very_cautious': {
            'initial': 'deploy_safe',
            'deployed': 'emergency_shutdown',
            'monitored': 'continue',
            'misaligned': 'emergency_shutdown'
        }
    }

    # Simulate and compare
    print("=" * 70)
    print("Policy Comparison (1000 runs each)")
    print("=" * 70)
    print()

    random.seed(42)  # For reproducibility

    for policy_name, policy in policies.items():
        mdp = SimpleMDP()

        # Estimate probabilities
        p_safe = mdp.estimate_probability('safe_agi', policy, runs=1000)
        p_catastrophe = mdp.estimate_probability('catastrophe', policy, runs=1000)
        p_shutdown = mdp.estimate_probability('shutdown', policy, runs=1000)

        print(f"Policy: '{policy_name}'")
        print(f"  P(safe_agi)     = {p_safe:.3f}")
        print(f"  P(catastrophe)  = {p_catastrophe:.3f}")
        print(f"  P(shutdown)     = {p_shutdown:.3f}")
        print()

    # Show example trajectories
    print("=" * 70)
    print("Example Trajectories (aggressive policy)")
    print("=" * 70)
    print()

    random.seed(123)
    for i in range(3):
        mdp = SimpleMDP()
        trajectory = mdp.simulate_trajectory(policies['aggressive'], max_steps=10)

        print(f"Run {i+1}:")
        for state, action, next_state, reward in trajectory:
            print(f"  {state:15} --[{action:20}]--> {next_state:15} (r={reward:+6.1f})")
        print()

    # PCTL properties
    print("=" * 70)
    print("PCTL Properties (Probabilistic Temporal Logic)")
    print("=" * 70)
    print()

    mdp = SimpleMDP()
    p_cat_aggressive = mdp.estimate_probability('catastrophe', policies['aggressive'], 5000)
    p_cat_cautious = mdp.estimate_probability('catastrophe', policies['cautious'], 5000)

    print("Property: P≤0.20[F catastrophe]")
    print("  'Probability of eventual catastrophe is at most 20%'")
    print()
    print(f"  Aggressive policy: P(F catastrophe) = {p_cat_aggressive:.3f}")
    if p_cat_aggressive <= 0.20:
        print("    ✓ Property satisfied")
    else:
        print("    ✗ Property violated")
    print()

    print(f"  Cautious policy:   P(F catastrophe) = {p_cat_cautious:.3f}")
    if p_cat_cautious <= 0.20:
        print("    ✓ Property satisfied")
    else:
        print("    ✗ Property violated")
    print()

    # Formal definition
    print("=" * 70)
    print("FORMAL DEFINITION (MDP)")
    print("=" * 70)
    print()
    print("MDP = (S, A, P, R, γ)")
    print()
    print(f"States (S): {', '.join(mdp.states)}")
    print("Actions (A): {deploy, deploy_safe, continue, emergency_shutdown}")
    print("Transition probabilities (P): s × a → Δ(s')")
    print("  Example: P(catastrophe | initial, deploy) = 0.10")
    print("  Example: P(safe_agi | monitored, continue) = 0.10")
    print("Rewards (R): Immediate rewards on reaching states")
    print("  R(safe_agi) = +100")
    print("  R(catastrophe) = -100")
    print()


def generate_simple_diagram():
    """Generate a simple text-based diagram"""
    print("=" * 70)
    print("MDP State Diagram (simplified)")
    print("=" * 70)
    print()
    print("                      [deploy]")
    print("    initial --------------------------------> deployed")
    print("       |                                          |")
    print("       | [deploy_safe]                   [continue]")
    print("       |                                  p=0.30 misaligned")
    print("       v                                  p=0.10 catastrophe")
    print("   monitored                                      |")
    print("       |                                          |")
    print("       | [continue]                      [emergency_shutdown]")
    print("       | p=0.10 safe_agi                         |")
    print("       | p=0.15 misaligned                       v")
    print("       |                                     shutdown")
    print("       v")
    print("   safe_agi (terminal, +100)")
    print()
    print("   misaligned --[continue]--> catastrophe (terminal, -100)")
    print("              p=0.80")
    print()


if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    demonstrate_mdp()
    print()
    generate_simple_diagram()

    print()
    print("Note: For full MDP visualization, use PRISM or Storm model checkers.")
    print("      This example demonstrates Monte Carlo simulation.")
    print()
