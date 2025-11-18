#!/usr/bin/env python3
"""
Time-Indexed Model Example: AI Race with Deadlines

Demonstrates a time-indexed state machine where:
- State = (world_state, time)
- Transitions have time guards (allowed time windows)
- Time is discrete (quarters from 2024-Q1)

This models an AI race scenario with regulatory deadlines and windows of opportunity.
"""

from transitions import Machine
from transitions.extensions import GraphMachine
import os


class TimeIndexedAIRace:
    """
    AI race scenario with temporal constraints

    Time model: Discrete quarters from 2024-Q1 (t=0) to 2028-Q4 (t=20)

    States represent world scenarios:
    - initial: Pre-AI era
    - deployed: AI systems deployed
    - racing: Uncoordinated race
    - regulated: Government regulation imposed
    - aligned: Successful coordination
    - catastrophe: Misalignment disaster

    Time constraints:
    - Deployment must happen before t=8 (2026-Q1)
    - Regulation window is t=8 to t=16 (2026-2028)
    - Race can only start after deployment (t>=4)
    """

    # World states (W in formal model)
    states = [
        {'name': 'initial', 'on_enter': 'log_state'},
        {'name': 'deployed', 'on_enter': 'log_state'},
        {'name': 'racing', 'on_enter': 'log_state'},
        {'name': 'regulated', 'on_enter': 'log_state'},
        {'name': 'aligned', 'on_enter': 'log_state'},
        {'name': 'catastrophe', 'on_enter': 'log_state'},
    ]

    def __init__(self):
        self.time = 0  # Current quarter (0 = 2024-Q1)
        self.history = []

        # Create base machine
        self.machine = GraphMachine(
            model=self,
            states=TimeIndexedAIRace.states,
            initial='initial',
            title='AI Race with Time Constraints',
            show_conditions=True
        )

        # Add transitions with time guards
        self._add_time_guarded_transitions()

    def _add_time_guarded_transitions(self):
        """Define transitions with time constraints"""

        # Deployment (must happen before t=8)
        self.machine.add_transition(
            trigger='deploy_ai',
            source='initial',
            dest='deployed',
            conditions=['_before_deployment_deadline'],
            after='_advance_time'
        )

        # Race starts (can happen after deployment, before t=16)
        self.machine.add_transition(
            trigger='start_race',
            source='deployed',
            dest='racing',
            conditions=['_in_race_window'],
            after='_advance_time'
        )

        # Regulation (window t=8 to t=16)
        self.machine.add_transition(
            trigger='impose_regulation',
            source='deployed',
            dest='regulated',
            conditions=['_in_regulation_window'],
            after='_advance_time'
        )

        self.machine.add_transition(
            trigger='impose_regulation',
            source='racing',
            dest='regulated',
            conditions=['_in_regulation_window'],
            after='_advance_time'
        )

        # Alignment (from regulated state)
        self.machine.add_transition(
            trigger='achieve_coordination',
            source='regulated',
            dest='aligned',
            after='_advance_time'
        )

        # Catastrophe (from racing, after t=12)
        self.machine.add_transition(
            trigger='catastrophic_failure',
            source='racing',
            dest='catastrophe',
            conditions=['_late_stage'],
            after='_advance_time'
        )

    # Time guard conditions
    def _before_deployment_deadline(self):
        """Deployment allowed before 2026-Q1 (t=8)"""
        return self.time < 8

    def _in_race_window(self):
        """Race can start from t=4 to t=16"""
        return 4 <= self.time < 16

    def _in_regulation_window(self):
        """Regulation window: 2026-2028 (t=8 to t=16)"""
        return 8 <= self.time <= 16

    def _late_stage(self):
        """Late stage (after 2027-Q1, t=12)"""
        return self.time >= 12

    def _advance_time(self):
        """Advance time by 1 quarter"""
        self.time += 1

    def log_state(self):
        """Log state transitions"""
        quarter = self.time % 4 + 1
        year = 2024 + self.time // 4
        self.history.append((self.state, self.time, f"{year}-Q{quarter}"))

    def get_quarter_label(self):
        """Get human-readable quarter label"""
        quarter = self.time % 4 + 1
        year = 2024 + self.time // 4
        return f"{year}-Q{quarter}"

    def generate_graph(self, filename='ai_race_time_indexed.png'):
        """Generate visualization showing time constraints"""
        graph = self.machine.get_graph()

        # Customize appearance
        graph.graph_attr.update({
            'rankdir': 'TB',
            'dpi': '300',
            'bgcolor': 'white',
            'label': 'Time-Indexed AI Race\\n(State = world × time)',
            'labelloc': 't',
            'fontsize': '16'
        })

        # Node styling
        graph.node_attr.update({
            'shape': 'box',
            'style': 'rounded,filled',
            'fillcolor': 'lightblue',
            'fontname': 'Arial'
        })

        # Terminal states
        for node in graph.nodes():
            if node.get_name() == 'aligned':
                node.attr['fillcolor'] = 'lightgreen'
                node.attr['peripheries'] = '2'
            elif node.get_name() == 'catastrophe':
                node.attr['fillcolor'] = 'salmon'
                node.attr['peripheries'] = '2'
            elif node.get_name() == 'initial':
                node.attr['fillcolor'] = 'lightyellow'

        # Generate outputs
        base = filename.rsplit('.', 1)[0]
        graph.draw(f'{base}.png', prog='dot')
        graph.draw(f'{base}.svg', prog='dot')

        print(f"Generated {base}.png and {base}.svg")
        return graph


