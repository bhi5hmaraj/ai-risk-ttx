"""
Mealy Machine Model for AI 2027 Scenario

A Mealy machine is a finite state machine where:
- States: Represent game phases/modes
- Inputs: Player actions
- Outputs: Narrative events, score changes, visible consequences
- Transitions: δ(state, input) → next_state
- Output function: λ(state, input) → output

Good for: Generating consistent narratives, modeling reactive systems,
          ensuring deterministic responses to player inputs
"""

from dataclasses import dataclass
from typing import Dict, List, Tuple, Optional
from enum import Enum, auto


class GameState(Enum):
    """States in the Mealy machine"""
    LOBBY = auto()
    EARLY_DEVELOPMENT = auto()
    CAPABILITY_RACE = auto()
    COORDINATION_ATTEMPT = auto()
    TRUST_CRISIS = auto()
    SAFE_TRANSITION = auto()
    CATASTROPHE = auto()
    VICTORY = auto()


@dataclass
class Input:
    """Input alphabet - what players can do"""
    action_type: str  # "invest", "coordinate", "transparency", "safety", "race"
    magnitude: float  # How strongly (0-10)
    player_count: int  # How many players chose this
    coalition: bool = False  # Whether this was a coordinated action


@dataclass
class Output:
    """Output alphabet - what the system produces"""
    narrative: str  # Story text generated
    score_delta: Dict[str, float]  # Changes to various scores
    new_options: List[str]  # New action options unlocked
    event_triggered: Optional[str] = None  # Special event name


class MealyMachine:
    """
    Mealy machine for AI governance scenario.

    Unlike Moore machines (output depends only on state), Mealy machines
    produce output based on both state AND input transition.

    This allows context-sensitive narrative generation.
    """

    def __init__(self):
        self.current_state = GameState.LOBBY
        self.output_history: List[Output] = []

        # Track persistent context for narrative continuity
        self.context = {
            'rounds_racing': 0,
            'coordination_failures': 0,
            'transparency_history': [],
            'trust_trajectory': [],
            'capability_milestones': []
        }

    def transition_function(self, state: GameState, input: Input) -> GameState:
        """
        δ: State × Input → State

        Deterministic state transitions based on current state and input.
        """
        # LOBBY transitions
        if state == GameState.LOBBY:
            return GameState.EARLY_DEVELOPMENT

        # EARLY_DEVELOPMENT transitions
        elif state == GameState.EARLY_DEVELOPMENT:
            if input.action_type == "race" and input.player_count >= 2:
                return GameState.CAPABILITY_RACE
            elif input.action_type == "coordinate" and input.coalition:
                return GameState.COORDINATION_ATTEMPT
            else:
                return GameState.EARLY_DEVELOPMENT  # Stay in state

        # CAPABILITY_RACE transitions
        elif state == GameState.CAPABILITY_RACE:
            if input.action_type == "coordinate" and input.coalition:
                # Attempted de-escalation
                return GameState.COORDINATION_ATTEMPT
            elif input.action_type == "transparency" and input.magnitude >= 7:
                # Transparency might prevent trust crisis
                return GameState.CAPABILITY_RACE
            elif self.context['rounds_racing'] >= 3:
                # Extended racing leads to crisis
                return GameState.TRUST_CRISIS
            else:
                return GameState.CAPABILITY_RACE

        # COORDINATION_ATTEMPT transitions
        elif state == GameState.COORDINATION_ATTEMPT:
            if input.action_type == "race":
                # Defection breaks coordination
                self.context['coordination_failures'] += 1
                return GameState.CAPABILITY_RACE
            elif input.coalition and input.magnitude >= 8:
                # Strong coordinated effort succeeds
                return GameState.SAFE_TRANSITION
            else:
                # Weak coordination continues
                return GameState.COORDINATION_ATTEMPT

        # TRUST_CRISIS transitions
        elif state == GameState.TRUST_CRISIS:
            if input.action_type == "transparency" and input.player_count == input.magnitude:
                # Everyone goes transparent - might recover
                return GameState.COORDINATION_ATTEMPT
            else:
                # Crisis deepens
                return GameState.CATASTROPHE

        # Terminal states
        elif state in [GameState.CATASTROPHE, GameState.VICTORY,
                      GameState.SAFE_TRANSITION]:
            return state  # No transitions from terminal states

        return state

    def output_function(self, state: GameState, input: Input) -> Output:
        """
        λ: State × Input → Output

        Generate narrative and game effects based on state and input.
        This is where the Mealy machine shines - outputs are context-aware.
        """
        narrative = ""
        score_delta = {"public_trust": 0.0, "capabilities": 0.0, "safety": 0.0}
        new_options = []
        event_triggered = None

        # Generate context-aware narrative
        if state == GameState.EARLY_DEVELOPMENT:
            if input.action_type == "invest":
                narrative = self._generate_investment_narrative(input)
                score_delta["capabilities"] = input.magnitude * 2
            elif input.action_type == "safety":
                narrative = f"Research teams focus on alignment. Progress is slow but steady."
                score_delta["safety"] = input.magnitude * 1.5

        elif state == GameState.CAPABILITY_RACE:
            self.context['rounds_racing'] += 1

            if input.action_type == "race":
                # Narrative escalates with repeated racing
                if self.context['rounds_racing'] == 1:
                    narrative = "The capability race begins. Labs push for breakthrough."
                elif self.context['rounds_racing'] == 2:
                    narrative = "Competition intensifies. Safety protocols are cut. Trust erodes."
                else:
                    narrative = "The race is out of control. Public alarm grows."

                score_delta["capabilities"] = input.magnitude * 3
                score_delta["public_trust"] = -input.magnitude * 2

            elif input.action_type == "transparency":
                narrative = f"{input.player_count} players commit to transparency. " \
                           f"Some trust is restored, but the race continues."
                score_delta["public_trust"] = input.magnitude * 1.5
                score_delta["capabilities"] = input.magnitude * 1  # Slower growth

        elif state == GameState.COORDINATION_ATTEMPT:
            if input.coalition:
                narrative = "A coordination framework emerges. Players commit to joint oversight."
                score_delta["public_trust"] = input.magnitude * 2
                score_delta["safety"] = input.magnitude * 1.5
                new_options = ["joint_verification", "shared_safety_research"]
            else:
                narrative = "Coordination talks stall. Some players defect back to racing."
                score_delta["public_trust"] = -5

        elif state == GameState.TRUST_CRISIS:
            narrative = "PUBLIC TRUST COLLAPSES. Emergency congressional hearings. " \
                       "Regulatory intervention imminent."
            score_delta["public_trust"] = -20
            event_triggered = "regulatory_intervention"

        elif state == GameState.CATASTROPHE:
            narrative = "The worst scenario unfolds. Rushed deployment without safety guarantees. " \
                       "Systems fail in unpredictable ways. The window for coordination has closed."
            event_triggered = "game_over_bad"

        elif state == GameState.SAFE_TRANSITION:
            narrative = "Success. Coordinated safety research pays off. Deployment proceeds " \
                       "with strong oversight and public trust."
            event_triggered = "game_over_good"

        return Output(
            narrative=narrative,
            score_delta=score_delta,
            new_options=new_options,
            event_triggered=event_triggered
        )

    def _generate_investment_narrative(self, input: Input) -> str:
        """Generate context-aware narrative for investment actions"""
        magnitude = input.magnitude

        if magnitude < 3:
            return "Modest investments in AI research. Progress is incremental."
        elif magnitude < 6:
            return "Significant funding flows to AI labs. Capabilities improve steadily."
        elif magnitude < 8:
            return "Major push for AI development. Breakthroughs accelerate."
        else:
            return "Massive investment spree. Labs scale aggressively. Concerns about safety grow."

    def step(self, input: Input) -> Output:
        """
        Execute one step: compute next state and output.

        This is the core Mealy machine operation:
        1. Compute output based on (current_state, input)
        2. Transition to next state
        """
        # Generate output BEFORE state transition (key Mealy property)
        output = self.output_function(self.current_state, input)

        # Perform state transition
        next_state = self.transition_function(self.current_state, input)

        # Record
        self.output_history.append(output)
        self.current_state = next_state

        return output

    def get_state_diagram(self) -> Dict[GameState, List[Tuple[str, GameState]]]:
        """
        Generate state transition diagram for visualization.

        Returns:
            Dict mapping each state to list of (input_label, next_state) tuples
        """
        diagram = {}

        # Define typical transitions for each state
        diagram[GameState.LOBBY] = [
            ("start", GameState.EARLY_DEVELOPMENT)
        ]

        diagram[GameState.EARLY_DEVELOPMENT] = [
            ("race", GameState.CAPABILITY_RACE),
            ("coordinate", GameState.COORDINATION_ATTEMPT),
            ("invest", GameState.EARLY_DEVELOPMENT)
        ]

        diagram[GameState.CAPABILITY_RACE] = [
            ("continue_race", GameState.CAPABILITY_RACE),
            ("coordinate", GameState.COORDINATION_ATTEMPT),
            ("crisis_trigger", GameState.TRUST_CRISIS)
        ]

        diagram[GameState.COORDINATION_ATTEMPT] = [
            ("defect", GameState.CAPABILITY_RACE),
            ("strong_coord", GameState.SAFE_TRANSITION),
            ("weak_coord", GameState.COORDINATION_ATTEMPT)
        ]

        diagram[GameState.TRUST_CRISIS] = [
            ("transparency", GameState.COORDINATION_ATTEMPT),
            ("failure", GameState.CATASTROPHE)
        ]

        return diagram


