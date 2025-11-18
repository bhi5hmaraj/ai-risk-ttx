"""
Discrete-Time Hybrid Automaton for AI 2027 Scenario

A hybrid automaton combines:
- Discrete modes (states): e.g., "pre-AGI", "racing", "coordinating", "crisis"
- Continuous variables: capabilities, trust, coordination level
- Discrete-time difference equations for continuous evolution
- Guard conditions for mode transitions
"""

from dataclasses import dataclass
from typing import Dict, List, Callable, Optional, Tuple
from enum import Enum
import numpy as np


class Mode(Enum):
    """Discrete modes in the AI development trajectory"""
    PRE_AGI = "pre_agi"
    CAPABILITY_THRESHOLD = "capability_threshold"
    RACING = "racing"
    COORDINATING = "coordinating"
    CRISIS = "crisis"
    SAFE_TRANSITION = "safe_transition"


@dataclass
class ContinuousState:
    """Continuous variables that evolve over discrete time steps"""
    capabilities: float  # AI capability level [0, 100]
    public_trust: float  # Public trust in institutions [0, 100]
    coordination: float  # Level of international coordination [0, 100]
    investment: float  # R&D investment rate [0, 100]
    safety_research: float  # Safety research investment [0, 100]

    def copy(self) -> 'ContinuousState':
        return ContinuousState(
            self.capabilities,
            self.public_trust,
            self.coordination,
            self.investment,
            self.safety_research
        )


@dataclass
class PlayerAction:
    """Actions that players can take"""
    increase_investment: float = 0.0  # [-10, 10]
    transparency: float = 0.0  # [0, 10]
    safety_focus: float = 0.0  # [0, 10]
    coordinate_attempt: bool = False
    race_decision: bool = False


