"""
Hybrid Action Space: LLM + Formal Model Integration

Solves the core tension:
- Players want OPEN-ENDED actions (creativity, agency)
- Math models need BOUNDED actions (tractability, predictability)
- LLM can generate ANYTHING (too vague)

Solution: Compositional Action Grammar + Constraint-Based Validation

Architecture:
    Natural Language Input (player)
        ↓
    LLM Translator (maps to formal action representation)
        ↓
    Validation Layer (checks feasibility, constraints)
        ↓
    Hybrid Executor (parametric math + LLM learned effects)
        ↓
    State Update (modified state space)

Key Innovation: Action = (Core Primitive + Parameters + Narrative + Novel Effects)
"""

import json
import logging
from typing import Dict, List, Tuple, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
from openai import OpenAI
import os
import numpy as np


# ==================== ACTION GRAMMAR ====================

class ActionPrimitive(Enum):
    """
    Core action primitives with well-defined mathematical effects.

    These are the "atoms" that compose all actions.
    """
    # Resource allocation
    SUBSIDIZE = "subsidize"  # Transfer money to sector
    TAX = "tax"  # Impose cost on sector

    # Regulation
    BAN = "ban"  # Prohibit activity (magnitude = enforcement strength)
    MANDATE = "mandate"  # Require activity (magnitude = coverage)
    CAP = "cap"  # Set upper limit (magnitude = cap level)

    # Information
    MONITOR = "monitor"  # Increase surveillance (improves data, changes behavior)
    PUBLICIZE = "publicize"  # Make info public (changes public alarm, compliance)

    # Infrastructure
    BUILD = "build"  # Long-term investment (delayed effect)
    UPGRADE = "upgrade"  # Improve existing (delayed effect)

    # Coordination
    NEGOTIATE = "negotiate"  # Broker agreement (between players)
    COMPENSATE = "compensate"  # Side payment

    # Custom (LLM-defined)
    NOVEL = "novel"  # Entirely new action type


@dataclass
class ActionTarget:
    """Who/what is affected by the action"""
    sector: str  # "farmers", "industry", "vehicles", "all"
    geographic_scope: str = "delhi"  # "delhi", "ncr", "punjab", etc.
    demographic: Optional[str] = None  # "children", "elderly", "poor", etc.


@dataclass
class ActionParameters:
    """Quantitative parameters that math model uses"""
    magnitude: float  # [0, 1] - How strong/extensive?
    duration: int = 1  # Rounds - How long does it last?
    cost: float = 0.0  # ₹ crores - Budget cost

    # Target specification
    target: ActionTarget = field(default_factory=lambda: ActionTarget(sector="all"))

    # Timing
    immediate: bool = True  # Takes effect this round?
    delay_rounds: int = 0  # If not immediate, when?

    # Conditionality
    trigger_condition: Optional[str] = None  # e.g., "if AQI > 400"


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
    llm_effects: Optional[str] = None  # Prompt for LLM-computed effects

    # Constraints
    feasibility_checks: List[Callable] = field(default_factory=list)


# ==================== LLM TRANSLATOR ====================

