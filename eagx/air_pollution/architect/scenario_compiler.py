"""
Scenario Compiler for Architect Mode

Phase 2 of the Architect workflow: Compile extracted blocks into executable scenario.

Usage:
    compiler = ScenarioCompiler()

    # Load extracted blocks
    with open("extracted_scenario.json") as f:
        extraction = json.load(f)

    # GM configuration
    config = {
        "difficulty": "medium",
        "rounds": 5,
        "minutes_per_round": 8
    }

    # Compile to executable scenario
    scenario = compiler.compile(extraction, config)

    # Save scenario file
    compiler.save_scenario(scenario, "october_crisis_2024.json")
"""

import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from pathlib import Path


class ScenarioCompiler:
    """
    Compiles extracted scenario blocks into executable scenario file.

    Architecture:
        Extracted Blocks + GM Config → Scenario JSON (matches SCENARIO_SCHEMA.md)
    """

    def __init__(self):
        self.schema_version = "1.0"
        self.difficulty_presets = self._load_difficulty_presets()

    def compile(
        self,
        extraction: Dict[str, Any],
        gm_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Main compilation: Extracted blocks → Executable scenario.

        Args:
            extraction: Output from DocumentIngestion
            gm_config: GM's configuration choices
                - difficulty: "easy" | "medium" | "hard"
                - rounds: int (default 5)
                - minutes_per_round: int (default 8)
                - selected_stakeholders: list of IDs (optional, uses all if not specified)
                - win_conditions: custom win conditions (optional)

        Returns:
            Complete scenario matching SCENARIO_SCHEMA.md
        """
        scenario = {
            "schema_version": self.schema_version,
            "metadata": self._compile_metadata(extraction, gm_config),
            "initial_state": self._compile_initial_state(extraction, gm_config),
            "stakeholders": self._compile_stakeholders(extraction, gm_config),
            "events": self._compile_events(extraction, gm_config),
            "parameters": self._compile_parameters(extraction, gm_config),
            "win_conditions": self._compile_win_conditions(extraction, gm_config),
            "narrative_config": self._compile_narrative_config(extraction, gm_config),
            "validation_report": None  # To be filled by validator
        }

        return scenario

    def _compile_metadata(
        self,
        extraction: Dict[str, Any],
        gm_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compile scenario metadata."""
        return {
            "id": gm_config.get("scenario_id", "custom_scenario"),
            "name": gm_config.get("name", "Custom Air Pollution Crisis"),
            "description": gm_config.get("description", "Navigate a complex air pollution crisis with multiple stakeholders"),
            "author": gm_config.get("author", "Game Master"),
            "created_at": datetime.utcnow().isoformat() + "Z",
            "version": "1.0",

            "target_audience": gm_config.get("target_audience", "graduate_students"),
            "difficulty": gm_config.get("difficulty", "medium"),

            "learning_objectives": gm_config.get("learning_objectives", [
                "Understand multi-stakeholder coordination challenges",
                "Experience policy trade-offs between competing objectives",
                "Navigate temporal and resource constraints"
            ]),

            "duration": {
                "rounds": gm_config.get("rounds", 5),
                "minutes_per_round": gm_config.get("minutes_per_round", 8),
                "estimated_total_minutes": self._estimate_duration(gm_config)
            },

            "tags": gm_config.get("tags", ["air_pollution", "coordination", "crisis_response"]),

            "source_documents": extraction.get("_metadata", {}).get("source_documents", [])
        }

    def _estimate_duration(self, gm_config: Dict) -> int:
        """Estimate total session time in minutes."""
        rounds = gm_config.get("rounds", 5)
        mins_per_round = gm_config.get("minutes_per_round", 8)

        # Round time + briefing (10 min) + debrief (15 min) + buffer (20%)
        total = rounds * mins_per_round + 10 + 15
        return int(total * 1.2)

    def _compile_initial_state(
        self,
        extraction: Dict[str, Any],
        gm_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compile initial state from extraction."""
        initial = extraction.get("initial_conditions", {}).copy()

        # Apply difficulty adjustments
        difficulty = gm_config.get("difficulty", "medium")
        if difficulty in self.difficulty_presets:
            multipliers = self.difficulty_presets[difficulty]["multipliers"]

            # Adjust budgets
            for key in initial:
                if "budget" in key.lower():
                    initial[key] *= multipliers["budget"]

        # GM overrides
        if "initial_state_overrides" in gm_config:
            initial.update(gm_config["initial_state_overrides"])

        return initial

    def _compile_stakeholders(
        self,
        extraction: Dict[str, Any],
        gm_config: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Compile stakeholder definitions."""
        extracted_stakeholders = extraction.get("stakeholders", [])

        # Filter by selected IDs if specified
        selected_ids = gm_config.get("selected_stakeholders")
        if selected_ids:
            extracted_stakeholders = [
                s for s in extracted_stakeholders
                if s["id"] in selected_ids
            ]

        stakeholders = []
        for i, extracted in enumerate(extracted_stakeholders):
            stakeholder = {
                "id": extracted["id"],
                "name": extracted["name"],
                "description": extracted.get("description", ""),

                "public_objective": {
                    "short": extracted["public_objective"][:50],  # Truncate for UI
                    "detailed": extracted["public_objective"]
                },

                "hidden_objective": self._select_hidden_objective(
                    extracted,
                    gm_config,
                    i
                ),

                "initial_resources": extracted.get("resources", {}),

                "constraints": extracted.get("constraints", []),

                "action_permissions": self._compile_action_permissions(
                    extracted,
                    gm_config
                ),

                "ai_persona": self._compile_ai_persona(extracted, gm_config)
            }

            stakeholders.append(stakeholder)

        return stakeholders

    def _select_hidden_objective(
        self,
        extracted: Dict[str, Any],
        gm_config: Dict[str, Any],
        index: int
    ) -> Dict[str, Any]:
        """Select or generate hidden objective for stakeholder."""
        # Check if GM specified custom hidden objectives
        custom_objectives = gm_config.get("hidden_objectives", {})
        if extracted["id"] in custom_objectives:
            return {
                "condition": custom_objectives[extracted["id"]]["condition"],
                "description": custom_objectives[extracted["id"]]["description"]
            }

        # Use first potential hidden objective from extraction
        potentials = extracted.get("potential_hidden_objectives", [])
        if potentials:
            # Convert first objective to condition format
            # TODO: Use LLM to convert natural language to formal condition
            return {
                "condition": "custom_condition_placeholder",
                "description": potentials[0]
            }

        # Fallback: Generic hidden objective
        return {
            "condition": "score_delta > 0",
            "description": "Achieve your public objective while maintaining influence"
        }

    def _compile_action_permissions(
        self,
        extracted: Dict[str, Any],
        gm_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compile action permissions based on stakeholder constraints."""
        # Parse constraints to determine permissions
        constraints = extracted.get("constraints", [])

        # Default: All primitives allowed
        allowed = [
            "SUBSIDIZE", "TAX", "BAN", "MANDATE", "MONITOR",
            "PUBLICIZE", "NEGOTIATE", "BUILD", "RESEARCH",
            "ENFORCE", "COORDINATE", "REGULATE"
        ]

        forbidden = []

        # Parse constraints for restrictions
        for constraint in constraints:
            lower = constraint.lower()
            if "cannot" in lower or "no authority" in lower:
                # Try to extract forbidden action
                if "force" in lower or "negotiate" in lower:
                    if "NEGOTIATE" in allowed:
                        allowed.remove("NEGOTIATE")
                        forbidden.append("NEGOTIATE")

        budget_limit = extracted.get("resources", {}).get("budget", 1000)

        # GM overrides
        if "action_restrictions" in gm_config:
            restrictions = gm_config["action_restrictions"].get(extracted["id"], {})
            allowed = restrictions.get("can_use", allowed)
            forbidden = restrictions.get("cannot_use", forbidden)

        return {
            "allowed_primitives": allowed,
            "forbidden_primitives": forbidden,
            "budget_limit": budget_limit,
            "geographic_scope": extracted.get("geographic_scope", "regional")
        }

    def _compile_ai_persona(
        self,
        extracted: Dict[str, Any],
        gm_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compile AI persona for non-player stakeholder."""
        # Infer strategy from objectives
        strategy = f"Balance {extracted['public_objective'].split()[0].lower()} objectives with resource constraints"

        # Infer risk tolerance from description
        risk_tolerance = "moderate"  # Default
        desc_lower = extracted.get("description", "").lower()
        if "aggressive" in desc_lower or "activist" in desc_lower:
            risk_tolerance = "high"
        elif "cautious" in desc_lower or "conservative" in desc_lower:
            risk_tolerance = "low"

        return {
            "strategy": strategy,
            "risk_tolerance": risk_tolerance,
            "priority_order": ["public_objective", "hidden_objective", "budget"]
        }

    def _compile_events(
        self,
        extraction: Dict[str, Any],
        gm_config: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Compile event definitions."""
        extracted_events = extraction.get("events", [])
        difficulty = gm_config.get("difficulty", "medium")

        events = []
        for extracted in extracted_events:
            event = {
                "id": extracted["id"],
                "name": extracted["name"],
                "type": extracted["type"],
                "trigger": extracted["trigger"],

                "effects": self._apply_difficulty_to_effects(
                    extracted["effects"],
                    difficulty
                ),

                "narrative": {
                    "template": extracted.get("narrative_template", ""),
                    "media_headline": extracted.get("media_headline", f"{extracted['name']}: Crisis Deepens")
                },

                "flavor": {
                    "severity": self._infer_severity(extracted),
                    "tone": "crisis",
                    "visual_cue": self._infer_visual_cue(extracted)
                }
            }

            events.append(event)

        # Add GM custom events
        if "custom_events" in gm_config:
            events.extend(gm_config["custom_events"])

        return events

    def _apply_difficulty_to_effects(
        self,
        effects: Dict[str, Any],
        difficulty: str
    ) -> Dict[str, Any]:
        """Adjust event severity based on difficulty."""
        if difficulty not in self.difficulty_presets:
            return effects

        multiplier = self.difficulty_presets[difficulty]["multipliers"]["event_severity"]

        adjusted = {}
        for key, value in effects.items():
            if isinstance(value, str) and (value.startswith("+") or value.startswith("-")):
                # Parse numeric delta
                try:
                    delta = int(value)
                    adjusted[key] = f"{int(delta * multiplier):+d}"
                except ValueError:
                    adjusted[key] = value
            else:
                adjusted[key] = value

        return adjusted

    def _infer_severity(self, event: Dict) -> str:
        """Infer event severity from effects."""
        effects = event.get("effects", {})

        # Count large impacts
        large_impacts = sum(
            1 for v in effects.values()
            if isinstance(v, str) and abs(int(v.replace("+", "").replace("-", "")) if v.replace("+", "").replace("-", "").isdigit() else 0) > 50
        )

        if large_impacts >= 2:
            return "high"
        elif large_impacts == 1:
            return "medium"
        else:
            return "low"

    def _infer_visual_cue(self, event: Dict) -> str:
        """Infer visual cue from event type."""
        name_lower = event.get("name", "").lower()

        if "court" in name_lower or "legal" in name_lower:
            return "legal alert"
        elif "fire" in name_lower or "spike" in name_lower:
            return "red alert"
        elif "protest" in name_lower or "social" in name_lower:
            return "social unrest"
        else:
            return "warning"

    def _compile_parameters(
        self,
        extraction: Dict[str, Any],
        gm_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compile model parameters from extraction."""
        params = extraction.get("key_parameters", {}).copy()

        # Add difficulty settings
        difficulty = gm_config.get("difficulty", "medium")
        params["difficulty"] = self.difficulty_presets.get(difficulty, self.difficulty_presets["medium"])

        # GM parameter overrides
        if "parameter_overrides" in gm_config:
            # Deep merge
            for key, value in gm_config["parameter_overrides"].items():
                if key in params and isinstance(params[key], dict):
                    params[key].update(value)
                else:
                    params[key] = value

        return params

    def _compile_win_conditions(
        self,
        extraction: Dict[str, Any],
        gm_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compile win/lose conditions."""
        # GM can fully specify, or use defaults
        if "win_conditions" in gm_config:
            return gm_config["win_conditions"]

        # Default win conditions
        rounds = gm_config.get("rounds", 5)

        win_conditions = {
            "public_goal": {
                "description": "Keep crisis manageable",
                "conditions": [
                    {
                        "metric": "aqi_average",
                        "operator": "<",
                        "threshold": 250,
                        "weight": 1.0
                    },
                    {
                        "metric": "rounds_completed",
                        "operator": "==",
                        "threshold": rounds,
                        "weight": 1.0
                    }
                ],
                "required": "all"
            },

            "hidden_goals": {},  # Populated from stakeholder hidden objectives

            "failure_conditions": [
                {
                    "metric": "aqi",
                    "operator": ">",
                    "threshold": 500,
                    "description": "Public health catastrophe",
                    "game_over": True
                },
                {
                    "metric": "budget",
                    "operator": "<",
                    "threshold": 0,
                    "description": "Bankruptcy",
                    "game_over": True
                }
            ]
        }

        return win_conditions

    def _compile_narrative_config(
        self,
        extraction: Dict[str, Any],
        gm_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compile narrative generation configuration."""
        return {
            "tone": gm_config.get("narrative_tone", "serious_journalistic"),
            "detail_level": gm_config.get("narrative_detail", "medium"),
            "region_specificity": "delhi",

            "llm_settings": {
                "model": gm_config.get("llm_model", "gemini-2.0-flash-exp"),
                "temperature": 0.7,
                "system_prompt": "You are a game master for a policy simulation...",

                "narrative_constraints": [
                    "Use Delhi-specific references (India Gate, Connaught Place, etc.)",
                    "Reference real policies (GRAP, odd-even, Happy Seeder)",
                    "Include diverse perspectives (farmers, patients, activists)",
                    "Maintain scientific accuracy (cite actual AQI thresholds)"
                ]
            },

            "templates": {
                "round_intro": "Round {round}: {date_range}. Current AQI: {aqi} ({regime}). {weather_description}",

                "consequence_structure": [
                    "Opening: Describe initial state",
                    "Action effects: What changed due to player actions",
                    "Emergent dynamics: Unintended consequences",
                    "Stakeholder reactions: Quotes from affected parties",
                    "Forward tension: What's at stake next round"
                ],

                "media_headline_style": "Delhi Times journalistic"
            },

            "character_database": {
                "farmer_names": ["Ram Singh", "Gurpreet Kaur", "Amarjit Singh"],
                "locations": ["Ludhiana", "Karnal", "Rohtak", "Meerut"],
                "hospitals": ["AIIMS", "RML Hospital", "GTB Hospital"]
            }
        }

    def _load_difficulty_presets(self) -> Dict[str, Any]:
        """Load difficulty preset configurations."""
        return {
            "easy": {
                "multipliers": {
                    "budget": 1.5,
                    "action_effectiveness": 1.3,
                    "event_severity": 0.7,
                    "time_pressure": 1.0
                },
                "constraints": {
                    "allow_deficit_spending": True,
                    "allow_cross_jurisdiction_actions": True,
                    "strict_timeline": False
                }
            },

            "medium": {
                "multipliers": {
                    "budget": 1.0,
                    "action_effectiveness": 1.0,
                    "event_severity": 1.0,
                    "time_pressure": 1.0
                },
                "constraints": {
                    "allow_deficit_spending": False,
                    "allow_cross_jurisdiction_actions": False,
                    "strict_timeline": True
                }
            },

            "hard": {
                "multipliers": {
                    "budget": 0.7,
                    "action_effectiveness": 0.8,
                    "event_severity": 1.3,
                    "time_pressure": 1.2
                },
                "constraints": {
                    "allow_deficit_spending": False,
                    "allow_cross_jurisdiction_actions": False,
                    "strict_timeline": True
                }
            }
        }

    def save_scenario(self, scenario: Dict[str, Any], output_path: str):
        """Save compiled scenario to JSON file."""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(scenario, f, indent=2, ensure_ascii=False)

        print(f"Saved scenario to {output_path}")

        # Print summary
        print(f"\nScenario Summary:")
        print(f"  Name: {scenario['metadata']['name']}")
        print(f"  Stakeholders: {len(scenario['stakeholders'])}")
        print(f"  Events: {len(scenario['events'])}")
        print(f"  Rounds: {scenario['metadata']['duration']['rounds']}")
        print(f"  Difficulty: {scenario['metadata']['difficulty']}")

        # Estimate file size
        size_kb = len(json.dumps(scenario)) / 1024
        print(f"  File size: {size_kb:.1f} KB")


# CLI interface
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Compile scenario from extracted blocks")
    parser.add_argument("--input", required=True, help="Extracted scenario JSON")
    parser.add_argument("--output", default="compiled_scenario.json", help="Output scenario file")
    parser.add_argument("--difficulty", choices=["easy", "medium", "hard"], default="medium")
    parser.add_argument("--rounds", type=int, default=5)
    parser.add_argument("--name", help="Scenario name")

    args = parser.parse_args()

    # Load extraction
    with open(args.input) as f:
        extraction = json.load(f)

    # GM config
    config = {
        "difficulty": args.difficulty,
        "rounds": args.rounds
    }

    if args.name:
        config["name"] = args.name

    # Compile
    compiler = ScenarioCompiler()
    scenario = compiler.compile(extraction, config)

    # Save
    compiler.save_scenario(scenario, args.output)
