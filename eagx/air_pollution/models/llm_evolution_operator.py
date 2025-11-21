"""
LLM as Evolution Operator for Delhi Air Pollution TTX

Instead of using LLM purely for narratives, this module uses LLM as an
evolution operator that adapts formal model parameters based on emergent
gameplay patterns.

Key Idea:
- Formal models provide structure and constraints (physics, economics)
- LLM provides adaptive dynamics (learning from player behavior)
- Result: System that is both rigorous AND responsive

Architecture:
    Player Actions → Formal Models (predict) → LLM Evolution (adapt) → Updated Models

The LLM acts as a "meta-controller" that tunes model parameters to maintain:
1. Challenge balance (not too easy, not impossible)
2. Narrative coherence (surprising but plausible)
3. Educational value (make hidden dynamics visible)
"""

import json
import logging
from typing import Dict, List, Tuple
from dataclasses import dataclass, asdict
from openai import OpenAI
import os


@dataclass
class ModelParameters:
    """Parameters that LLM can evolve"""
    # Hybrid Automaton parameters
    compliance_decay_rate: float = 0.05  # How fast compliance erodes
    public_alarm_sensitivity: float = 0.5  # How quickly public reacts

    # System Dynamics parameters
    stubble_burning_base: float = 3000  # tons/day at peak
    farmer_subsidy_effectiveness: float = 0.6  # Reduction from subsidy
    wind_dispersion_coefficient: float = 0.4

    # Game balance parameters
    aqi_improvement_multiplier: float = 1.0  # Global difficulty dial
    budget_regeneration_rate: float = 50  # ₹ crores per round

    # Behavioral parameters (future ABM)
    social_conformity_strength: float = 0.3  # How much neighbors matter
    penalty_fear_factor: float = 0.2


@dataclass
class GameplayObservation:
    """What the LLM observes about current gameplay"""
    round_num: int
    player_count: int
    actions_taken: List[Dict]
    aqi_trajectory: List[float]
    budget_spent_per_round: List[float]
    player_engagement_signals: Dict[str, any]

    # Emergent patterns
    dominant_strategy: str = "none"  # e.g., "everyone picks subsidy"
    coordination_quality: float = 0.5  # 0-1, how well players coordinate
    difficulty_perception: str = "appropriate"  # "too easy", "too hard", "appropriate"


