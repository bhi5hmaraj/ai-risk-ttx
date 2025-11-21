"""
Game Theory and Mechanism Design Layer for Delhi Air Pollution TTX

Provides formal game-theoretic analysis of player interactions:
- Nash equilibrium calculations
- Pareto optimality analysis
- Mechanism design for incentive alignment
- Coalition stability
- Social welfare optimization

This layer makes implicit game dynamics explicit for analysis and player learning.
"""

import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import itertools


class PlayerRole(Enum):
    """Player roles in the game"""
    CHIEF_MINISTER = "chief_minister"
    ENVIRONMENT_MINISTER = "environment_minister"
    FARMER_REP = "farmer_rep"
    INDUSTRY_LEADER = "industry_leader"
    HEALTH_DIRECTOR = "health_director"
    ACTIVIST = "activist"


@dataclass
class PlayerUtility:
    """
    Utility function for a player.

    U_i = α_i * Δ(Public Score) + β_i * Δ(Hidden Score) - γ_i * Cost

    Different roles weight public vs private objectives differently.
    """
    role: PlayerRole
    alpha: float  # Weight on public score (air quality)
    beta: float  # Weight on hidden objective
    gamma: float  # Cost sensitivity

    def evaluate(self, public_delta: float, hidden_delta: float, cost: float) -> float:
        """Compute utility for an outcome"""
        return self.alpha * public_delta + self.beta * hidden_delta - self.gamma * cost


# Utility profiles for each role
ROLE_UTILITIES = {
    PlayerRole.CHIEF_MINISTER: PlayerUtility(
        role=PlayerRole.CHIEF_MINISTER,
        alpha=0.4,  # Cares about public score (health)
        beta=0.5,   # But really cares about approval/re-election
        gamma=0.1   # Less sensitive to costs (can raise taxes)
    ),
    PlayerRole.ENVIRONMENT_MINISTER: PlayerUtility(
        role=PlayerRole.ENVIRONMENT_MINISTER,
        alpha=0.6,  # Primary mandate is air quality
        beta=0.3,   # Hidden: inter-state coordination success
        gamma=0.1
    ),
    PlayerRole.FARMER_REP: PlayerUtility(
        role=PlayerRole.FARMER_REP,
        alpha=0.1,  # Low weight on Delhi air quality
        beta=0.8,   # High weight on farmer livelihoods
        gamma=0.1
    ),
    PlayerRole.INDUSTRY_LEADER: PlayerUtility(
        role=PlayerRole.INDUSTRY_LEADER,
        alpha=0.2,  # Some concern for air quality (CSR, reputation)
        beta=0.7,   # Hidden: protect industry profits
        gamma=0.1
    ),
    PlayerRole.HEALTH_DIRECTOR: PlayerUtility(
        role=PlayerRole.HEALTH_DIRECTOR,
        alpha=0.9,  # Maximize public health
        beta=0.0,   # No hidden objective (public servant)
        gamma=0.1
    ),
    PlayerRole.ACTIVIST: PlayerUtility(
        role=PlayerRole.ACTIVIST,
        alpha=0.7,  # Cares about air quality
        beta=0.2,   # Hidden: media visibility, movement building
        gamma=0.1
    )
}


@dataclass
class Action:
    """An action available to a player"""
    action_id: str
    name: str
    cost: float  # Budget cost (₹ crores)
    public_impact: float  # Expected ΔAQ (negative = improvement)
    player_specific_impacts: Dict[PlayerRole, float]  # Impact on each player's hidden objective


@dataclass
class GameState:
    """Current game state"""
    round_num: int
    aqi: float
    public_score: float  # Health metric
    budget_remaining: float
    player_hidden_scores: Dict[PlayerRole, float]