if __name__ == "__main__":
    # Example simulation
    machine = MealyMachine()

    print("=== Mealy Machine Simulation ===\n")
    print(f"Initial state: {machine.current_state.name}\n")

    # Sequence of inputs (player actions)
    inputs = [
        Input("invest", magnitude=5.0, player_count=3),
        Input("invest", magnitude=7.0, player_count=3),
        Input("race", magnitude=8.0, player_count=2),  # Triggers racing state
        Input("race", magnitude=9.0, player_count=3),
        Input("race", magnitude=9.0, player_count=3),  # Third round of racing
        Input("transparency", magnitude=8.0, player_count=3),  # Attempt recovery
        Input("coordinate", magnitude=9.0, player_count=3, coalition=True),
    ]

    for i, input_action in enumerate(inputs, 1):
        print(f"--- Round {i} ---")
        print(f"Input: {input_action.action_type} (magnitude: {input_action.magnitude}, "
              f"players: {input_action.player_count})")

        output = machine.step(input_action)

        print(f"State: {machine.current_state.name}")
        print(f"Narrative: {output.narrative}")
        print(f"Score changes: {output.score_delta}")
        if output.new_options:
            print(f"New options unlocked: {output.new_options}")
        if output.event_triggered:
            print(f"⚠️  Event triggered: {output.event_triggered}")
        print()

        # Stop if terminal state reached
        if machine.current_state in [GameState.CATASTROPHE, GameState.VICTORY,
                                     GameState.SAFE_TRANSITION]:
            print(f"Terminal state reached: {machine.current_state.name}")
            break

    print("\n=== State Transition Diagram ===")
    diagram = machine.get_state_diagram()
    for state, transitions in diagram.items():
        print(f"\n{state.name}:")
        for input_label, next_state in transitions:
            print(f"  --[{input_label}]--> {next_state.name}")
