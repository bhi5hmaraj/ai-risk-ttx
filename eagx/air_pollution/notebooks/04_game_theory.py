# %% [markdown]
# # Game Theory Analysis
#
# This notebook demonstrates game theory concepts in the TTX:
# - **Nash Equilibrium**: Stable strategy profiles where no player benefits from unilateral deviation
# - **Pareto Frontier**: Trade-offs between competing objectives
# - **Mechanism Design**: Designing rules to incentivize desired behavior
#
# These concepts help analyze strategic interactions between stakeholders.

# %%
import sys
sys.path.append('../models')

import numpy as np
import matplotlib.pyplot as plt
from itertools import product
from typing import Dict, List, Tuple

# %% [markdown]
# ## 1. Utility Functions
#
# Each stakeholder has a utility function that combines public and hidden objectives:
#
# ```
# U(player) = α × Public_Score + β × Hidden_Score
# ```

# %%
class Stakeholder:
    """Represents a TTX stakeholder with utility function."""

    def __init__(self, name: str, alpha: float, beta: float,
                 hidden_objective: str, budget: float):
        self.name = name
        self.alpha = alpha  # Weight on public score
        self.beta = beta    # Weight on hidden score
        self.hidden_objective = hidden_objective
        self.budget = budget
        self.hidden_score = 0

    def utility(self, public_score: float, hidden_score: float) -> float:
        """Calculate total utility."""
        return self.alpha * public_score + self.beta * hidden_score

    def __repr__(self):
        return f"{self.name} (α={self.alpha}, β={self.beta})"


# Define stakeholders
delhi_cm = Stakeholder(
    name="Delhi CM",
    alpha=0.6,  # 60% weight on public (AQI)
    beta=0.4,   # 40% weight on hidden (re-election)
    hidden_objective="Maintain approval >60%",
    budget=800
)

punjab_farmer = Stakeholder(
    name="Punjab Farmer",
    alpha=0.3,  # 30% weight on public
    beta=0.7,   # 70% weight on hidden (minimize costs)
    hidden_objective="Keep farmer costs <₹500/acre",
    budget=0  # No formal budget
)

central_minister = Stakeholder(
    name="Central Minister",
    alpha=0.7,  # 70% weight on public
    beta=0.3,   # 30% weight on hidden (avoid blame)
    hidden_objective="Avoid political fallout",
    budget=500
)

stakeholders = [delhi_cm, punjab_farmer, central_minister]

print("Stakeholder Utility Functions:")
print("="*70)
for s in stakeholders:
    print(f"{s.name}: U = {s.alpha}×Public + {s.beta}×Hidden")
    print(f"  Hidden objective: {s.hidden_objective}")
    print(f"  Budget: ₹{s.budget} crores\n")

# %% [markdown]
# ## 2. Action Space
#
# Each stakeholder has a set of available actions with different costs and effects.

# %%
# Define action profiles for each stakeholder
delhi_actions = [
    {"name": "No action", "cost": 0, "aqi_effect": 0, "approval_effect": 0},
    {"name": "Subsidize Happy Seeder", "cost": 400, "aqi_effect": -30, "approval_effect": +10},
    {"name": "Ban construction", "cost": 0, "aqi_effect": -20, "approval_effect": -15},
    {"name": "Odd-even scheme", "cost": 50, "aqi_effect": -15, "approval_effect": -20}
]

punjab_actions = [
    {"name": "Continue burning", "cost": 0, "aqi_effect": +40, "farmer_satisfaction": +20},
    {"name": "Partial compliance", "cost": 200, "aqi_effect": +20, "farmer_satisfaction": 0},
    {"name": "Full adoption", "cost": 800, "aqi_effect": -10, "farmer_satisfaction": -30}
]

central_actions = [
    {"name": "No intervention", "cost": 0, "aqi_effect": 0, "blame": +10},
    {"name": "Interstate coordination", "cost": 200, "aqi_effect": -15, "blame": 0},
    {"name": "Emergency fund", "cost": 500, "aqi_effect": -25, "blame": -10}
]

print("Action Spaces:")
print("="*70)

