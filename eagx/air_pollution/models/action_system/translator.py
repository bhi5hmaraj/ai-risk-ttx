"""
Action translator: Natural language → Formal action representation.

Handles the LLM-based translation from player intent to structured actions.
"""

import json
import logging
from typing import Dict, Tuple, Optional
from openai import OpenAI
import os

from .primitives import FormalAction, ActionPrimitive, ActionParameters, ActionTarget


class ActionTranslator:
    """
    Translates between natural language and formal action representation.

    Example:
        Player: "I want to pay farmers to use Happy Seeder machines"
        → SUBSIDIZE(target=farmers, magnitude=0.7, cost=300)
    """

    def __init__(self, api_key: str = None, model: str = "gemini-2.0-flash-exp"):
        self.client = OpenAI(
            base_url="https://asgard.bhishmaraj.org",
            api_key=api_key or os.getenv("VITE_LITELLM_API_KEY")
        )
        self.model = model
        self.logger = logging.getLogger("ActionTranslator")

    def translate(
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
        prompt = self._build_prompt(player_input, game_state, available_budget, player_role)

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self._get_system_prompt()},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.3
        )

        llm_output = json.loads(response.choices[0].message.content)

        if llm_output.get("feasible", False):
            action = self._construct_action(llm_output)
            explanation = llm_output.get("explanation", "")
            return action, explanation
        else:
            reason = llm_output.get("infeasibility_reason", "Action not feasible")
            return None, reason

    def _get_system_prompt(self) -> str:
        return """You are an action translator for a policy simulation game.

Convert player's natural language intent into formal action representation.

Available Primitives:
- SUBSIDIZE, TAX, BAN, MANDATE, CAP
- MONITOR, PUBLICIZE
- BUILD, UPGRADE
- NEGOTIATE, COMPENSATE
- NOVEL (use sparingly)

Return JSON with action specification or infeasibility explanation."""

    def _build_prompt(
        self,
        player_input: str,
        game_state: Dict,
        available_budget: float,
        player_role: str
    ) -> str:
        return f"""Translate player intent to formal action.

Player Input: "{player_input}"
Player Role: {player_role}
Available Budget: ₹{available_budget:.0f} crores
Current AQI: {game_state.get('aqi', 'unknown')}

Output Format:
{{
  "feasible": true/false,
  "primitive": "SUBSIDIZE",
  "parameters": {{
    "magnitude": 0.75,
    "cost": 300,
    "target": {{"sector": "farmers", "geographic_scope": "punjab"}}
  }},
  "player_facing_name": "Farmer Subsidy (75%)",
  "narrative_description": "Provide ₹300cr to cover 75% of machinery costs...",
  "explanation": "Mapped to SUBSIDIZE with high magnitude"
}}"""

    def _construct_action(self, llm_output: Dict) -> FormalAction:
        """Build FormalAction from LLM output"""
        target = ActionTarget(**llm_output["parameters"]["target"])

        params = ActionParameters(
            magnitude=llm_output["parameters"]["magnitude"],
            cost=llm_output["parameters"]["cost"],
            target=target,
            duration=llm_output["parameters"].get("duration", 1)
        )

        return FormalAction(
            action_id=f"action_{hash(llm_output['player_facing_name']) % 10000}",
            primitive=ActionPrimitive[llm_output["primitive"]],
            parameters=params,
            narrative_description=llm_output["narrative_description"],
            player_facing_name=llm_output["player_facing_name"]
        )