def demonstrate_time_indexed():
    """Demonstrate time-indexed model with scenarios"""
    print("=" * 60)
    print("Time-Indexed Model: AI Race with Deadlines")
    print("=" * 60)
    print()

    # SCENARIO 1: Successful regulation
    print("SCENARIO 1: Early deployment, timely regulation")
    print("-" * 60)
    ai = TimeIndexedAIRace()

    print(f"t={ai.time:2d} ({ai.get_quarter_label()}): {ai.state}")

    # Fast-forward to deployment time
    ai.time = 4  # 2025-Q1
    print(f"t={ai.time:2d} ({ai.get_quarter_label()}): {ai.state} (time passes...)")

    # Deploy
    ai.deploy_ai()
    print(f"t={ai.time:2d} ({ai.get_quarter_label()}): {ai.state} ← deploy_ai()")

    # Fast-forward to regulation window
    ai.time = 10  # 2026-Q3
    ai.state = 'deployed'  # Reset for demo
    print(f"t={ai.time:2d} ({ai.get_quarter_label()}): {ai.state} (time passes...)")

    # Regulate
    ai.impose_regulation()
    print(f"t={ai.time:2d} ({ai.get_quarter_label()}): {ai.state} ← impose_regulation()")

    # Achieve alignment
    ai.achieve_coordination()
    print(f"t={ai.time:2d} ({ai.get_quarter_label()}): {ai.state} ← achieve_coordination()")
    print()

    # SCENARIO 2: Missed deadline
    print("SCENARIO 2: Missed deployment deadline")
    print("-" * 60)
    ai2 = TimeIndexedAIRace()

    ai2.time = 9  # 2026-Q2 (past deadline!)
    print(f"t={ai2.time:2d} ({ai2.get_quarter_label()}): {ai2.state}")

    # Try to deploy (should fail - past deadline)
    try:
        ai2.deploy_ai()
        print("  ✗ deploy_ai() FAILED - past deadline (t >= 8)")
    except:
        print("  ✗ deploy_ai() FAILED - past deadline (t >= 8)")

    print()

    # SCENARIO 3: Race to catastrophe
    print("SCENARIO 3: Unregulated race leads to catastrophe")
    print("-" * 60)
    ai3 = TimeIndexedAIRace()

    ai3.time = 5
    ai3.state = 'deployed'
    print(f"t={ai3.time:2d} ({ai3.get_quarter_label()}): {ai3.state}")

    # Race starts
    ai3.start_race()
    print(f"t={ai3.time:2d} ({ai3.get_quarter_label()}): {ai3.state} ← start_race()")

    # Time passes...
    ai3.time = 13
    ai3.state = 'racing'
    print(f"t={ai3.time:2d} ({ai3.get_quarter_label()}): {ai3.state} (time passes...)")

    # Catastrophe
    ai3.catastrophic_failure()
    print(f"t={ai3.time:2d} ({ai3.get_quarter_label()}): {ai3.state} ← catastrophic_failure()")
    print()

    # Generate visualization
    print("Generating state machine diagram...")
    ai.generate_graph('ai_race_time_indexed.png')
    print()

    # Print formal definition
    print("FORMAL DEFINITION (Time-Indexed Kripke)")
    print("-" * 60)
    print("State: s = (w, t) where w ∈ W, t ∈ {0,1,...,20}")
    print(f"World states (W): {', '.join([s['name'] for s in TimeIndexedAIRace.states])}")
    print(f"Time domain (T): {{0,1,...,20}} (2024-Q1 to 2028-Q4)")
    print()
    print("Time guards:")
    print("  deploy_ai: t < 8 (before 2026-Q1)")
    print("  start_race: 4 ≤ t < 16 (2025-2028)")
    print("  impose_regulation: 8 ≤ t ≤ 16 (2026-2028)")
    print("  catastrophic_failure: t ≥ 12 (after 2027-Q1)")
    print()
    print("Properties we can check:")
    print("  - Safety: G_{t<16} ¬catastrophe")
    print("  - Deadline: F_{t≤8} deployed")
    print("  - Response: G (racing → F_{t≤4} regulated)")
    print()


if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    demonstrate_time_indexed()