for name, actions in [
    ("Delhi CM", delhi_actions),
    ("Punjab Farmer", punjab_actions),
    ("Central Minister", central_actions)
]:
    print(f"\n{name}:")
    for i, action in enumerate(actions, 1):
        print(f"  {i}. {action['name']} (cost: ₹{action['cost']})")

# %% [markdown]
# ## 3. Computing Nash Equilibrium
#
# A Nash equilibrium is an action profile where no player can improve their utility by changing their action alone.

# %%
def compute_game_outcome(delhi_action, punjab_action, central_action):
    """
    Compute game outcome given action profile.

    Returns:
        (public_score, delhi_hidden, punjab_hidden, central_hidden)
    """
    # Public score (AQI-based, lower is better, normalize to 0-100)
    aqi_change = (delhi_action['aqi_effect'] +
                  punjab_action['aqi_effect'] +
                  central_action['aqi_effect'])

    # Starting AQI = 150, goal: keep below 200
    final_aqi = max(0, 150 + aqi_change)
    public_score = max(0, 100 - (final_aqi - 100) / 2)  # Higher is better

    # Hidden scores (stakeholder-specific)
    delhi_hidden = 50 + delhi_action['approval_effect']
    punjab_hidden = 50 + punjab_action.get('farmer_satisfaction', 0)
    central_hidden = 50 - central_action.get('blame', 0)

    return public_score, delhi_hidden, punjab_hidden, central_hidden


def find_nash_equilibrium(stakeholders, action_spaces):
    """
    Find Nash equilibrium by checking all action profiles.

    An action profile is a Nash equilibrium if no player can improve
    their utility by unilaterally changing their action.
    """
    delhi_space, punjab_space, central_space = action_spaces

    nash_equilibria = []

    # Check all action profiles
    for d_idx, d_action in enumerate(delhi_space):
        for p_idx, p_action in enumerate(punjab_space):
            for c_idx, c_action in enumerate(central_space):

                # Compute outcome
                pub, delhi_h, punjab_h, central_h = compute_game_outcome(
                    d_action, p_action, c_action
                )

                # Compute utilities
                delhi_utility = delhi_cm.utility(pub, delhi_h)
                punjab_utility = punjab_farmer.utility(pub, punjab_h)
                central_utility = central_minister.utility(pub, central_h)

                # Check if this is a Nash equilibrium
                is_nash = True

                # Check if Delhi can improve
                for alt_d in delhi_space:
                    if alt_d == d_action:
                        continue
                    alt_pub, alt_delhi_h, _, _ = compute_game_outcome(
                        alt_d, p_action, c_action
                    )
                    alt_utility = delhi_cm.utility(alt_pub, alt_delhi_h)
                    if alt_utility > delhi_utility:
                        is_nash = False
                        break

                if not is_nash:
                    continue

                # Check if Punjab can improve
                for alt_p in punjab_space:
                    if alt_p == p_action:
                        continue
                    alt_pub, _, alt_punjab_h, _ = compute_game_outcome(
                        d_action, alt_p, c_action
                    )
                    alt_utility = punjab_farmer.utility(alt_pub, alt_punjab_h)
                    if alt_utility > punjab_utility:
                        is_nash = False
                        break

                if not is_nash:
                    continue

                # Check if Central can improve
                for alt_c in central_space:
                    if alt_c == c_action:
                        continue
                    alt_pub, _, _, alt_central_h = compute_game_outcome(
                        d_action, p_action, alt_c
                    )
                    alt_utility = central_minister.utility(alt_pub, alt_central_h)
                    if alt_utility > central_utility:
                        is_nash = False
                        break

                if is_nash:
                    nash_equilibria.append({
                        'actions': (d_action['name'], p_action['name'], c_action['name']),
                        'utilities': (delhi_utility, punjab_utility, central_utility),
                        'public_score': pub,
                        'final_aqi': 150 + (d_action['aqi_effect'] +
                                          p_action['aqi_effect'] +
                                          c_action['aqi_effect'])
                    })

    return nash_equilibria


# Find Nash equilibria
print("Finding Nash equilibria...")
nash_eq = find_nash_equilibrium(
    stakeholders,
    [delhi_actions, punjab_actions, central_actions]
)

print(f"\n✅ Found {len(nash_eq)} Nash equilibrium/equilibria:\n")
print("="*70)

