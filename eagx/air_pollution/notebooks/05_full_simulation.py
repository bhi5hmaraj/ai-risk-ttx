# %% [markdown]
# # Full Game Simulation
#
# This notebook demonstrates a complete 5-round TTX game simulation, integrating:
# - **Models**: Hybrid Automaton + System Dynamics
# - **Actions**: Compositional action system
# - **Stakeholders**: Multi-player strategic interaction
# - **Events**: Dynamic triggers (Diwali spike, Supreme Court)
#
# This simulates what players would experience in the actual game.

# %%
import sys
sys.path.append('../models')

import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from collections import defaultdict

from delhi_hybrid_automaton import DelhiAirQualityHA
from delhi_system_dynamics import DelhiAirQualitySD
from action_system import ActionSystem
from action_system.primitives import ActionPrimitive, ActionTarget

# %% [markdown]
# ## 1. Game Setup
#
# Initialize the game state with 5 stakeholders and starting conditions.

# %%
class GameState:
    """Represents the complete game state."""

    def __init__(self):
        self.round = 0
        self.max_rounds = 5

        # Models
        self.ha_model = DelhiAirQualityHA(start_date=datetime(2024, 10, 15))
        self.sd_model = DelhiAirQualitySD(start_date=datetime(2024, 10, 15))
        self.action_system = ActionSystem()

        # Public metrics
        self.aqi = 150
        self.public_score = 100  # Democratic legitimacy
        self.budget_delhi = 800
        self.budget_central = 500

        # Stakeholder scores
        self.stakeholder_scores = {
            'delhi_cm': 0,
            'punjab_farmer': 0,
            'central_minister': 0,
            'industry': 0,
            'health_activist': 0
        }

        # Event log
        self.event_log = []

        # History
        self.history = []

    def to_dict(self):
        """Convert state to dictionary for history."""
        return {
            'round': self.round,
            'aqi': self.aqi,
            'public_score': self.public_score,
            'budget_delhi': self.budget_delhi,
            'budget_central': self.budget_central,
            'regime': self.ha_model.state.regime,
            'pm25': self.sd_model.state.pm25,
            'stakeholder_scores': self.stakeholder_scores.copy()
        }


# Initialize game
game = GameState()

print("Game Initialized:")
print("="*70)
print(f"  Start date: {game.ha_model.state.timestamp.strftime('%Y-%m-%d')}")
print(f"  Initial AQI: {game.aqi}")
print(f"  Initial regime: {game.ha_model.state.regime}")
print(f"  Delhi budget: ₹{game.budget_delhi} crores")
print(f"  Central budget: ₹{game.budget_central} crores")
print(f"  Rounds: {game.max_rounds}")

# %% [markdown]
# ## 2. Stakeholder Actions
#
# Each round, stakeholders choose actions based on their objectives and resources.

# %%
def simulate_stakeholder_actions(game_state, round_num):
    """
    Simulate stakeholder action selection.

    In real game, this would be player choices or AI decision-making.
    For demo, we'll use a simple strategy based on round number.
    """
    actions = []

    # Delhi CM strategy: Aggressive in early rounds
    if round_num <= 2:
        action = game_state.action_system.create_action(
            primitive=ActionPrimitive.SUBSIDIZE,
            target=ActionTarget.FARMERS,
            magnitude=0.8,
            cost=300,
            duration=7
        )
        actions.append(('delhi_cm', action))
        game_state.budget_delhi -= 300
    elif game_state.aqi > 250:
        action = game_state.action_system.create_action(
            primitive=ActionPrimitive.BAN,
            target=ActionTarget.CONSTRUCTION,
            magnitude=1.0,
            cost=0,
            duration=7
        )
        actions.append(('delhi_cm', action))

    # Punjab farmer: Reactive to subsidies
    if round_num <= 2:
        # Partial compliance (some subsidy available)
        game_state.stakeholder_scores['punjab_farmer'] += 10
    else:
        # More compliance later
        game_state.stakeholder_scores['punjab_farmer'] += 5

    # Central minister: Waits for crisis
    if game_state.aqi > 300 or round_num == 4:
        action = game_state.action_system.create_action(
            primitive=ActionPrimitive.COORDINATE,
            target=ActionTarget.INTERSTATE,
            magnitude=0.7,
            cost=200
        )
        actions.append(('central_minister', action))
        game_state.budget_central -= 200

    # Industry: Minimize disruption
    if round_num == 3:  # Diwali round
        game_state.stakeholder_scores['industry'] -= 10  # Loses from restrictions

    # Health activist: Pressures government
    if game_state.aqi > 250:
        game_state.stakeholder_scores['health_activist'] += 5  # Gains visibility

    return actions