class GameTheoryAnalyzer:
    """
    Analyzes strategic interactions using game theory.

    Key analyses:
    1. Best response for each player given others' actions
    2. Nash equilibrium computation
    3. Pareto frontier analysis
    4. Coalition stability
    5. Mechanism design recommendations
    """

    def __init__(self, utilities: Dict[PlayerRole, PlayerUtility]):
        self.utilities = utilities

    def compute_player_payoff(
        self,
        role: PlayerRole,
        own_action: Action,
        other_actions: List[Action],
        game_state: GameState
    ) -> float:
        """
        Compute expected utility for a player given action profile.

        Models interdependencies:
        - Joint actions determine total AQI impact
        - Budget is shared (opportunity cost)
        - Some actions have synergies (e.g., subsidy + enforcement)
        """
        utility_fn = self.utilities[role]

        # Compute public score change (aggregate air quality improvement)
        all_actions = [own_action] + other_actions
        public_delta = sum(a.public_impact for a in all_actions)

        # Synergy bonus: Some action combinations amplify effects
        public_delta *= self._compute_synergy_multiplier(all_actions)

        # Compute hidden score change (role-specific)
        hidden_delta = own_action.player_specific_impacts.get(role, 0.0)

        # Cost
        cost = own_action.cost

        return utility_fn.evaluate(public_delta, hidden_delta, cost)

    def _compute_synergy_multiplier(self, actions: List[Action]) -> float:
        """
        Certain action combinations amplify effectiveness.

        Examples:
        - Farmer subsidy + enforcement = 1.3x (carrot + stick)
        - Vehicle ban + public transport boost = 1.2x
        - Multiple small actions = 0.9x (coordination overhead)
        """
        multiplier = 1.0

        action_types = [a.action_id for a in actions]

        # Synergy: Subsidy + enforcement
        if "subsidy_farmers" in action_types and "enforcement_boost" in action_types:
            multiplier *= 1.3

        # Synergy: Vehicle restrictions + transit boost
        if "vehicle_ban" in action_types and "metro_boost" in action_types:
            multiplier *= 1.2

        # Penalty: Too many actions = coordination overhead
        if len(actions) > 5:
            multiplier *= 0.9

        return multiplier

    def find_best_response(
        self,
        role: PlayerRole,
        available_actions: List[Action],
        other_actions: List[Action],
        game_state: GameState
    ) -> Action:
        """
        Find the action that maximizes utility given others' choices.

        This is the foundation of Nash equilibrium computation.
        """
        best_action = None
        best_payoff = float('-inf')

        for action in available_actions:
            payoff = self.compute_player_payoff(role, action, other_actions, game_state)

            if payoff > best_payoff:
                best_payoff = payoff
                best_action = action

        return best_action

    def find_nash_equilibrium(
        self,
        players: List[PlayerRole],
        available_actions: Dict[PlayerRole, List[Action]],
        game_state: GameState,
        method: str = "pure"
    ) -> Optional[Dict[PlayerRole, Action]]:
        """
        Find Nash equilibrium of the simultaneous-move game.

        A Nash equilibrium is an action profile where no player can improve
        by unilaterally changing their action.

        Methods:
        - "pure": Pure strategy Nash equilibrium
        - "mixed": Mixed strategy (future work)

        Returns None if no pure strategy equilibrium exists.
        """
        if method != "pure":
            raise NotImplementedError("Only pure strategy NE implemented")

        # Brute force: Check all action profiles
        action_lists = [available_actions[p] for p in players]

        for action_profile in itertools.product(*action_lists):
            profile_dict = dict(zip(players, action_profile))

            # Check if this is a Nash equilibrium
            is_nash = True

            for player in players:
                current_action = profile_dict[player]
                others_actions = [profile_dict[p] for p in players if p != player]

                # Is current action a best response?
                best_response = self.find_best_response(
                    player,
                    available_actions[player],
                    others_actions,
                    game_state
                )

                if best_response.action_id != current_action.action_id:
                    is_nash = False
                    break

            if is_nash:
                return profile_dict

        return None  # No pure strategy Nash equilibrium

    def compute_pareto_frontier(
        self,
        players: List[PlayerRole],
        available_actions: Dict[PlayerRole, List[Action]],
        game_state: GameState
    ) -> List[Tuple[Dict[PlayerRole, Action], Dict[PlayerRole, float]]]:
        """
        Compute Pareto optimal action profiles.

        An outcome is Pareto optimal if you can't make anyone better off
        without making someone worse off.

        Returns:
            List of (action_profile, payoff_vector) tuples
        """
        pareto_optimal = []

        action_lists = [available_actions[p] for p in players]

        for action_profile in itertools.product(*action_lists):
            profile_dict = dict(zip(players, action_profile))

            # Compute payoffs for all players
            payoffs = {}
            for player in players:
                others = [profile_dict[p] for p in players if p != player]
                payoffs[player] = self.compute_player_payoff(
                    player,
                    profile_dict[player],
                    others,
                    game_state
                )

            # Check if Pareto optimal
            is_pareto = True

            # Compare with all other profiles
            for alt_profile in itertools.product(*action_lists):
                alt_dict = dict(zip(players, alt_profile))

                # Compute alternative payoffs
                alt_payoffs = {}
                for player in players:
                    others = [alt_dict[p] for p in players if p != player]
                    alt_payoffs[player] = self.compute_player_payoff(
                        player,
                        alt_dict[player],
                        others,
                        game_state
                    )

                # Is alternative a Pareto improvement?
                # (At least one better, none worse)
                if all(alt_payoffs[p] >= payoffs[p] for p in players) and \
                   any(alt_payoffs[p] > payoffs[p] for p in players):
                    is_pareto = False
                    break

            if is_pareto:
                pareto_optimal.append((profile_dict, payoffs))

        return pareto_optimal

    def analyze_coalition_stability(
        self,
        coalition: List[PlayerRole],
        action_profile: Dict[PlayerRole, Action],
        game_state: GameState
    ) -> Dict[str, float]:
        """
        Analyze if a coalition would stay together.

        A coalition is stable if members can't jointly deviate to improve all their payoffs.

        Returns:
            {
                'stability_score': float,  # 0-1, higher = more stable
                'defection_temptation': float,  # How much gain from breaking
                'credible': bool  # Can coalition credibly commit?
            }
        """
        # Compute current coalition payoffs
        coalition_payoffs = {}
        for player in coalition:
            others = [action_profile[p] for p in action_profile if p != player]
            coalition_payoffs[player] = self.compute_player_payoff(
                player,
                action_profile[player],
                others,
                game_state
            )

        # TODO: Full coalitional stability analysis
        # For now, simplified heuristic

        avg_payoff = np.mean(list(coalition_payoffs.values()))

        return {
            'stability_score': 0.7,  # Placeholder
            'defection_temptation': 0.3,
            'credible': avg_payoff > 0
        }

    def recommend_mechanism_design(
        self,
        game_state: GameState,
        target: str = "social_welfare"
    ) -> Dict[str, any]:
        """
        Recommend mechanism design interventions to align incentives.

        Targets:
        - "social_welfare": Maximize total welfare
        - "air_quality": Maximize AQI improvement
        - "equity": Minimize payoff inequality

        Mechanisms:
        - Subsidies/taxes (Pigouvian)
        - Side payments (Coasean bargaining)
        - Quotas/regulations
        - Information revelation
        """
        recommendations = {
            'target': target,
            'instruments': []
        }

        if target == "social_welfare":
            # Recommend Pigouvian subsidy for farmers
            recommendations['instruments'].append({
                'type': 'subsidy',
                'target_player': PlayerRole.FARMER_REP,
                'justification': 'Farmers face private cost (₹1500/acre) but create public benefit. Subsidy aligns incentives.',
                'magnitude': 'Cover 60-75% of cost',
                'expected_effect': 'Reduce burning by 40%, improve AQI by 80 points'
            })

            # Recommend Pigouvian tax on industry
            recommendations['instruments'].append({
                'type': 'tax',
                'target_player': PlayerRole.INDUSTRY_LEADER,
                'justification': 'Industries impose negative externality. Tax = social cost of pollution.',
                'magnitude': '₹10,000/ton PM2.5',
                'expected_effect': 'Reduce emissions by 20%'
            })

        elif target == "air_quality":
            # Prioritize actions with highest AQI impact
            recommendations['instruments'].append({
                'type': 'quota',
                'target_player': 'all',
                'justification': 'Direct regulation achieves AQI target faster than incentives.',
                'magnitude': 'Ban stubble burning Oct 15-Nov 15',
                'expected_effect': 'Immediate 60% reduction in Oct-Nov spike'
            })

        elif target == "equity":
            # Minimize burden on poorest stakeholders
            recommendations['instruments'].append({
                'type': 'compensation',
                'target_player': PlayerRole.FARMER_REP,
                'justification': 'Farmers bear cost of cleanup despite being poor. Justice requires compensation.',
                'magnitude': '100% subsidy + ₹500/acre bonus',
                'expected_effect': 'Political acceptability, reduces farmer opposition'
            })

        return recommendations


