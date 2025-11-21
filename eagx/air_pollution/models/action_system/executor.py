"""
Hybrid action executor: Combines parametric (math) and emergent (LLM) effects.
"""

import json
import logging
from typing import Dict, Tuple
from openai import OpenAI
import os

from .primitives import FormalAction, ActionPrimitive
from .effects import EffectFunctionLibrary
from .state_manager import DynamicStateManager


class HybridActionExecutor:
    """
    Executes actions using:
    1. Parametric math (for well-defined effects)
    2. LLM inference (for novel/complex effects)
    """

    def __init__(self, state_manager: DynamicStateManager):
        self.state_manager = state_manager
        self.effect_library = EffectFunctionLibrary()
        self.logger = logging.getLogger("HybridExecutor")

        # LLM client for emergent effects
        self.client = OpenAI(
            base_url="https://asgard.bhishmaraj.org",
            api_key=os.getenv("VITE_LITELLM_API_KEY")
        )
        self.model = os.getenv("VITE_LLM_MODEL", "gemini-2.0-flash-exp")

    def execute(
        self,
        action: FormalAction,
        current_state: Dict,
        game_context: Dict
    ) -> Tuple[Dict, str]:
        """
        Execute action and return new state + narrative.

        Returns:
            (new_state, narrative)
        """
        state_delta = {}

        # 1. Parametric effects (deterministic math)
        effect_fn = self.effect_library.get_effect_function(action.primitive)
        param_delta = effect_fn(action, current_state)
        state_delta.update(param_delta)

        self.logger.info(f"Parametric effects: {param_delta}")

        # 2. LLM effects (for emergent dynamics)
        narrative = ""
        if action.primitive == ActionPrimitive.NOVEL or action.llm_effects:
            llm_delta, narrative = self._compute_llm_effects(
                action, current_state, game_context, param_delta
            )
            state_delta.update(llm_delta)
        else:
            narrative = self._generate_basic_narrative(action, param_delta)

        # 3. Apply state delta
        new_state = self._apply_delta(current_state, state_delta)

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
        """Use LLM to compute emergent effects"""

        prompt = f"""Compute emergent effects of: {action.player_facing_name}

Current State: {json.dumps(current_state, indent=2)}
Parametric Effects: {json.dumps(parametric_delta, indent=2)}

Identify second-order effects:
- Media reactions
- Political spillovers
- Unintended behaviors
- Trust/credibility impacts

Output:
{{
  "emergent_state_changes": {{"media_attention": +20, ...}},
  "narrative": "...",
  "unintended_consequences": [...]
}}"""

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You compute emergent policy effects."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )

        llm_output = json.loads(response.choices[0].message.content)

        return (
            llm_output.get("emergent_state_changes", {}),
            llm_output.get("narrative", "")
        )

    def _generate_basic_narrative(self, action: FormalAction, delta: Dict) -> str:
        """Generate simple narrative from parametric effects"""
        effects = []

        if "aqi_delta" in delta:
            aqi_change = delta["aqi_delta"]
            effects.append(
                f"reduced AQI by {abs(aqi_change):.0f} points" if aqi_change < 0
                else f"increased AQI by {aqi_change:.0f} points"
            )

        if "public_approval_delta" in delta:
            approval = delta["public_approval_delta"]
            effects.append(
                f"boosted approval by {approval:.0f}%" if approval > 0
                else f"decreased approval by {abs(approval):.0f}%"
            )

        return f"{action.player_facing_name}: {', '.join(effects)}."

    def _apply_delta(self, current_state: Dict, delta: Dict) -> Dict:
        """Apply state delta to current state"""
        new_state = current_state.copy()

        for var, change in delta.items():
            if var.endswith("_delta"):
                base_var = var[:-6]
                new_state[base_var] = current_state.get(base_var, 0) + change
            else:
                new_state[var] = change

        return new_state

    def _validate_state(self, state: Dict) -> Dict:
        """Ensure state values are within valid bounds"""
        all_vars = self.state_manager.get_all_variables()

        # Check base variables
        for var, spec in all_vars["base"].items():
            if var in state:
                lower, upper = spec["bounds"]
                state[var] = max(lower, min(upper, state[var]))

        # Check dynamic variables
        for var, spec in all_vars["dynamic"].items():
            if var in state:
                lower, upper = spec["bounds"]
                state[var] = max(lower, min(upper, state[var]))

        return state
