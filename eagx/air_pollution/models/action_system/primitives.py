"""
Action primitives and data structures for the hybrid action system.

This module defines the core action grammar: primitives, parameters, and targets.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, List, Callable


class ActionPrimitive(Enum):
    """
    Core action primitives with well-defined mathematical effects.

    These are the "atoms" that compose all actions.
    """
    # Resource allocation
    SUBSIDIZE = "subsidize"  # Transfer money to incentivize
    TAX = "tax"              # Impose cost to discourage

    # Regulation
    BAN = "ban"              # Prohibit activity
    MANDATE = "mandate"      # Require activity
    CAP = "cap"              # Set upper limit

    # Information
    MONITOR = "monitor"      # Increase surveillance
    PUBLICIZE = "publicize"  # Make info public

    # Infrastructure
    BUILD = "build"          # Long-term investment
    UPGRADE = "upgrade"      # Improve existing

    # Coordination
    NEGOTIATE = "negotiate"  # Broker agreement
    COMPENSATE = "compensate" # Side payment

    # Custom
    NOVEL = "novel"          # Entirely new action


@dataclass
class ActionTarget:
    """Who/what is affected by the action"""
    sector: str  # "farmers", "industry", "vehicles", "all"
    geographic_scope: str = "delhi"
    demographic: Optional[str] = None


@dataclass
class ActionParameters:
    """Quantitative parameters that math model uses"""
    magnitude: float  # [0, 1] - How strong/extensive?
    duration: int = 1  # Rounds - How long?
    cost: float = 0.0  # ₹ crores - Budget cost

    # Target specification
    target: ActionTarget = field(default_factory=lambda: ActionTarget(sector="all"))

    # Timing
    immediate: bool = True
    delay_rounds: int = 0

    # Conditionality
    trigger_condition: Optional[str] = None


@dataclass
class FormalAction:
    """
    Formal representation of an action.

    This is what the math model operates on.
    """
    action_id: str
    primitive: ActionPrimitive
    parameters: ActionParameters

    # LLM-generated components
    narrative_description: str
    player_facing_name: str

    # Effect functions
    parametric_effects: Dict[str, Callable] = field(default_factory=dict)
    llm_effects: Optional[str] = None

    # Constraints
    feasibility_checks: List[Callable] = field(default_factory=list)
