"""
Parametric effect functions for action primitives.

Each primitive has a mathematical function computing state changes.
"""

from typing import Dict, Callable
from .primitives import FormalAction, ActionPrimitive


class EffectFunctionLibrary:
    """
    Library of parametric effect functions.

    Each function maps (action_parameters, current_state) → state_delta
    """

    @staticmethod
    def subsidize_effect(action: FormalAction, current_state: Dict) -> Dict[str, float]:
        """
        Subsidy reduces unwanted behavior proportional to magnitude.

        Model: reduction = base_elasticity * magnitude * (1 - current_compliance)
        """
        target = action.parameters.target.sector
        magnitude = action.parameters.magnitude

        # Behavioral response (from literature)
        base_elasticity = 0.6  # 60% reduction at full subsidy
        current_compliance = current_state.get(f"{target}_compliance", 0.3)

        reduction = base_elasticity * magnitude * (1 - current_compliance)

        # AQI impact (sector-specific)
        sector_contributions = {
            "farmers": 30,
            "industry": 20,
            "vehicles": 25
        }

        aqi_delta = -sector_contributions.get(target, 10) * reduction

        return {
            "aqi_delta": aqi_delta,
            f"{target}_compliance": current_compliance + reduction,
            "public_approval_delta": magnitude * 5,
            "budget_delta": -action.parameters.cost
        }

    @staticmethod
    def ban_effect(action: FormalAction, current_state: Dict) -> Dict[str, float]:
        """
        Bans reduce behavior if enforcement is strong enough.

        Model: actual_reduction = magnitude * enforcement_capacity
        """
        target = action.parameters.target.sector
        magnitude = action.parameters.magnitude

        enforcement = current_state.get("enforcement_capacity", 0.5)
        actual_reduction = magnitude * enforcement

        # Backlash
        backlash = magnitude * 10

        sector_contributions = {"farmers": 30, "industry": 20, "vehicles": 25}
        aqi_delta = -sector_contributions.get(target, 10) * actual_reduction

        return {
            "aqi_delta": aqi_delta,
            f"{target}_compliance": actual_reduction,
            "public_approval_delta": -backlash,
            "public_alarm_delta": 5
        }

    @staticmethod
    def monitor_effect(action: FormalAction, current_state: Dict) -> Dict[str, float]:
        """
        Monitoring increases enforcement capacity and compliance.
        """
        magnitude = action.parameters.magnitude

        current_enforcement = current_state.get("enforcement_capacity", 0.5)
        new_enforcement = min(0.95, current_enforcement + magnitude * 0.3)

        return {
            "enforcement_capacity": new_enforcement,
            "public_alarm_delta": 2,  # Signals government action
            "budget_delta": -action.parameters.cost
        }

    @staticmethod
    def publicize_effect(action: FormalAction, current_state: Dict) -> Dict[str, float]:
        """
        Publicizing information increases public alarm and social pressure.
        """
        magnitude = action.parameters.magnitude

        return {
            "public_alarm_delta": magnitude * 15,
            "public_approval_delta": magnitude * 5,
            "farmers_compliance": magnitude * 0.05,  # Social pressure
            "budget_delta": -action.parameters.cost
        }

    @classmethod
    def get_effect_function(cls, primitive: ActionPrimitive) -> Callable:
        """Get the effect function for a given primitive"""
        mapping = {
            ActionPrimitive.SUBSIDIZE: cls.subsidize_effect,
            ActionPrimitive.BAN: cls.ban_effect,
            ActionPrimitive.MONITOR: cls.monitor_effect,
            ActionPrimitive.PUBLICIZE: cls.publicize_effect,
            # Add more as needed
        }

        return mapping.get(primitive, cls._default_effect)

    @staticmethod
    def _default_effect(action: FormalAction, current_state: Dict) -> Dict[str, float]:
        """Default effect for unimplemented primitives"""
        return {
            "budget_delta": -action.parameters.cost
        }
