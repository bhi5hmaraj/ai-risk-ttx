"""
Scenario Validator for Architect Mode

Phase 3 of the Architect workflow: Validate scenario before deployment.

Usage:
    validator = ScenarioValidator()

    # Load compiled scenario
    with open("compiled_scenario.json") as f:
        scenario = json.load(f)

    # Run all validations
    report = validator.validate(scenario, num_simulations=10)

    # Check results
    if report["all_checks_passed"]:
        print("Scenario ready for deployment!")
    else:
        print("Issues found:", report["issues"])
        print("Suggestions:", report["suggestions"])
"""

import json
import random
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
from collections import defaultdict


class ScenarioValidator:
    """
    Validates compiled scenario for consistency, balance, and playability.

    Runs three types of checks:
    1. Consistency: Logical contradictions, invalid values
    2. Balance: Can scenario be won/lost? Are roles balanced?
    3. Playability: Meaningful choices, pacing, narrative coherence
    """

    def __init__(self):
        self.validation_results = {}

    def validate(
        self,
        scenario: Dict[str, Any],
        num_simulations: int = 10,
        verbose: bool = True
    ) -> Dict[str, Any]:
        """
        Run all validation checks.

        Args:
            scenario: Compiled scenario JSON
            num_simulations: Number of simulated games for balance testing
            verbose: Print progress messages

        Returns:
            Validation report matching SCENARIO_SCHEMA validation_report section
        """
        if verbose:
            print("Running scenario validation...")

        report = {
            "validated_at": datetime.utcnow().isoformat() + "Z",
            "validator_version": "1.0",

            "consistency_checks": self._run_consistency_checks(scenario, verbose),
            "balance_checks": self._run_balance_checks(scenario, num_simulations, verbose),
            "playability_checks": self._run_playability_checks(scenario, verbose),

            "issues": [],
            "warnings": [],
            "suggestions": [],

            "gm_overrides": []
        }

        # Aggregate results
        all_passed = (
            report["consistency_checks"]["all_passed"] and
            len(report["issues"]) == 0
        )

        report["all_checks_passed"] = all_passed

        # Collect issues
        if not report["consistency_checks"]["all_passed"]:
            for check in report["consistency_checks"]["checks"]:
                if not check["passed"]:
                    report["issues"].append(f"Consistency: {check['name']} failed - {check.get('reason', '')}")

        # Collect warnings from balance checks
        balance = report["balance_checks"]
        if balance["win_rate"] < 0.2:
            report["warnings"].append(f"Very low win rate ({balance['win_rate']:.0%}). Scenario may be too hard.")
        elif balance["win_rate"] > 0.8:
            report["warnings"].append(f"Very high win rate ({balance['win_rate']:.0%}). Scenario may be too easy.")

        if balance.get("dominant_strategy_detected"):
            report["issues"].append("Dominant strategy detected. One approach always wins.")

        # Playability warnings
        playability = report["playability_checks"]
        if playability["avg_meaningful_choices_per_round"] < 2.0:
            report["warnings"].append("Low number of meaningful choices per round (<2). May feel restrictive.")

        if verbose:
            print(f"\n{'='*50}")
            print(f"Validation Complete")
            print(f"{'='*50}")
            print(f"All checks passed: {all_passed}")
            print(f"Issues: {len(report['issues'])}")
            print(f"Warnings: {len(report['warnings'])}")
            print(f"Win rate: {balance['win_rate']:.0%}")

        return report

    def _run_consistency_checks(
        self,
        scenario: Dict[str, Any],
        verbose: bool
    ) -> Dict[str, Any]:
        """
        Check logical consistency.

        Checks:
        - Required fields present
        - Initial values within bounds
        - Win conditions non-contradictory
        - Event triggers reachable
        - Stakeholder budgets match initial state
        """
        if verbose:
            print("  Running consistency checks...")

        checks = []

        # Check 1: Required fields
        check = self._check_required_fields(scenario)
        checks.append(check)

        # Check 2: Initial values in bounds
        check = self._check_initial_values_bounds(scenario)
        checks.append(check)

        # Check 3: Win conditions non-contradictory
        check = self._check_win_conditions(scenario)
        checks.append(check)

        # Check 4: Event triggers reachable
        check = self._check_event_triggers(scenario)
        checks.append(check)

        # Check 5: Budget consistency
        check = self._check_budget_consistency(scenario)
        checks.append(check)

        all_passed = all(c["passed"] for c in checks)

        return {
            "all_passed": all_passed,
            "checks": checks
        }

    def _check_required_fields(self, scenario: Dict) -> Dict[str, Any]:
        """Check all required fields are present."""
        required = [
            "schema_version",
            "metadata",
            "initial_state",
            "stakeholders",
            "events",
            "parameters",
            "win_conditions",
            "narrative_config"
        ]

        missing = [field for field in required if field not in scenario]

        return {
            "name": "required_fields_present",
            "passed": len(missing) == 0,
            "reason": f"Missing fields: {missing}" if missing else None
        }

    def _check_initial_values_bounds(self, scenario: Dict) -> Dict[str, Any]:
        """Check initial state values are within reasonable bounds."""
        state = scenario.get("initial_state", {})

        issues = []

        # AQI should be 0-500+
        if "aqi" in state:
            if state["aqi"] < 0 or state["aqi"] > 999:
                issues.append(f"AQI out of reasonable range: {state['aqi']}")

        # Budgets should be positive
        for key, value in state.items():
            if "budget" in key.lower():
                if value < 0:
                    issues.append(f"{key} is negative: {value}")

        # Rates/compliance should be 0-1
        for key, value in state.items():
            if any(term in key.lower() for term in ["compliance", "rate", "capacity"]):
                if isinstance(value, (int, float)):
                    if value < 0 or value > 1:
                        issues.append(f"{key} should be in [0,1]: {value}")

        return {
            "name": "initial_values_in_bounds",
            "passed": len(issues) == 0,
            "reason": "; ".join(issues) if issues else None
        }

    def _check_win_conditions(self, scenario: Dict) -> Dict[str, Any]:
        """Check win conditions are achievable and non-contradictory."""
        win_conditions = scenario.get("win_conditions", {})
        issues = []

        public_goal = win_conditions.get("public_goal", {})
        conditions = public_goal.get("conditions", [])

        # Check for contradictory thresholds
        metric_conditions = defaultdict(list)
        for cond in conditions:
            metric_conditions[cond["metric"]].append(cond)

        for metric, conds in metric_conditions.items():
            if len(conds) > 1:
                # Check for contradictions
                for i, c1 in enumerate(conds):
                    for c2 in conds[i+1:]:
                        if self._conditions_contradict(c1, c2):
                            issues.append(f"Contradictory conditions for {metric}: {c1['operator']} {c1['threshold']} vs {c2['operator']} {c2['threshold']}")

        return {
            "name": "win_conditions_non_contradictory",
            "passed": len(issues) == 0,
            "reason": "; ".join(issues) if issues else None
        }

    def _conditions_contradict(self, c1: Dict, c2: Dict) -> bool:
        """Check if two conditions contradict each other."""
        # Example: x > 100 AND x < 50 is contradictory
        op1, thresh1 = c1["operator"], c1["threshold"]
        op2, thresh2 = c2["operator"], c2["threshold"]

        if op1 == ">" and op2 == "<":
            return thresh1 >= thresh2
        if op1 == "<" and op2 == ">":
            return thresh1 <= thresh2

        return False

    def _check_event_triggers(self, scenario: Dict) -> Dict[str, Any]:
        """Check that event triggers are reachable."""
        events = scenario.get("events", [])
        issues = []

        for event in events:
            trigger = event.get("trigger", {})

            # Scheduled events: Check round is valid
            if event["type"] == "scheduled":
                round_num = trigger.get("round")
                max_rounds = scenario["metadata"]["duration"]["rounds"]

                if round_num is None:
                    issues.append(f"Event {event['id']}: Missing round number")
                elif round_num > max_rounds:
                    issues.append(f"Event {event['id']}: Trigger round {round_num} exceeds max rounds {max_rounds}")

            # Conditional events: Basic syntax check
            elif event["type"] == "conditional":
                condition = trigger.get("condition")
                if not condition:
                    issues.append(f"Event {event['id']}: Missing condition")
                # TODO: Parse and validate condition syntax

        return {
            "name": "event_triggers_reachable",
            "passed": len(issues) == 0,
            "reason": "; ".join(issues) if issues else None
        }

    def _check_budget_consistency(self, scenario: Dict) -> Dict[str, Any]:
        """Check stakeholder budgets match initial state."""
        initial_state = scenario.get("initial_state", {})
        stakeholders = scenario.get("stakeholders", [])

        issues = []

        for stakeholder in stakeholders:
            resources = stakeholder.get("initial_resources", {})
            budget = resources.get("budget")

            if budget is not None:
                # Check if corresponding state variable exists
                state_key = f"budget_{stakeholder['id']}"
                if state_key in initial_state:
                    if initial_state[state_key] != budget:
                        issues.append(f"Budget mismatch for {stakeholder['id']}: state={initial_state[state_key]}, resources={budget}")

        return {
            "name": "budget_consistency",
            "passed": len(issues) == 0,
            "reason": "; ".join(issues) if issues else None
        }

    def _run_balance_checks(
        self,
        scenario: Dict[str, Any],
        num_simulations: int,
        verbose: bool
    ) -> Dict[str, Any]:
        """
        Run balance checks through simulation.

        Simulates games with different AI strategies:
        - Optimal (always best action)
        - Random (random actions)
        - Cooperative (maximize public score)
        - Selfish (maximize hidden score)

        Measures:
        - Win rate (should be 0.4-0.6 for balanced)
        - Role win rates (should be similar)
        - Dominant strategy detection
        """
        if verbose:
            print(f"  Running balance checks ({num_simulations} simulations)...")

        results = []

        for i in range(num_simulations):
            strategy = self._choose_simulation_strategy(i, num_simulations)
            result = self._simulate_game(scenario, strategy, verbose=False)
            results.append(result)

        # Aggregate results
        wins = sum(1 for r in results if r["won"])
        win_rate = wins / num_simulations

        avg_final_aqi = sum(r["final_state"]["aqi"] for r in results) / num_simulations

        # Role-specific win rates
        role_wins = defaultdict(int)
        role_games = defaultdict(int)

        for result in results:
            for role, won in result.get("role_outcomes", {}).items():
                role_games[role] += 1
                if won:
                    role_wins[role] += 1

        role_win_rates = {
            role: role_wins[role] / role_games[role] if role_games[role] > 0 else 0
            for role in role_games
        }

        # Detect dominant strategy
        dominant_strategy = self._detect_dominant_strategy(results)

        if verbose:
            print(f"    Win rate: {win_rate:.0%}")
            print(f"    Avg final AQI: {avg_final_aqi:.0f}")

        return {
            "simulation_runs": num_simulations,
            "win_rate": win_rate,
            "avg_final_aqi": avg_final_aqi,
            "role_win_rates": role_win_rates,
            "dominant_strategy_detected": dominant_strategy is not None,
            "dominant_strategy": dominant_strategy
        }

    def _choose_simulation_strategy(self, iteration: int, total: int) -> str:
        """Choose simulation strategy for this iteration."""
        strategies = ["optimal", "random", "cooperative", "selfish"]
        return strategies[iteration % len(strategies)]

    def _simulate_game(
        self,
        scenario: Dict[str, Any],
        strategy: str,
        verbose: bool = False
    ) -> Dict[str, Any]:
        """
        Simulate a single game.

        Simplified simulation:
        - Initialize state
        - Each round: Apply random/strategic actions
        - Trigger events
        - Check win/lose conditions

        Returns game outcome.
        """
        # Initialize
        state = scenario["initial_state"].copy()
        rounds = scenario["metadata"]["duration"]["rounds"]

        for round_num in range(1, rounds + 1):
            # Simulate actions based on strategy
            if strategy == "random":
                aqi_delta = random.randint(-30, 30)
            elif strategy == "optimal":
                aqi_delta = -20  # Always improve
            elif strategy == "cooperative":
                aqi_delta = -15
            elif strategy == "selfish":
                aqi_delta = random.randint(-10, 10)
            else:
                aqi_delta = 0

            state["aqi"] = max(0, state["aqi"] + aqi_delta)

            # Check events
            for event in scenario.get("events", []):
                if self._should_trigger_event(event, round_num, state):
                    state = self._apply_event_effects(event, state)

            # Check failure conditions
            if self._check_failure(scenario, state):
                return {
                    "won": False,
                    "final_state": state,
                    "rounds_survived": round_num,
                    "role_outcomes": {}
                }

        # Check win conditions
        won = self._check_win(scenario, state)

        return {
            "won": won,
            "final_state": state,
            "rounds_survived": rounds,
            "role_outcomes": {}  # TODO: Implement role-specific outcomes
        }

    def _should_trigger_event(self, event: Dict, round_num: int, state: Dict) -> bool:
        """Check if event should trigger this round."""
        if event["type"] == "scheduled":
            return event["trigger"].get("round") == round_num

        elif event["type"] == "conditional":
            # Simplified condition evaluation
            # For complex conditions, just skip in simulation
            # (real game engine would have full condition evaluator)
            condition = event["trigger"].get("condition", "")

            # Basic parsing: "aqi > 400" (single condition only)
            if "aqi >" in condition and " AND " not in condition:
                try:
                    threshold = int(condition.split(">")[1].strip())
                    return state.get("aqi", 0) > threshold
                except (ValueError, IndexError):
                    # Can't parse, skip
                    return False

            # Skip complex conditions in simulation
            # TODO: Implement full condition parser
            return False

        return False

    def _apply_event_effects(self, event: Dict, state: Dict) -> Dict:
        """Apply event effects to state."""
        effects = event.get("effects", {})

        for key, value in effects.items():
            if key in state:
                if isinstance(value, str):
                    if value.startswith("+") or value.startswith("-"):
                        delta = int(value)
                        state[key] += delta
                    elif value.startswith("*"):
                        multiplier = float(value[1:])
                        state[key] *= multiplier

        return state

    def _check_failure(self, scenario: Dict, state: Dict) -> bool:
        """Check if failure conditions met."""
        failure_conditions = scenario.get("win_conditions", {}).get("failure_conditions", [])

        for condition in failure_conditions:
            metric = condition["metric"]
            operator = condition["operator"]
            threshold = condition["threshold"]

            if metric not in state:
                continue

            value = state[metric]

            if operator == ">" and value > threshold:
                return True
            elif operator == "<" and value < threshold:
                return True

        return False

    def _check_win(self, scenario: Dict, state: Dict) -> bool:
        """Check if win conditions met."""
        public_goal = scenario.get("win_conditions", {}).get("public_goal", {})
        conditions = public_goal.get("conditions", [])

        for condition in conditions:
            metric = condition["metric"]
            operator = condition["operator"]
            threshold = condition["threshold"]

            # Special case: rounds_completed
            if metric == "rounds_completed":
                continue  # Assumed completed if we reach here

            if metric not in state:
                return False

            value = state[metric]

            if operator == "<" and value >= threshold:
                return False
            elif operator == ">" and value <= threshold:
                return False
            elif operator == "==" and value != threshold:
                return False

        return True

    def _detect_dominant_strategy(self, results: List[Dict]) -> Optional[str]:
        """Detect if one strategy always wins."""
        # Simplified: Check if win rate is 100% for any strategy
        # In reality, would need to track strategy per simulation
        return None

    def _run_playability_checks(
        self,
        scenario: Dict[str, Any],
        verbose: bool
    ) -> Dict[str, Any]:
        """
        Check playability factors.

        Checks:
        - Meaningful choices per round
        - Budget pacing (don't run out too early)
        - Event spacing (not too many in one round)
        - Narrative coherence
        """
        if verbose:
            print("  Running playability checks...")

        # Estimate meaningful choices
        # Assume 5 action options per stakeholder per round
        num_stakeholders = len(scenario.get("stakeholders", []))
        avg_choices = 5 * num_stakeholders  # Simplified

        # Check budget pacing
        rounds = scenario["metadata"]["duration"]["rounds"]
        initial_budgets = {
            k: v for k, v in scenario["initial_state"].items()
            if "budget" in k.lower()
        }

        total_budget = sum(initial_budgets.values())
        avg_budget_per_round = total_budget / rounds if rounds > 0 else 0

        # Warn if budget is very constrained
        warnings = []
        if avg_budget_per_round < 100:
            warnings.append({
                "round": "all",
                "avg_budget_remaining": avg_budget_per_round,
                "status": "tight budget, may limit late-game options"
            })

        return {
            "avg_meaningful_choices_per_round": avg_choices / rounds if rounds > 0 else 0,
            "round_budget_warnings": warnings
        }

    def save_report(self, report: Dict[str, Any], output_path: str):
        """Save validation report to JSON."""
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        print(f"Saved validation report to {output_path}")


# CLI interface
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Validate compiled scenario")
    parser.add_argument("--scenario", required=True, help="Compiled scenario JSON file")
    parser.add_argument("--simulations", type=int, default=10, help="Number of simulation runs")
    parser.add_argument("--output", help="Output validation report JSON")

    args = parser.parse_args()

    # Load scenario
    with open(args.scenario) as f:
        scenario = json.load(f)

    # Validate
    validator = ScenarioValidator()
    report = validator.validate(scenario, num_simulations=args.simulations, verbose=True)

    # Save if output specified
    if args.output:
        validator.save_report(report, args.output)

    # Print summary
    print(f"\n{'='*50}")
    if report["all_checks_passed"]:
        print("✅ Scenario is valid and ready for deployment!")
    else:
        print("❌ Validation failed")
        print("\nIssues:")
        for issue in report["issues"]:
            print(f"  - {issue}")

    if report["warnings"]:
        print("\nWarnings:")
        for warning in report["warnings"]:
            print(f"  - {warning}")
