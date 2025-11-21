"""
Dynamic state manager: Allows runtime introduction of new state variables.

Enables LLM to expand the state space during gameplay.
"""

import logging
from typing import Dict, Tuple, Optional, Callable


class DynamicStateManager:
    """
    Manages dynamic state variables that can be added during gameplay.

    Example:
        manager.add_variable(
            "farmer_revolt_intensity",
            bounds=(0, 100),
            initial=20,
            update_rule=lambda s: s["farmer_revolt_intensity"] +
                (5 if s["aqi"] > 300 else -2)
        )
    """

    MAX_DYNAMIC_VARIABLES = 20

    def __init__(self):
        self.base_state_variables = {
            "aqi": {"type": "float", "bounds": (0, 600), "required": True},
            "pm25": {"type": "float", "bounds": (0, 1000), "required": True},
            "budget": {"type": "float", "bounds": (0, 10000), "required": True},
            "public_approval": {"type": "float", "bounds": (0, 100), "required": True},
            "public_alarm": {"type": "float", "bounds": (0, 100), "required": True}
        }

        self.dynamic_state_variables = {}
        self.logger = logging.getLogger("DynamicStateManager")

    def can_add_variable(self, var_name: str, var_spec: Dict) -> Tuple[bool, str]:
        """Check if new state variable is allowed"""

        if var_name in self.base_state_variables:
            return False, f"Cannot override base variable: {var_name}"

        if var_name in self.dynamic_state_variables:
            return False, f"Variable already exists: {var_name}"

        if len(self.dynamic_state_variables) >= self.MAX_DYNAMIC_VARIABLES:
            return False, f"Too many dynamic variables (max {self.MAX_DYNAMIC_VARIABLES})"

        required_fields = ["type", "bounds", "initial_value"]
        if not all(field in var_spec for field in required_fields):
            return False, f"Missing required fields: {required_fields}"

        return True, "OK"

    def add_variable(
        self,
        var_name: str,
        var_type: str,
        bounds: Tuple[float, float],
        initial_value: float,
        description: str,
        update_rule: Optional[Callable] = None
    ) -> bool:
        """
        Add new state variable during gameplay.

        Returns:
            True if added successfully
        """
        var_spec = {
            "type": var_type,
            "bounds": bounds,
            "initial_value": initial_value,
            "description": description,
            "update_rule": update_rule
        }

        can_add, reason = self.can_add_variable(var_name, var_spec)

        if can_add:
            self.dynamic_state_variables[var_name] = var_spec
            self.logger.info(f"Added dynamic state variable: {var_name}")
            return True
        else:
            self.logger.warning(f"Cannot add state variable: {reason}")
            return False

    def update_dynamic_states(self, current_state: Dict) -> Dict:
        """Update all dynamic state variables based on their rules"""
        for var_name, var_spec in self.dynamic_state_variables.items():
            if var_spec["update_rule"]:
                try:
                    new_value = var_spec["update_rule"](current_state)
                    # Clamp to bounds
                    lower, upper = var_spec["bounds"]
                    current_state[var_name] = max(lower, min(upper, new_value))
                except Exception as e:
                    self.logger.error(f"Error updating {var_name}: {e}")

        return current_state

    def get_all_variables(self) -> Dict:
        """Return both base and dynamic variables"""
        return {
            "base": self.base_state_variables,
            "dynamic": self.dynamic_state_variables
        }
