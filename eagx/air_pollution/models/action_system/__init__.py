"""
Action system: Main entry point for the hybrid action space.

Coordinates translator, executor, and state manager.
"""

from typing import Dict, Tuple, Optional

from .translator import ActionTranslator
from .executor import HybridActionExecutor
from .state_manager import DynamicStateManager
from .primitives import FormalAction


class ActionSystem:
    """
    Unified interface for the hybrid action system.

    Usage:
        system = ActionSystem()

        # Translate player input
        action, explanation = system.translate_action(
            "I want to subsidize farmers",
            game_state, budget, role
        )

        # Execute action
        new_state, narrative = system.execute_action(
            action, game_state, context
        )
    """

    def __init__(self):
        self.state_manager = DynamicStateManager()
        self.translator = ActionTranslator()
        self.executor = HybridActionExecutor(self.state_manager)

    def translate_action(
        self,
        player_input: str,
        game_state: Dict,
        available_budget: float,
        player_role: str
    ) -> Tuple[Optional[FormalAction], str]:
        """
        Translate natural language to formal action.

        Returns:
            (FormalAction or None, explanation)
        """
        return self.translator.translate(
            player_input,
            game_state,
            available_budget,
            player_role
        )

    def execute_action(
        self,
        action: FormalAction,
        current_state: Dict,
        game_context: Dict = None
    ) -> Tuple[Dict, str]:
        """
        Execute action and return new state + narrative.

        Returns:
            (new_state, narrative)
        """
        game_context = game_context or {}
        return self.executor.execute(action, current_state, game_context)

    def add_dynamic_variable(self, **kwargs):
        """Add a dynamic state variable"""
        return self.state_manager.add_variable(**kwargs)

    def get_state_info(self) -> Dict:
        """Get information about all state variables"""
        return self.state_manager.get_all_variables()