# %% [markdown]
# ## 3. Event System
#
# Events trigger based on round number or game state conditions.

# %%
def trigger_events(game_state, round_num):
    """
    Check and trigger events based on round or conditions.
    """
    events = []

    # Round 2: Peak stubble burning season
    if round_num == 2:
        events.append({
            'name': 'Peak Stubble Burning Season',
            'description': '3,500 fire spots detected across Punjab/Haryana',
            'effects': {
                'aqi_delta': +80,
                'public_alarm': +40
            }
        })

    # Round 3: Diwali firecracker spike
    elif round_num == 3:
        events.append({
            'name': 'Diwali Firecracker Spike',
            'description': 'Despite bans, firecrackers lit across Delhi. Thick haze blankets city.',
            'effects': {
                'aqi_delta': +100,
                'public_alarm': +20
            }
        })

    # Conditional: Supreme Court hearing
    if game_state.aqi > 400:
        events.append({
            'name': 'Supreme Court Summons Government',
            'description': 'Court demands immediate action plan. "Right to breathe is fundamental."',
            'effects': {
                'public_score_delta': -15,
                'delhi_cm_pressure': +50
            }
        })

    # Conditional: Cold wave inversion
    if round_num >= 4 and game_state.aqi > 250:
        events.append({
            'name': 'Temperature Inversion Layer',
            'description': 'Cold wave traps pollutants. Meteorologists warn smog could persist for days.',
            'effects': {
                'aqi_delta': +60,
                'dispersion_rate_multiplier': 0.3
            }
        })

    return events


# %% [markdown]
# ## 4. Running the Simulation
#
# Simulate all 5 rounds with actions, events, and consequences.

# %%
print("\n" + "="*70)
print("STARTING SIMULATION")
print("="*70)

for round_num in range(1, game.max_rounds + 1):
    print(f"\n{'='*70}")
    print(f"ROUND {round_num}")
    print(f"{'='*70}")

    game.round = round_num

    # 1. Initial state
    print(f"\nInitial State:")
    print(f"  AQI: {game.aqi:.0f} ({game.ha_model.state.regime})")
    print(f"  Public score: {game.public_score:.0f}")
    print(f"  Delhi budget: ₹{game.budget_delhi:.0f} crores")

    # 2. Stakeholder actions
    print(f"\nStakeholder Actions:")
    actions = simulate_stakeholder_actions(game, round_num)

    if not actions:
        print("  (No actions this round)")
    else:
        for stakeholder, action in actions:
            print(f"  {stakeholder}: {action.primitive.value.upper()}({action.target.value}, {action.magnitude})")

    # 3. Events
    print(f"\nEvents:")
    events = trigger_events(game, round_num)

    if not events:
        print("  (No events this round)")
    else:
        for event in events:
            print(f"  📍 {event['name']}")
            print(f"     {event['description']}")
            game.event_log.append(event)

    # 4. Calculate consequences
    print(f"\nConsequences:")

    # Apply action effects
    aqi_change = 0
    for stakeholder, action in actions:
        # Simulate action effects
        if action.primitive == ActionPrimitive.SUBSIDIZE:
            aqi_change -= 30 * action.magnitude
            print(f"  • Subsidy reduces stubble burning emissions")
        elif action.primitive == ActionPrimitive.BAN:
            aqi_change -= 20 * action.magnitude
            print(f"  • Construction ban reduces dust emissions")
        elif action.primitive == ActionPrimitive.COORDINATE:
            aqi_change -= 15 * action.magnitude
            print(f"  • Interstate coordination improves overall response")

    # Apply event effects
    for event in events:
        effects = event['effects']
        if 'aqi_delta' in effects:
            aqi_change += effects['aqi_delta']
        if 'public_score_delta' in effects:
            game.public_score += effects['public_score_delta']

    # Update state
    game.aqi = max(0, game.aqi + aqi_change)
    game.ha_model.state.aqi = game.aqi
    game.ha_model._update_regime()

    # Public score based on AQI
    if game.aqi < 150:
        game.public_score += 5
    elif game.aqi > 300:
        game.public_score -= 10

    print(f"  Net AQI change: {aqi_change:+.0f}")
    print(f"  New AQI: {game.aqi:.0f}")
    print(f"  New public score: {game.public_score:.0f}")

    # 5. Update models
    game.ha_model.step(actions=[])
    game.sd_model.step(actions=[])

    # 6. Record history
    game.history.append(game.to_dict())

    # 7. Check win/lose conditions
    if game.public_score <= 0:
        print("\n" + "="*70)
        print("❌ GAME OVER: Public score reached zero")
        print("="*70)
        break