class LLMEvolutionOperator:
    """
    Uses LLM to adapt model parameters based on gameplay observations.

    The LLM answers questions like:
    - "Players ignore farmer subsidies despite high stubble burning. Should we increase subsidy effectiveness?"
    - "AQI keeps hitting 500+ and players feel helpless. Should we increase action impacts?"
    - "Game feels too easy (always win). Should we increase baseline emissions?"

    Constraints:
    - Parameters must stay within physically plausible bounds
    - Changes should be gradual (avoid wild swings)
    - Maintain educational value (don't make it arcade-y)
    """

    def __init__(self, api_key: str = None, model: str = "gemini-2.0-flash-exp"):
        self.client = OpenAI(
            base_url="https://asgard.bhishmaraj.org",
            api_key=api_key or os.getenv("VITE_LITELLM_API_KEY")
        )
        self.model = model
        self.parameter_history = []
        self.logger = self._setup_logger()

    def _setup_logger(self):
        logger = logging.getLogger("LLMEvolutionOperator")
        logger.setLevel(logging.DEBUG)
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        return logger

    def evolve_parameters(
        self,
        current_params: ModelParameters,
        observation: GameplayObservation
    ) -> Tuple[ModelParameters, Dict[str, str]]:
        """
        Main evolution function.

        Returns:
            (updated_params, reasoning_dict)
        """
        self.logger.info(f"Evolution operator invoked for Round {observation.round_num}")
        self.logger.debug(f"Current params: {asdict(current_params)}")

        # Build LLM prompt
        prompt = self._build_evolution_prompt(current_params, observation)

        # Call LLM
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self._get_system_prompt()},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7
        )

        # Parse response
        llm_output = json.loads(response.choices[0].message.content)

        # Apply parameter updates (with safety bounds)
        updated_params = self._apply_updates_safely(
            current_params,
            llm_output.get('parameter_updates', {})
        )

        reasoning = llm_output.get('reasoning', {})

        self.logger.info(f"Parameters evolved: {reasoning.get('summary', 'No summary')}")
        self.logger.debug(f"Updated params: {asdict(updated_params)}")

        # Log history
        self.parameter_history.append({
            'round': observation.round_num,
            'old_params': asdict(current_params),
            'new_params': asdict(updated_params),
            'reasoning': reasoning
        })

        return updated_params, reasoning

    def _get_system_prompt(self) -> str:
        return """You are a meta-controller for a tabletop exercise simulation. Your job is to adaptively tune model parameters to maintain:

1. **Challenge Balance**: Game should be winnable but require strategy
2. **Realism**: Parameters must stay physically/economically plausible
3. **Educational Value**: Make hidden dynamics visible through gameplay
4. **Engagement**: Avoid repetition, maintain surprise and tension

You observe gameplay patterns and recommend parameter adjustments. Think like a game balancer + systems scientist.

Constraints:
- Parameter changes should be gradual (±20% max per round)
- Stay within bounds (e.g., subsidy_effectiveness ∈ [0, 1])
- Justify changes with causal reasoning
- Prioritize learning goals over entertainment

Your output is a JSON with:
- parameter_updates: {param_name: new_value}
- reasoning: {
    summary: "One-sentence summary",
    observations: ["What patterns did you notice?"],
    interventions: ["Why these parameter changes?"],
    expected_effects: ["What will this change?"]
  }
"""

    def _build_evolution_prompt(
        self,
        params: ModelParameters,
        obs: GameplayObservation
    ) -> str:
        """Construct the prompt for LLM evolution"""

        actions_summary = "\n".join([
            f"  - Round {i+1}: {act}"
            for i, act in enumerate(obs.actions_taken)
        ])

        aqi_summary = "\n".join([
            f"  - Round {i+1}: AQI = {aqi:.0f}"
            for i, aqi in enumerate(obs.aqi_trajectory)
        ])

        budget_summary = "\n".join([
            f"  - Round {i+1}: ₹{budget:.0f} crores"
            for i, budget in enumerate(obs.budget_spent_per_round)
        ])

        prompt = f"""Analyze the current game session and recommend parameter adjustments.

**Current Model Parameters:**
{json.dumps(asdict(params), indent=2)}

**Gameplay Observations:**

**Round:** {obs.round_num} / 5
**Player Count:** {obs.player_count}

**Actions Taken:**
{actions_summary}

**AQI Trajectory:**
{aqi_summary}

**Budget Spent:**
{budget_summary}

**Emergent Patterns:**
- Dominant Strategy: {obs.dominant_strategy}
- Coordination Quality: {obs.coordination_quality:.2f} (0=poor, 1=excellent)
- Difficulty Perception: {obs.difficulty_perception}

**Player Engagement Signals:**
{json.dumps(obs.player_engagement_signals, indent=2)}

**Your Task:**
1. Identify gameplay patterns (Are players struggling? Dominating? Ignoring certain mechanics?)
2. Diagnose issues (Too easy? Too hard? Degenerate strategy? Lack of agency?)
3. Recommend parameter adjustments to improve balance and learning

**Examples of Good Adjustments:**
- If players always pick subsidy → maybe increase its cost or reduce effectiveness (make trade-offs harder)
- If AQI always spikes to 500+ → increase action impacts or reduce baseline emissions (restore agency)
- If players ignore vehicle bans → increase their effectiveness or reduce cost (make attractive)
- If game feels deterministic → increase variance in weather or behavioral responses

**Output Format:**
{{
  "parameter_updates": {{
    "compliance_decay_rate": 0.07,
    "farmer_subsidy_effectiveness": 0.5,
    // ... other parameters
  }},
  "reasoning": {{
    "summary": "Players feel helpless as AQI spikes uncontrollably. Increasing action impacts.",
    "observations": [
      "AQI went from 150 → 400 despite strong actions",
      "Players expressed frustration in deliberation",
      "Subsidy chosen but had minimal effect"
    ],
    "interventions": [
      "Increase farmer_subsidy_effectiveness from 0.6 to 0.7 (+17%)",
      "Increase aqi_improvement_multiplier from 1.0 to 1.2 (+20%)"
    ],
    "expected_effects": [
      "Subsidy will reduce burning by 42% instead of 36%",
      "All actions will have 20% more impact on AQI",
      "Players should feel more agency in next round"
    ]
  }}
}}

**Important:** Only include parameters you want to change in parameter_updates. Omitted parameters stay the same.
"""

        return prompt

    def _apply_updates_safely(
        self,
        current: ModelParameters,
        updates: Dict[str, float]
    ) -> ModelParameters:
        """
        Apply LLM-recommended updates with safety bounds.

        Bounds:
        - All parameters > 0
        - Effectiveness parameters ∈ [0, 1]
        - Changes limited to ±20% per round (avoid wild swings)
        """
        new_params = ModelParameters(**asdict(current))

        for param_name, new_value in updates.items():
            if not hasattr(new_params, param_name):
                self.logger.warning(f"Unknown parameter: {param_name}, skipping")
                continue

            old_value = getattr(new_params, param_name)

            # Safety check: Bound change to ±20%
            max_change = abs(old_value * 0.2)
            if abs(new_value - old_value) > max_change:
                new_value = old_value + np.sign(new_value - old_value) * max_change
                self.logger.warning(
                    f"{param_name}: LLM suggested {new_value:.2f}, "
                    f"bounded to ±20% of {old_value:.2f}"
                )

            # Safety check: Parameter-specific bounds
            if param_name.endswith('_effectiveness'):
                new_value = max(0.0, min(1.0, new_value))

            if param_name.endswith('_rate') or param_name.endswith('_coefficient'):
                new_value = max(0.0, new_value)

            if param_name == 'stubble_burning_base':
                new_value = max(100, min(5000, new_value))  # Plausible range

            setattr(new_params, param_name, new_value)

            self.logger.info(
                f"Updated {param_name}: {old_value:.3f} → {new_value:.3f} "
                f"({(new_value/old_value - 1)*100:+.1f}%)"
            )

        return new_params

    def get_parameter_history(self) -> List[Dict]:
        """Return full history of parameter evolution"""
        return self.parameter_history