class DiscreteTimeHybridAutomaton:
    """
    Hybrid automaton with discrete-time dynamics.

    At each time step t:
    1. Check guard conditions for mode transitions
    2. If guard true, perform discrete jump (mode change + state reset)
    3. Apply flow (discrete-time difference equations)
    4. Check invariants
    """

    def __init__(self, dt: float = 0.1):
        """
        Args:
            dt: Time step for discrete-time evolution (in years)
        """
        self.dt = dt
        self.mode = Mode.PRE_AGI
        self.state = ContinuousState(
            capabilities=20.0,
            public_trust=70.0,
            coordination=40.0,
            investment=50.0,
            safety_research=30.0
        )
        self.time = 0.0
        self.history = []

    def flow(self, state: ContinuousState, mode: Mode,
             actions: List[PlayerAction]) -> ContinuousState:
        """
        Discrete-time difference equations for continuous evolution.

        These are the dynamics WITHIN each mode, updated each time step.
        Format: x[t+1] = f(x[t], u[t])
        """
        next_state = state.copy()

        # Aggregate player actions
        total_investment = sum(a.increase_investment for a in actions)
        total_transparency = sum(a.transparency for a in actions)
        total_safety = sum(a.safety_focus for a in actions)
        racing_count = sum(1 for a in actions if a.race_decision)

        # Capability growth (logistic with investment)
        if mode == Mode.PRE_AGI:
            # Slower growth pre-threshold
            growth_rate = 0.05 * (1 + total_investment / 100)
            next_state.capabilities = state.capabilities + growth_rate * state.capabilities * \
                                     (1 - state.capabilities / 100)

        elif mode == Mode.RACING:
            # Accelerated growth when racing
            growth_rate = 0.15 * (1 + total_investment / 50)
            next_state.capabilities = min(100, state.capabilities +
                                         growth_rate * state.capabilities)

        elif mode == Mode.COORDINATING:
            # Controlled growth with coordination
            growth_rate = 0.08 * (1 + total_investment / 100)
            next_state.capabilities = state.capabilities + growth_rate * state.capabilities * \
                                     (1 - state.capabilities / 120)  # Higher carrying capacity

        elif mode == Mode.CRISIS:
            # Unpredictable jumps in crisis
            growth_rate = 0.20
            next_state.capabilities = min(100, state.capabilities +
                                         growth_rate * state.capabilities +
                                         np.random.normal(0, 5))

        # Trust dynamics (difference equation with decay and transparency boost)
        if mode == Mode.RACING:
            # Trust erodes when racing
            trust_decay = -2.0 - (racing_count * 0.5)
            transparency_boost = total_transparency * 0.3
            next_state.public_trust = max(0, state.public_trust + trust_decay + transparency_boost)

        elif mode == Mode.COORDINATING:
            # Trust grows with coordination
            trust_growth = 1.0 + (total_transparency * 0.2)
            next_state.public_trust = min(100, state.public_trust + trust_growth)

        elif mode == Mode.CRISIS:
            # Rapid trust collapse
            next_state.public_trust = max(0, state.public_trust - 5.0)

        else:
            # Slow natural decay
            next_state.public_trust = max(0, state.public_trust - 0.5)

        # Coordination dynamics
        coord_attempts = sum(1 for a in actions if a.coordinate_attempt)
        if coord_attempts >= len(actions) * 0.5:  # Majority attempting coordination
            next_state.coordination = min(100, state.coordination + 3.0)
        elif mode == Mode.RACING:
            next_state.coordination = max(0, state.coordination - 2.0)
        else:
            next_state.coordination = state.coordination  # No change

        # Safety research accumulation
        next_state.safety_research = min(100, state.safety_research + total_safety * 0.5)

        # Investment inertia (slow changes)
        next_state.investment = state.investment + total_investment * 0.1
        next_state.investment = np.clip(next_state.investment, 0, 100)

        return next_state

    def guards(self, state: ContinuousState, mode: Mode,
               actions: List[PlayerAction]) -> List[Tuple[Mode, bool]]:
        """
        Guard conditions for discrete mode transitions.

        Returns list of (target_mode, condition_met) tuples.
        Priority matters - first satisfied guard wins.
        """
        guards = []

        # Crisis conditions (highest priority)
        if state.public_trust < 20 and state.capabilities > 70:
            guards.append((Mode.CRISIS, True))

        # Capability threshold reached
        if mode == Mode.PRE_AGI and state.capabilities > 60:
            guards.append((Mode.CAPABILITY_THRESHOLD, True))

        # Decision point: race vs coordinate
        if mode == Mode.CAPABILITY_THRESHOLD:
            racing_votes = sum(1 for a in actions if a.race_decision)
            coord_votes = sum(1 for a in actions if a.coordinate_attempt)

            if racing_votes > coord_votes:
                guards.append((Mode.RACING, True))
            elif coord_votes > racing_votes:
                guards.append((Mode.COORDINATING, True))

        # Racing can transition to crisis or coordination
        if mode == Mode.RACING:
            if state.coordination > 70 and state.safety_research > 60:
                guards.append((Mode.COORDINATING, True))

        # Safe transition achieved
        if mode == Mode.COORDINATING and state.capabilities > 90 and \
           state.safety_research > 80 and state.public_trust > 60:
            guards.append((Mode.SAFE_TRANSITION, True))

        return guards

    def reset(self, state: ContinuousState, from_mode: Mode,
              to_mode: Mode) -> ContinuousState:
        """
        State reset/jump when transitioning between modes.

        Some transitions cause discontinuous jumps in continuous variables.
        """
        next_state = state.copy()

        if to_mode == Mode.CRISIS:
            # Crisis causes immediate trust collapse
            next_state.public_trust = min(state.public_trust, 30.0)
            next_state.coordination = min(state.coordination, 20.0)

        elif to_mode == Mode.RACING:
            # Racing locks in higher investment
            next_state.investment = max(state.investment, 70.0)

        elif to_mode == Mode.COORDINATING:
            # Coordination moderates investment
            next_state.investment = np.clip(state.investment, 30.0, 60.0)
            # Boost to trust from coordination decision
            next_state.public_trust = min(100, state.public_trust + 10.0)

        return next_state

    def invariants(self, state: ContinuousState, mode: Mode) -> bool:
        """
        Invariant conditions that must hold within each mode.
        If violated, system is in error state.
        """
        # Basic bounds check
        if not (0 <= state.capabilities <= 100):
            return False
        if not (0 <= state.public_trust <= 100):
            return False
        if not (0 <= state.coordination <= 100):
            return False

        # Mode-specific invariants
        if mode == Mode.PRE_AGI and state.capabilities >= 65:
            # Should have transitioned already
            return False

        if mode == Mode.SAFE_TRANSITION and state.public_trust < 50:
            # Safe transition requires maintained trust
            return False

        return True

    def step(self, actions: List[PlayerAction]) -> Dict:
        """
        Execute one discrete time step of the hybrid automaton.

        Returns:
            Dict with current state, mode, and transition info
        """
        # 1. Check guard conditions for mode transitions
        candidate_transitions = self.guards(self.state, self.mode, actions)

        transition_occurred = False
        old_mode = self.mode

        for target_mode, condition in candidate_transitions:
            if condition:
                # 2. Perform discrete jump
                self.state = self.reset(self.state, self.mode, target_mode)
                self.mode = target_mode
                transition_occurred = True
                break  # Take first satisfied transition

        # 3. Apply flow (discrete-time difference equations)
        self.state = self.flow(self.state, self.mode, actions)

        # 4. Check invariants
        if not self.invariants(self.state, self.mode):
            raise RuntimeError(f"Invariant violated in mode {self.mode}")

        # Update time
        self.time += self.dt

        # Record history
        result = {
            'time': self.time,
            'mode': self.mode,
            'state': self.state.copy(),
            'transition': (old_mode, self.mode) if transition_occurred else None
        }
        self.history.append(result)

        return result

    def simulate(self, action_sequence: List[List[PlayerAction]],
                 max_steps: int = 100) -> List[Dict]:
        """
        Run simulation with sequence of player actions.

        Args:
            action_sequence: List of action lists (one per time step)
            max_steps: Maximum simulation steps

        Returns:
            Full simulation history
        """
        for i, actions in enumerate(action_sequence):
            if i >= max_steps:
                break

            result = self.step(actions)

            # Stop conditions
            if self.mode == Mode.CRISIS and self.state.public_trust < 10:
                print(f"Simulation ended: Crisis with trust collapse at t={self.time:.1f}")
                break

            if self.mode == Mode.SAFE_TRANSITION:
                print(f"Simulation ended: Safe transition achieved at t={self.time:.1f}")
                break

        return self.history