print("\n" + "="*70)
print("SIMULATION COMPLETE")
print("="*70)

# %% [markdown]
# ## 5. Visualizing Results
#
# Plot the game trajectory across all rounds.

# %%
# Extract history data
rounds = [h['round'] for h in game.history]
aqis = [h['aqi'] for h in game.history]
public_scores = [h['public_score'] for h in game.history]
budgets_delhi = [h['budget_delhi'] for h in game.history]

# Create visualizations
fig = plt.figure(figsize=(14, 10))
gs = fig.add_gridspec(3, 2, hspace=0.3, wspace=0.3)

# 1. AQI trajectory
ax1 = fig.add_subplot(gs[0, :])
ax1.plot(rounds, aqis, linewidth=3, marker='o', markersize=10, color='darkred')
ax1.axhline(y=150, color='orange', linestyle='--', alpha=0.5, label='Unhealthy')
ax1.axhline(y=300, color='red', linestyle='--', alpha=0.5, label='Severe')
ax1.set_xlabel('Round')
ax1.set_ylabel('AQI')
ax1.set_title('AQI Over Time', fontsize=14, fontweight='bold')
ax1.legend()
ax1.grid(alpha=0.3)

# Mark events
for i, h in enumerate(game.history):
    round_events = [e for e in game.event_log
                   if any(str(h['round']) in str(e.get('round', '')))]
    if round_events or i in [1, 2]:  # Rounds 2 and 3 have events
        ax1.annotate('EVENT', xy=(h['round'], h['aqi']),
                    xytext=(0, 20), textcoords='offset points',
                    ha='center', fontsize=8, color='red',
                    bbox=dict(boxstyle='round,pad=0.3', fc='yellow', alpha=0.7),
                    arrowprops=dict(arrowstyle='->', color='red'))

# 2. Public score
ax2 = fig.add_subplot(gs[1, 0])
ax2.plot(rounds, public_scores, linewidth=3, marker='s', markersize=8, color='blue')
ax2.axhline(y=50, color='orange', linestyle='--', alpha=0.5, label='Warning')
ax2.set_xlabel('Round')
ax2.set_ylabel('Public Score')
ax2.set_title('Public Score (Democratic Legitimacy)')
ax2.legend()
ax2.grid(alpha=0.3)

# 3. Budget remaining
ax3 = fig.add_subplot(gs[1, 1])
ax3.plot(rounds, budgets_delhi, linewidth=3, marker='^', markersize=8, color='green')
ax3.set_xlabel('Round')
ax3.set_ylabel('Budget (₹ crores)')
ax3.set_title('Delhi Budget Remaining')
ax3.grid(alpha=0.3)