class AdaptiveGameOrchestrator:
    """
    Orchestrates adaptive TTX gameplay.

    Flow:
    1. Run formal models with current parameters
    2. Observe player behavior and outcomes
    3. LLM evolution operator proposes parameter adjustments
    4. Apply updates for next round
    5. Repeat

    This creates a game that "learns" from player behavior.
    """

    def __init__(self, base_models: Dict, llm_operator: LLMEvolutionOperator):
        self.models = base_models
        self.evolution_operator = llm_operator
        self.current_params = ModelParameters()
        self.logger = logging.getLogger("AdaptiveOrchestrator")

    def run_round(
        self,
        round_num: int,
        player_actions: List[Dict],
        weather: Dict
    ) -> Dict:
        """
        Run one round with adaptive parameter evolution.

        Returns:
            {
                'simulation_results': {...},
                'parameter_updates': {...},
                'evolution_reasoning': {...}
            }
        """
        self.logger.info(f"=== Running Adaptive Round {round_num} ===")

        # 1. Run formal models with current parameters
        sim_results = self._run_simulation(player_actions, weather)

        # 2. Observe gameplay
        observation = self._build_observation(
            round_num,
            player_actions,
            sim_results
        )

        # 3. LLM evolution (only every 2 rounds to avoid overfitting)
        if round_num % 2 == 0 and round_num < 5:
            updated_params, reasoning = self.evolution_operator.evolve_parameters(
                self.current_params,
                observation
            )
            self.current_params = updated_params
        else:
            reasoning = {"summary": "No evolution this round"}

        return {
            'simulation_results': sim_results,
            'parameter_updates': asdict(self.current_params),
            'evolution_reasoning': reasoning
        }

    def _run_simulation(self, actions: List[Dict], weather: Dict) -> Dict:
        """Run formal models with current parameters"""
        # TODO: Integrate with actual models
        # For now, placeholder

        return {
            'aqi': 250,
            'emissions': 2500,
            'hospitalizations': 900
        }

    def _build_observation(
        self,
        round_num: int,
        actions: List[Dict],
        sim_results: Dict
    ) -> GameplayObservation:
        """Build observation from round data"""
        # TODO: Implement full observation construction
        return GameplayObservation(
            round_num=round_num,
            player_count=len(actions),
            actions_taken=actions,
            aqi_trajectory=[150, 200, 250],
            budget_spent_per_round=[200, 300, 100],
            player_engagement_signals={
                'deliberation_time_seconds': 480,
                'action_diversity': 0.6
            }
        )


# Example usage
if __name__ == "__main__":
    print("=== LLM Evolution Operator Demo ===\n")

    # Setup
    llm_op = LLMEvolutionOperator()

    # Initial parameters
    params = ModelParameters()

    # Simulate gameplay observation
    observation = GameplayObservation(
        round_num=3,
        player_count=6,
        actions_taken=[
            {"player": "CM", "action": "subsidy_farmers", "cost": 300},
            {"player": "ENV", "action": "vehicle_ban", "cost": 10},
            {"player": "FARMER", "action": "wait", "cost": 0}
        ],
        aqi_trajectory=[150, 280, 420],
        budget_spent_per_round=[200, 310, 50],
        player_engagement_signals={
            'deliberation_time_seconds': 300,
            'action_diversity': 0.5,
            'frustration_detected': True
        },
        dominant_strategy="subsidy + vehicle ban",
        coordination_quality=0.6,
        difficulty_perception="too hard"
    )

    # Evolve parameters
    print("Current Parameters:")
    print(json.dumps(asdict(params), indent=2))
    print("\n" + "="*60 + "\n")

    updated_params, reasoning = llm_op.evolve_parameters(params, observation)

    print("\nEvolution Reasoning:")
    print(json.dumps(reasoning, indent=2))

    print("\n" + "="*60 + "\n")

    print("Updated Parameters:")
    print(json.dumps(asdict(updated_params), indent=2))

    print("\n=== Demo Complete ===")