if __name__ == "__main__":
    # Example simulation
    automaton = DiscreteTimeHybridAutomaton(dt=0.1)

    # Simulate 3 players making decisions
    num_steps = 50
    num_players = 3

    action_sequence = []
    for step in range(num_steps):
        # Early game: moderate investment
        if step < 20:
            actions = [
                PlayerAction(increase_investment=2.0, transparency=3.0, safety_focus=2.0)
                for _ in range(num_players)
            ]
        # Mid game: decision point - some race, some coordinate
        elif step < 35:
            actions = [
                PlayerAction(race_decision=True, increase_investment=5.0),
                PlayerAction(coordinate_attempt=True, transparency=5.0, safety_focus=4.0),
                PlayerAction(race_decision=True, increase_investment=5.0)
            ]
        # Late game: attempt coordination
        else:
            actions = [
                PlayerAction(coordinate_attempt=True, transparency=7.0, safety_focus=5.0)
                for _ in range(num_players)
            ]

        action_sequence.append(actions)

    history = automaton.simulate(action_sequence)

    # Print summary
    print("\n=== Simulation Summary ===")
    print(f"Final mode: {automaton.mode}")
    print(f"Final capabilities: {automaton.state.capabilities:.1f}")
    print(f"Final public trust: {automaton.state.public_trust:.1f}")
    print(f"Final coordination: {automaton.state.coordination:.1f}")
    print(f"Final safety research: {automaton.state.safety_research:.1f}")

    print("\n=== Mode Transitions ===")
    for record in history:
        if record['transition']:
            old, new = record['transition']
            print(f"t={record['time']:.1f}: {old.value} → {new.value}")