# 4. Regime distribution
ax4 = fig.add_subplot(gs[2, 0])
regimes = [h['regime'] for h in game.history]
from collections import Counter
regime_counts = Counter(regimes)
ax4.bar(range(len(regime_counts)), list(regime_counts.values()),
        color=['green', 'yellow', 'orange', 'red', 'purple'][:len(regime_counts)])
ax4.set_xticks(range(len(regime_counts)))
ax4.set_xticklabels(list(regime_counts.keys()), rotation=45, ha='right')
ax4.set_ylabel('Number of Rounds')
ax4.set_title('Time in Each Regime')
ax4.grid(alpha=0.3, axis='y')

# 5. Stakeholder scores
ax5 = fig.add_subplot(gs[2, 1])
final_scores = game.history[-1]['stakeholder_scores']
stakeholders = list(final_scores.keys())
scores = list(final_scores.values())
colors_stakeholder = ['#3498db', '#e74c3c', '#2ecc71', '#95a5a6', '#e67e22']
ax5.barh(stakeholders, scores, color=colors_stakeholder, edgecolor='black')
ax5.set_xlabel('Hidden Score')
ax5.set_title('Final Stakeholder Scores')
ax5.grid(alpha=0.3, axis='x')

plt.suptitle('TTX Simulation Results: 5 Rounds', fontsize=16, fontweight='bold')
plt.show()

# %% [markdown]
# ## 6. Game Summary
#
# Analyze the final outcome and player performance.

# %%
final_state = game.history[-1]

print("\nFinal Game Summary:")
print("="*70)

# Outcome
print(f"\n🎯 Game Outcome:")
if final_state['public_score'] > 50 and final_state['aqi'] < 250:
    outcome = "✅ SUCCESS"
    outcome_desc = "Crisis managed. Public trust maintained."
elif final_state['public_score'] > 0:
    outcome = "⚠️  PARTIAL SUCCESS"
    outcome_desc = "Survived but at high cost to public trust."
else:
    outcome = "❌ FAILURE"
    outcome_desc = "Public trust collapsed. Democratic legitimacy lost."

print(f"   {outcome}")
print(f"   {outcome_desc}")

# Final metrics
print(f"\n📊 Final Metrics:")
print(f"   Rounds completed: {final_state['round']}/{game.max_rounds}")
print(f"   Final AQI: {final_state['aqi']:.0f}")
print(f"   Final regime: {final_state['regime']}")
print(f"   Public score: {final_state['public_score']:.0f}/100")
print(f"   Delhi budget spent: ₹{800 - final_state['budget_delhi']:.0f} crores")

# Stakeholder performance
print(f"\n👥 Stakeholder Performance:")
for stakeholder, score in sorted(final_state['stakeholder_scores'].items(),
                                key=lambda x: x[1], reverse=True):
    status = "🌟" if score > 10 else "✓" if score > 0 else "⚠"
    print(f"   {status} {stakeholder.replace('_', ' ').title()}: {score:+.0f} points")

# Key events
print(f"\n📍 Key Events:")
for i, event in enumerate(game.event_log, 1):
    print(f"   {i}. {event['name']}")

# Lessons learned
print(f"\n💡 Lessons Learned:")
if final_state['aqi'] > 300:
    print("   • More aggressive early intervention needed")
if final_state['budget_delhi'] > 400:
    print("   • Budget underutilized - could have done more")
if final_state['public_score'] < 60:
    print("   • Public communication and approval management critical")
if len(game.event_log) > 3:
    print("   • Multiple crises compounded - need robust contingency plans")

# %% [markdown]
# ## Summary
#
# This simulation demonstrated:
# - **5-round TTX game** with multiple stakeholders
# - **Dynamic events** (Diwali spike, Supreme Court intervention)
# - **Strategic action selection** (subsidies, bans, coordination)
# - **Win/lose conditions** based on public score and AQI
#
# **Key insights:**
# - Early intervention more effective than reactive responses
# - Coordination between stakeholders critical
# - Events can dramatically shift trajectory
# - Resource management (budget) constrains options
#
# This is the foundation for the full game with human players!
