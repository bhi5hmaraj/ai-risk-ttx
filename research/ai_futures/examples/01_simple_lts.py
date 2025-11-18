#!/usr/bin/env python3
"""
Simple LTS Example: AI Development Lifecycle

Demonstrates a deterministic Labeled Transition System (LTS) for
a simplified AI development scenario.

States represent key milestones in AI development.
Transitions are labeled with actions/events.
No probabilities, no time guards - pure deterministic FSM.
"""

from transitions import Machine
from transitions.extensions import GraphMachine
import os

class AILifecycle:
    """
    Simple AI development lifecycle state machine

    States:
    - initial: Pre-development
    - research: Research phase
    - development: Active development
    - testing: Testing/validation
    - deployed: System deployed
    - scaled: At-scale deployment
    - aligned: Successfully aligned AGI
    - catastrophe: Catastrophic failure
    """

    states = [
        'initial',
        'research',
        'development',
        'testing',
        'deployed',
        'scaled',
        'aligned',
        'catastrophe'
    ]

    transitions = [
        # Normal development path
        {'trigger': 'start_research', 'source': 'initial', 'dest': 'research'},
        {'trigger': 'begin_development', 'source': 'research', 'dest': 'development'},
        {'trigger': 'start_testing', 'source': 'development', 'dest': 'testing'},

        # Testing outcomes
        {'trigger': 'tests_pass', 'source': 'testing', 'dest': 'deployed'},
        {'trigger': 'tests_fail', 'source': 'testing', 'dest': 'development'},

        # Deployment paths
        {'trigger': 'scale_up', 'source': 'deployed', 'dest': 'scaled'},
        {'trigger': 'shutdown', 'source': 'deployed', 'dest': 'initial'},

        # Terminal states
        {'trigger': 'achieve_alignment', 'source': 'scaled', 'dest': 'aligned'},
        {'trigger': 'failure_occurs', 'source': 'scaled', 'dest': 'catastrophe'},

        # Catastrophe can happen from any active state
        {'trigger': 'critical_failure', 'source': 'development', 'dest': 'catastrophe'},
        {'trigger': 'critical_failure', 'source': 'testing', 'dest': 'catastrophe'},
        {'trigger': 'critical_failure', 'source': 'deployed', 'dest': 'catastrophe'},
    ]

    def __init__(self):
        # Initialize the state machine
        self.machine = GraphMachine(
            model=self,
            states=AILifecycle.states,
            transitions=AILifecycle.transitions,
            initial='initial',
            title='AI Development Lifecycle (LTS)',
            show_conditions=False
        )

    def generate_graph(self, filename='ai_lifecycle_lts.png'):
        """Generate visualization of the state machine"""
        # Get the graph
        graph = self.machine.get_graph()

        # Customize appearance
        graph.graph_attr.update({
            'rankdir': 'LR',  # Left to right layout
            'dpi': '300',
            'bgcolor': 'white',
        })

        # Node styling
        graph.node_attr.update({
            'shape': 'circle',
            'style': 'filled',
            'fillcolor': 'lightblue',
            'fontname': 'Arial'
        })

        # Terminal states get special colors
        for node in graph.nodes():
            if node.get_name() == 'aligned':
                node.attr['fillcolor'] = 'lightgreen'
                node.attr['shape'] = 'doublecircle'
            elif node.get_name() == 'catastrophe':
                node.attr['fillcolor'] = 'salmon'
                node.attr['shape'] = 'doublecircle'
            elif node.get_name() == 'initial':
                node.attr['fillcolor'] = 'lightyellow'

        # Generate both PNG and SVG
        base = filename.rsplit('.', 1)[0]
        graph.draw(f'{base}.png', prog='dot')
        graph.draw(f'{base}.svg', prog='dot')

        print(f"Generated {base}.png and {base}.svg")
        return graph


def demonstrate_lts():
    """Demonstrate the LTS with a sample trajectory"""
    print("=" * 60)
    print("Simple LTS Example: AI Development Lifecycle")
    print("=" * 60)
    print()

    # Create the machine
    ai = AILifecycle()

    print(f"Initial state: {ai.state}")
    print()

    # Demonstrate a successful path
    print("SCENARIO 1: Successful development")
    print("-" * 40)
    trajectory = [
        ('start_research', 'Begin research phase'),
        ('begin_development', 'Start development'),
        ('start_testing', 'Enter testing'),
        ('tests_pass', 'Tests pass, deploy'),
        ('scale_up', 'Scale to production'),
        ('achieve_alignment', 'Successfully aligned!')
    ]

    for action, description in trajectory:
        getattr(ai, action)()
        print(f"  {description:30} → {ai.state}")

    print()
    print(f"Final state: {ai.state}")
    print()

    # Reset and demonstrate failure path
    ai.machine.set_state('initial')
    print("SCENARIO 2: Development failure")
    print("-" * 40)

    trajectory2 = [
        ('start_research', 'Begin research phase'),
        ('begin_development', 'Start development'),
        ('start_testing', 'Enter testing'),
        ('tests_fail', 'Tests fail, back to dev'),
        ('start_testing', 'Test again'),
        ('tests_pass', 'Tests pass, deploy'),
        ('scale_up', 'Scale to production'),
        ('failure_occurs', 'Catastrophic failure!')
    ]

    for action, description in trajectory2:
        getattr(ai, action)()
        print(f"  {description:30} → {ai.state}")

    print()
    print(f"Final state: {ai.state}")
    print()

    # Generate visualization
    print("Generating state machine diagram...")
    ai.generate_graph('ai_lifecycle_lts.png')
    print()

    # Print formal definition
    print("FORMAL DEFINITION (LTS)")
    print("-" * 40)
    print(f"States (S): {', '.join(AILifecycle.states)}")
    print(f"Initial state (s₀): initial")
    print(f"Transitions (→): {len(AILifecycle.transitions)} total")
    print("Atomic propositions (AP):")
    print("  - developing (true in: research, development, testing)")
    print("  - deployed (true in: deployed, scaled)")
    print("  - terminal (true in: aligned, catastrophe)")
    print()


if __name__ == '__main__':
    # Change to examples directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)

    demonstrate_lts()