class ActionTranslator:
    """
    Translates between natural language and formal action representation.

    Player: "I want to pay farmers to use Happy Seeder machines instead of burning"

    Translator:
    1. Identifies primitive: SUBSIDIZE
    2. Extracts parameters: target=farmers, magnitude=0.7, cost=300
    3. Generates formal action
    4. Validates against constraints
    5. Returns executable action + narrative
    """

    def __init__(self, api_key: str = None, model: str = "gemini-2.0-flash-exp"):
        self.client = OpenAI(
            base_url="https://asgard.bhishmaraj.org",
            api_key=api_key or os.getenv("VITE_LITELLM_API_KEY")
        )
        self.model = model
        self.logger = logging.getLogger("ActionTranslator")

    def translate_natural_language_to_action(
        self,
        player_input: str,
        game_state: Dict,
        available_budget: float,
        player_role: str
    ) -> Tuple[Optional[FormalAction], str]:
        """
        Main translation function.

        Args:
            player_input: "I want to give farmers money to not burn crops"
            game_state: Current game state (for feasibility checks)
            available_budget: How much ₹ can player spend
            player_role: Who is taking the action

        Returns:
            (FormalAction or None, explanation)
        """

        prompt = self._build_translation_prompt(
            player_input, game_state, available_budget, player_role
        )

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self._get_translator_system_prompt()},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3  # Low temp for precise mapping
        )

        llm_output = json.loads(response.choices[0].message.content)

        # Validate and construct FormalAction
        if llm_output.get("feasible", False):
            action = self._construct_formal_action(llm_output)
            explanation = llm_output.get("explanation", "Action translated successfully")
            return action, explanation
        else:
            reason = llm_output.get("infeasibility_reason", "Action not feasible")
            return None, reason

    def _get_translator_system_prompt(self) -> str:
        return """You are an action translator for a policy simulation game.

Your job: Convert player's natural language intent into formal action representation.

Available Action Primitives:
1. SUBSIDIZE - Give money to incentivize behavior
2. TAX - Impose cost to discourage behavior
3. BAN - Prohibit activity (needs enforcement)
4. MANDATE - Require activity (needs enforcement)
5. CAP - Set upper limit on activity
6. MONITOR - Increase surveillance/data collection
7. PUBLICIZE - Make information public
8. BUILD - Construct new infrastructure
9. UPGRADE - Improve existing infrastructure
10. NEGOTIATE - Broker agreement between parties
11. COMPENSATE - Side payment to affected parties
12. NOVEL - Something truly new (use sparingly)

For each input:
1. Identify the core primitive(s)
2. Extract parameters (magnitude, cost, target, etc.)
3. Check feasibility (budget, authority, time)
4. Map to formal action structure

Be STRICT about feasibility. Players cannot:
- Spend money they don't have
- Take actions outside their role's authority
- Violate physical constraints (can't reduce AQI by 1000 points)

Return JSON with full action specification or infeasibility explanation.
"""

    def _build_translation_prompt(
        self,
        player_input: str,
        game_state: Dict,
        available_budget: float,
        player_role: str
    ) -> str:
        return f"""Translate player intent to formal action.

**Player Input:** "{player_input}"

**Player Role:** {player_role}

**Game State:**
- Current AQI: {game_state.get('aqi', 'unknown')}
- Round: {game_state.get('round', 'unknown')}
- Available Budget: ₹{available_budget:.0f} crores

**Role Authority:**
{self._get_role_authority(player_role)}

**Your Task:**
1. Identify which action primitive(s) best match the intent
2. Extract parameters:
   - magnitude: [0, 1] - How strong/extensive?
   - cost: ₹ crores - Must be ≤ available budget
   - target: Which sector/group?
   - duration: How many rounds?
   - delay: Immediate or delayed?
3. Check feasibility:
   - Does player have authority for this action?
   - Is budget sufficient?
   - Are parameters within plausible bounds?
4. Generate player-facing name and description

**Output Format:**
{{
  "feasible": true/false,
  "primitive": "SUBSIDIZE" | "TAX" | "BAN" | ...,
  "parameters": {{
    "magnitude": 0.75,
    "cost": 300,
    "target": {{
      "sector": "farmers",
      "geographic_scope": "punjab",
      "demographic": null
    }},
    "duration": 2,
    "delay_rounds": 0,
    "immediate": true
  }},
  "player_facing_name": "Expand Happy Seeder Subsidy to 75%",
  "narrative_description": "Provide ₹300 crores to cover 75% of stubble management machinery costs for Punjab farmers. Expected to reduce burning by 40% within 2 weeks.",
  "expected_effects": {{
    "aqi_delta": -60,
    "compliance_increase": 0.4,
    "public_approval_change": 5
  }},
  "explanation": "Mapped to SUBSIDIZE primitive with high magnitude targeting farmers. Cost within budget.",
  "infeasibility_reason": null
}}

If infeasible:
{{
  "feasible": false,
  "infeasibility_reason": "Insufficient budget. Requested ₹500cr, only ₹{available_budget:.0f}cr available.",
  "suggestion": "Consider reducing subsidy coverage to 50% (₹200cr) or negotiate with Environment Minister for joint funding."
}}
"""

    def _get_role_authority(self, role: str) -> str:
        authorities = {
            "Chief Minister": """
Can: Declare emergencies, allocate Delhi budget, implement vehicle restrictions, construction bans
Cannot: Force Punjab/Haryana actions, change national regulations
""",
            "Environment Minister": """
Can: Allocate central funds, set national emission standards, coordinate across states
Cannot: Directly control Delhi budget, override state autonomy
""",
            "Farmer Rep": """
Can: Negotiate terms, represent farmer interests, propose agreements
Cannot: Implement policies (advisory role), spend government funds directly
""",
            "Industry Leader": """
Can: Negotiate compliance, propose tech solutions, commit industry resources
Cannot: Impose regulations, spend government funds
"""
        }
        return authorities.get(role, "Authority unclear for this role")

    def _construct_formal_action(self, llm_output: Dict) -> FormalAction:
        """Build FormalAction from LLM output"""

        target = ActionTarget(**llm_output["parameters"]["target"])

        params = ActionParameters(
            magnitude=llm_output["parameters"]["magnitude"],
            cost=llm_output["parameters"]["cost"],
            target=target,
            duration=llm_output["parameters"].get("duration", 1),
            delay_rounds=llm_output["parameters"].get("delay_rounds", 0),
            immediate=llm_output["parameters"].get("immediate", True)
        )

        action = FormalAction(
            action_id=f"action_{np.random.randint(10000)}",
            primitive=ActionPrimitive[llm_output["primitive"]],
            parameters=params,
            narrative_description=llm_output["narrative_description"],
            player_facing_name=llm_output["player_facing_name"]
        )

        # Add parametric effect functions
        action.parametric_effects = self._generate_effect_functions(action)

        return action


    def _generate_effect_functions(self, action: FormalAction) -> Dict[str, Callable]:
        """
        Generate mathematical effect functions for the action.

        These functions compute state changes based on action parameters.
        """
        effects = {}

        if action.primitive == ActionPrimitive.SUBSIDIZE:
            def subsidy_effect(current_state: Dict) -> Dict[str, float]:
                """
                Subsidy reduces unwanted behavior proportional to magnitude.

                Model: behavior_reduction = base_elasticity * magnitude * (1 - current_compliance)
                """
                target = action.parameters.target.sector
                magnitude = action.parameters.magnitude

                # Behavioral response (elasticity)
                base_elasticity = 0.6  # 60% reduction at full subsidy
                current_compliance = current_state.get(f"{target}_compliance", 0.3)

                reduction = base_elasticity * magnitude * (1 - current_compliance)

                # AQI impact (depends on sector contribution)
                sector_contributions = {
                    "farmers": 30,  # Burning contributes up to 30 AQI points seasonally
                    "industry": 20,
                    "vehicles": 25
                }

                aqi_delta = -sector_contributions.get(target, 10) * reduction

                return {
                    "aqi_delta": aqi_delta,
                    f"{target}_compliance": current_compliance + reduction,
                    "public_approval_delta": magnitude * 5,  # Subsidies are popular
                    "budget_delta": -action.parameters.cost
                }

            effects["subsidy_effect"] = subsidy_effect

        elif action.primitive == ActionPrimitive.BAN:
            def ban_effect(current_state: Dict) -> Dict[str, float]:
                """
                Bans reduce behavior if enforcement is strong enough.

                Model: actual_reduction = magnitude * enforcement_capacity
                """
                target = action.parameters.target.sector
                magnitude = action.parameters.magnitude  # Ban strictness

                enforcement = current_state.get("enforcement_capacity", 0.5)

                # Compliance is imperfect
                actual_reduction = magnitude * enforcement

                # But bans create backlash
                backlash = magnitude * 10  # Stronger bans = more backlash

                sector_contributions = {
                    "farmers": 30,
                    "industry": 20,
                    "vehicles": 25
                }

                aqi_delta = -sector_contributions.get(target, 10) * actual_reduction

                return {
                    "aqi_delta": aqi_delta,
                    f"{target}_compliance": actual_reduction,
                    "public_approval_delta": -backlash,
                    "public_alarm_delta": 5  # Bans signal crisis
                }

            effects["ban_effect"] = ban_effect

        # Add more primitives...

        return effects