class MechanismDesignSimulator:
    """
    Simulates how mechanism design interventions change game equilibria.

    Examples:
    - What if we add a carbon tax?
    - What if we allow side payments (Coasean bargaining)?
    - What if we impose quotas?
    """

    def __init__(self, base_analyzer: GameTheoryAnalyzer):
        self.base_analyzer = base_analyzer

    def simulate_intervention(
        self,
        intervention_type: str,
        parameters: Dict,
        game_state: GameState
    ) -> Dict:
        """
        Simulate effect of a mechanism design intervention.

        Intervention types:
        - "subsidy": Change cost of actions
        - "tax": Add cost to actions
        - "quota": Restrict available actions
        - "information": Reveal hidden information
        - "commitment": Allow binding agreements
        """
        results = {
            'intervention': intervention_type,
            'parameters': parameters,
            'effects': {}
        }

        # TODO: Implement intervention simulations

        return results


# Example usage
if __name__ == "__main__":
    print("=== Game Theory Analysis Demo ===\n")

    # Setup
    analyzer = GameTheoryAnalyzer(ROLE_UTILITIES)

    # Define sample actions
    subsidy_action = Action(
        action_id="subsidy_farmers",
        name="Farmer Subsidy (75%)",
        cost=300,
        public_impact=-60,  # Reduces AQI by 60
        player_specific_impacts={
            PlayerRole.FARMER_REP: 50,  # Farmers gain
            PlayerRole.CHIEF_MINISTER: -10,  # Budget strain, political risk
            PlayerRole.ACTIVIST: 20  # Activists approve of addressing root cause
        }
    )

    vehicle_ban = Action(
        action_id="vehicle_ban",
        name="Odd-Even Vehicle Scheme",
        cost=10,
        public_impact=-15,
        player_specific_impacts={
            PlayerRole.CHIEF_MINISTER: 5,  # Visible action, shows responsiveness
            PlayerRole.INDUSTRY_LEADER: -5,  # Hurts business logistics
            PlayerRole.HEALTH_DIRECTOR: 10  # Supports health
        }
    )

    no_action = Action(
        action_id="wait",
        name="No Action",
        cost=0,
        public_impact=0,
        player_specific_impacts={}
    )

    # Game state
    game_state = GameState(
        round_num=2,
        aqi=250,
        public_score=60,
        budget_remaining=800,
        player_hidden_scores={
            PlayerRole.CHIEF_MINISTER: 50,
            PlayerRole.FARMER_REP: 30
        }
    )

    # Analyze payoffs
    print("Payoff Analysis:")
    print("-" * 50)

    cm_subsidy_payoff = analyzer.compute_player_payoff(
        PlayerRole.CHIEF_MINISTER,
        subsidy_action,
        [vehicle_ban],  # Assume Env Minister chooses vehicle ban
        game_state
    )

    cm_vehicle_payoff = analyzer.compute_player_payoff(
        PlayerRole.CHIEF_MINISTER,
        vehicle_ban,
        [subsidy_action],
        game_state
    )

    print(f"Chief Minister:")
    print(f"  Subsidy (given other plays vehicle ban): {cm_subsidy_payoff:.2f}")
    print(f"  Vehicle Ban (given other plays subsidy): {cm_vehicle_payoff:.2f}")

    # Best response
    best = analyzer.find_best_response(
        PlayerRole.CHIEF_MINISTER,
        [subsidy_action, vehicle_ban, no_action],
        [vehicle_ban],
        game_state
    )
    print(f"  Best response: {best.name}\n")

    # Mechanism design recommendations
    print("\nMechanism Design Recommendations:")
    print("-" * 50)
    recommendations = analyzer.recommend_mechanism_design(game_state, target="social_welfare")

    for instrument in recommendations['instruments']:
        print(f"\nInstrument: {instrument['type'].upper()}")
        print(f"  Target: {instrument['target_player']}")
        print(f"  Justification: {instrument['justification']}")
        print(f"  Magnitude: {instrument['magnitude']}")
        print(f"  Expected Effect: {instrument['expected_effect']}")

    print("\n=== Demo Complete ===")