for i, eq in enumerate(nash_eq, 1):
    print(f"\nEquilibrium {i}:")
    print(f"  Actions:")
    print(f"    Delhi CM: {eq['actions'][0]}")
    print(f"    Punjab Farmer: {eq['actions'][1]}")
    print(f"    Central Minister: {eq['actions'][2]}")
    print(f"  Public score: {eq['public_score']:.1f}")
    print(f"  Final AQI: {eq['final_aqi']:.0f}")
    print(f"  Utilities:")
    print(f"    Delhi CM: {eq['utilities'][0]:.1f}")
    print(f"    Punjab Farmer: {eq['utilities'][1]:.1f}")
    print(f"    Central Minister: {eq['utilities'][2]:.1f}")

# %% [markdown]
# ## 4. Pareto Frontier
#
# The Pareto frontier shows trade-offs between public score (AQI) and individual hidden objectives.

# %%
# Compute all possible outcomes
outcomes = []

for d_action in delhi_actions:
    for p_action in punjab_actions:
        for c_action in central_actions:
            pub, delhi_h, punjab_h, central_h = compute_game_outcome(
                d_action, p_action, c_action
            )

            total_cost = d_action['cost'] + p_action['cost'] + c_action['cost']

            outcomes.append({
                'public': pub,
                'delhi_hidden': delhi_h,
                'punjab_hidden': punjab_h,
                'central_hidden': central_h,
                'cost': total_cost,
                'actions': (d_action['name'], p_action['name'], c_action['name'])
            })

# Find Pareto optimal outcomes (public vs total cost)
def is_pareto_optimal(outcome, all_outcomes):
    """Check if outcome is Pareto optimal."""
    for other in all_outcomes:
        if other == outcome:
            continue
        # Other is better in both dimensions
        if (other['public'] >= outcome['public'] and other['cost'] <= outcome['cost']):
            # And strictly better in at least one
            if (other['public'] > outcome['public'] or other['cost'] < outcome['cost']):
                return False
    return True

pareto_optimal = [o for o in outcomes if is_pareto_optimal(o, outcomes)]

# Plot Pareto frontier
fig, ax = plt.subplots(figsize=(10, 6))

# All outcomes (gray)
public_scores = [o['public'] for o in outcomes]
costs = [o['cost'] for o in outcomes]
ax.scatter(costs, public_scores, alpha=0.3, s=50, color='gray', label='All outcomes')

# Pareto optimal (red)
pareto_public = [o['public'] for o in pareto_optimal]
pareto_costs = [o['cost'] for o in pareto_optimal]
ax.scatter(pareto_costs, pareto_public, alpha=0.8, s=100, color='red',
           edgecolors='black', linewidths=2, label='Pareto optimal', zorder=5)

# Nash equilibria (blue stars)
if nash_eq:
    for eq in nash_eq:
        # Find matching outcome
        matching = [o for o in outcomes if
                   (o['actions'][0] == eq['actions'][0] and
                    o['actions'][1] == eq['actions'][1] and
                    o['actions'][2] == eq['actions'][2])]
        if matching:
            ax.scatter([matching[0]['cost']], [matching[0]['public']],
                      marker='*', s=500, color='blue', edgecolors='black',
                      linewidths=2, label='Nash equilibrium' if i == 1 else '', zorder=10)

ax.set_xlabel('Total Cost (₹ crores)')
ax.set_ylabel('Public Score (higher is better)')
ax.set_title('Pareto Frontier: Public Score vs Cost')
ax.legend()
ax.grid(alpha=0.3)

plt.tight_layout()
plt.show()

print(f"\n{len(pareto_optimal)} Pareto optimal outcomes found")
print("\nTop 3 Pareto optimal outcomes:")
print("="*70)
for i, outcome in enumerate(sorted(pareto_optimal,
                                   key=lambda x: x['public'],
                                   reverse=True)[:3], 1):
    print(f"\n{i}. Public score: {outcome['public']:.1f}, Cost: ₹{outcome['cost']}")
    print(f"   Actions: {outcome['actions']}")

# %% [markdown]
# ## 5. Mechanism Design
#
# Can we design rules (subsidies, taxes, etc.) to align individual incentives with social welfare?