# ==================== STATE MODIFICATION ====================

class DynamicStateManager:
    """
    Allows LLM to introduce new state variables during gameplay.

    Problem: Fixed state space is limiting. Players/LLM might introduce:
    - "Farmer revolt intensity"
    - "Media attention on issue X"
    - "Inter-state political tension"

    Solution: Dynamic state space with constraints.
    """

    def __init__(self):
        self.base_state_variables = {
            "aqi": {"type": "float", "bounds": (0, 600), "required": True},
            "pm25": {"type": "float", "bounds": (0, 1000), "required": True},
            "budget": {"type": "float", "bounds": (0, 10000), "required": True},
            "public_approval": {"type": "float", "bounds": (0, 100), "required": True},
            "public_alarm": {"type": "float", "bounds": (0, 100), "required": True}
        }

        self.dynamic_state_variables = {}  # LLM-introduced variables
        self.state_history = []

    def can_add_state_variable(self, var_name: str, var_spec: Dict) -> Tuple[bool, str]:
        """Check if new state variable is allowed"""

        # Constraints
        if var_name in self.base_state_variables:
            return False, f"Cannot override base variable: {var_name}"

        if var_name in self.dynamic_state_variables:
            return False, f"Variable already exists: {var_name}"

        if len(self.dynamic_state_variables) >= 20:
            return False, "Too many dynamic variables (max 20)"

        required_fields = ["type", "bounds", "initial_value"]
        if not all(field in var_spec for field in required_fields):
            return False, f"Missing required fields: {required_fields}"

        return True, "OK"

    def add_state_variable(
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

        Example:
            add_state_variable(
                "farmer_revolt_intensity",
                "float",
                (0, 100),
                20,
                "How close farmers are to mass protests",
                update_rule=lambda state: state["farmer_revolt_intensity"] +
                    (5 if state["aqi"] > 300 else -2)
            )
        """
        var_spec = {
            "type": var_type,
            "bounds": bounds,
            "initial_value": initial_value,
            "description": description,
            "update_rule": update_rule
        }

        can_add, reason = self.can_add_state_variable(var_name, var_spec)

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


# ==================== HYBRID EXECUTOR ====================

class HybridActionExecutor:
    """
    Executes actions using combination of:
    1. Parametric math (for well-defined effects)
    2. LLM inference (for novel/complex effects)
    3. Player-defined rules (for custom actions)
    """

    def __init__(self, translator: ActionTranslator, state_manager: DynamicStateManager):
        self.translator = translator
        self.state_manager = state_manager
        self.logger = logging.getLogger("HybridExecutor")

    def execute_action(
        self,
        action: FormalAction,
        current_state: Dict,
        game_context: Dict
    ) -> Tuple[Dict, str]:
        """
        Execute action and return new state + narrative.

        Flow:
        1. Run parametric effects (math functions)
        2. If action has LLM effects, call LLM for narrative + emergent effects
        3. Update dynamic state variables
        4. Validate new state (bounds, consistency)
        5. Return state delta + narrative
        """

        state_delta = {}

        # 1. Parametric effects (deterministic math)
        if action.parametric_effects:
            self.logger.info(f"Computing parametric effects for {action.primitive.value}")
            for effect_name, effect_fn in action.parametric_effects.items():
                try:
                    effect_result = effect_fn(current_state)
                    state_delta.update(effect_result)
                except Exception as e:
                    self.logger.error(f"Error in {effect_name}: {e}")

        # 2. LLM effects (for emergent/narrative dynamics)
        narrative = ""
        if action.llm_effects or action.primitive == ActionPrimitive.NOVEL:
            llm_delta, narrative = self._compute_llm_effects(
                action, current_state, game_context, state_delta
            )
            state_delta.update(llm_delta)
        else:
            # Generate basic narrative from parametric effects
            narrative = self._generate_basic_narrative(action, state_delta)

        # 3. Apply state delta
        new_state = current_state.copy()
        for var, delta in state_delta.items():
            if var.endswith("_delta"):
                base_var = var[:-6]  # Remove "_delta"
                new_state[base_var] = current_state.get(base_var, 0) + delta
            else:
                new_state[var] = delta

        # 4. Update dynamic states
        new_state = self.state_manager.update_dynamic_states(new_state)

        # 5. Validate
        new_state = self._validate_state(new_state)

        return new_state, narrative

    def _compute_llm_effects(
        self,
        action: FormalAction,
        current_state: Dict,
        game_context: Dict,
        parametric_delta: Dict
    ) -> Tuple[Dict, str]:
        """
        Use LLM to compute effects that are hard to model parametrically.

        Examples:
        - How does "farmer revolt" affect other players?
        - What media narrative emerges from this action?
        - What unintended consequences might occur?
        """

        prompt = f"""Compute effects of action: {action.player_facing_name}

**Action Details:**
{action.narrative_description}

**Current State:**
{json.dumps(current_state, indent=2)}

**Parametric Effects Already Computed:**
{json.dumps(parametric_delta, indent=2)}

**Your Task:**
1. Identify emergent/second-order effects not captured by parametric model
2. Compute state changes for these effects
3. Generate narrative describing what happens

Examples of emergent effects:
- Media attention shifts
- Political backlash from unexpected groups
- Unintended behavioral responses
- Inter-stakeholder conflicts
- Symbolic/signaling effects

**Output Format:**
{{
  "emergent_state_changes": {{
    "media_attention": +20,
    "farmer_trust_in_government": -10,
    "industry_lobbying_intensity": +5
  }},
  "narrative": "The subsidy announcement generated widespread media coverage, but farmer leaders expressed skepticism...",
  "unintended_consequences": ["Industrial lobby fears they'll be next", "Urban voters question spending priorities"]
}}
"""

        response = self.translator.client.chat.completions.create(
            model=self.translator.model,
            messages=[
                {"role": "system", "content": "You are a policy simulation engine computing emergent effects of interventions."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )

        llm_output = json.loads(response.choices[0].message.content)

        return llm_output.get("emergent_state_changes", {}), llm_output.get("narrative", "")

    def _generate_basic_narrative(self, action: FormalAction, state_delta: Dict) -> str:
        """Generate simple narrative from parametric effects"""

        effects_summary = []

        if "aqi_delta" in state_delta:
            aqi_change = state_delta["aqi_delta"]
            if aqi_change < 0:
                effects_summary.append(f"reduced AQI by {abs(aqi_change):.0f} points")
            else:
                effects_summary.append(f"increased AQI by {aqi_change:.0f} points")

        if "public_approval_delta" in state_delta:
            approval_change = state_delta["public_approval_delta"]
            if approval_change > 0:
                effects_summary.append(f"boosted public approval by {approval_change:.0f}%")
            else:
                effects_summary.append(f"decreased approval by {abs(approval_change):.0f}%")

        narrative = f"{action.player_facing_name}: {', '.join(effects_summary)}."

        return narrative

    def _validate_state(self, state: Dict) -> Dict:
        """Ensure state values are within valid bounds"""

        # Check base variables
        for var, spec in self.state_manager.base_state_variables.items():
            if var in state:
                lower, upper = spec["bounds"]
                state[var] = max(lower, min(upper, state[var]))

        # Check dynamic variables
        for var, spec in self.state_manager.dynamic_state_variables.items():
            if var in state:
                lower, upper = spec["bounds"]
                state[var] = max(lower, min(upper, state[var]))

        return state


# ==================== DEMONSTRATION ====================

if __name__ == "__main__":
    print("="*60)
    print("HYBRID ACTION SPACE DEMONSTRATION")
    print("="*60)

    # Setup
    translator = ActionTranslator()
    state_manager = DynamicStateManager()
    executor = HybridActionExecutor(translator, state_manager)

    # Game state
    game_state = {
        "aqi": 250,
        "pm25": 150,
        "budget": 800,
        "public_approval": 60,
        "public_alarm": 50,
        "round": 2,
        "farmers_compliance": 0.3,
        "enforcement_capacity": 0.5
    }

    print("\n1. TRANSLATING NATURAL LANGUAGE ACTION")
    print("-"*60)

    player_input = "I want to give farmers generous subsidies to buy Happy Seeder machines so they don't burn their fields"

    print(f"Player says: \"{player_input}\"")
    print("\nTranslating...")

    action, explanation = translator.translate_natural_language_to_action(
        player_input,
        game_state,
        available_budget=800,
        player_role="Chief Minister"
    )

    if action:
        print(f"\n✅ Action translated successfully")
        print(f"Primitive: {action.primitive.value}")
        print(f"Name: {action.player_facing_name}")
        print(f"Description: {action.narrative_description}")
        print(f"Cost: ₹{action.parameters.cost}cr")
        print(f"Magnitude: {action.parameters.magnitude}")
        print(f"Target: {action.parameters.target.sector}")

        print("\n2. EXECUTING ACTION")
        print("-"*60)

        new_state, narrative = executor.execute_action(action, game_state, {})

        print(f"\nNarrative:\n{narrative}")
        print(f"\nState Changes:")
        for var in ["aqi", "budget", "public_approval", "farmers_compliance"]:
            old = game_state.get(var, 0)
            new = new_state.get(var, 0)
            delta = new - old
            print(f"  {var}: {old:.1f} → {new:.1f} ({delta:+.1f})")

    else:
        print(f"\n❌ Action infeasible: {explanation}")

    print("\n3. ADDING DYNAMIC STATE VARIABLE")
    print("-"*60)

    # LLM can add new state variable mid-game
    state_manager.add_state_variable(
        "farmer_trust_in_government",
        "float",
        (0, 100),
        50,  # Initial value
        "How much farmers trust government promises",
        update_rule=lambda s: s.get("farmer_trust_in_government", 50) +
            (10 if "subsidy" in str(s.get("last_action", "")) else -2)
    )

    print("Added dynamic variable: farmer_trust_in_government")
    print("This variable will now evolve based on game events")

    print("\n" + "="*60)
    print("DEMO COMPLETE")
    print("="*60)