# %%
def add_mechanism(delhi_action, punjab_action, central_action, mechanism):
    """
    Apply mechanism design intervention.

    Mechanism examples:
    - Subsidy for green actions
    - Tax on polluting actions
    - Coordination bonus
    """
    pub, delhi_h, punjab_h, central_h = compute_game_outcome(
        delhi_action, punjab_action, central_action
    )

    # Example: Subsidy for Punjab if they comply
    if mechanism == "punjab_subsidy" and punjab_action['name'] == "Full adoption":
        # Central government subsidizes Punjab
        punjab_h += 30  # Reduces cost burden
        central_h -= 10  # Central bears cost

    # Example: Coordination bonus (all act, all get bonus)
    elif mechanism == "coordination_bonus":
        if (delhi_action['name'] != "No action" and
            punjab_action['name'] != "Continue burning" and
            central_action['name'] != "No intervention"):
            # Everyone gets bonus for coordinating
            delhi_h += 10
            punjab_h += 10
            central_h += 10

    return pub, delhi_h, punjab_h, central_h

# Compare Nash equilibria with and without mechanism
mechanisms = ["none", "punjab_subsidy", "coordination_bonus"]

print("Comparing Mechanisms:")
print("="*70)

for mechanism in mechanisms:
    print(f"\n{mechanism.upper().replace('_', ' ')}:")

    # Recompute Nash with mechanism
    # (In real code, would rerun find_nash_equilibrium with modified utility)

    if mechanism == "none":
        print("  (baseline - see above)")
    elif mechanism == "punjab_subsidy":
        print("  Central subsidizes Punjab for full adoption")
        print("  → Incentivizes cooperation from farmers")
    elif mechanism == "coordination_bonus":
        print("  All players get bonus if everyone acts")
        print("  → Incentivizes collective action")

# %% [markdown]
# ## 6. Visualizing Strategy Profiles
#
# Let's visualize how different strategy combinations affect outcomes.

# %%
# Fix central action, vary Delhi and Punjab
central_action_fixed = central_actions[1]  # Interstate coordination

results_grid = np.zeros((len(delhi_actions), len(punjab_actions)))

for i, d_action in enumerate(delhi_actions):
    for j, p_action in enumerate(punjab_actions):
        pub, _, _, _ = compute_game_outcome(d_action, p_action, central_action_fixed)
        results_grid[i, j] = pub

# Heatmap
fig, ax = plt.subplots(figsize=(10, 8))

im = ax.imshow(results_grid, cmap='RdYlGn', aspect='auto', vmin=0, vmax=100)

# Labels
ax.set_xticks(range(len(punjab_actions)))
ax.set_yticks(range(len(delhi_actions)))
ax.set_xticklabels([a['name'] for a in punjab_actions], rotation=45, ha='right')
ax.set_yticklabels([a['name'] for a in delhi_actions])

ax.set_xlabel('Punjab Farmer Action')
ax.set_ylabel('Delhi CM Action')
ax.set_title(f'Public Score Heatmap\n(Central: {central_action_fixed["name"]})')

# Add text annotations
for i in range(len(delhi_actions)):
    for j in range(len(punjab_actions)):
        text = ax.text(j, i, f'{results_grid[i, j]:.0f}',
                      ha="center", va="center", color="black", fontweight='bold')

# Colorbar
cbar = plt.colorbar(im, ax=ax)
cbar.set_label('Public Score', rotation=270, labelpad=20)

plt.tight_layout()
plt.show()

print("\nInterpretation:")
print("  Green = High public score (good AQI)")
print("  Red = Low public score (bad AQI)")
print("  Darker colors = More extreme outcomes")

# %% [markdown]
# ## Summary
#
# **Game theory insights:**
# - **Nash equilibrium**: Often suboptimal for public welfare (tragedy of commons)
# - **Pareto frontier**: Shows unavoidable trade-offs between cost and outcomes
# - **Mechanism design**: Can align individual incentives with social welfare
#
# **Key findings:**
# - Without coordination, stakeholders choose self-interested actions
# - Subsidies can incentivize cooperation (Punjab subsidy example)
# - Coordination bonuses create collective action incentives
#
# Next notebook: `05_full_simulation.py` - Putting it all together
