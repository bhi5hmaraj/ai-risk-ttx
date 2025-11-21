# %% [markdown]
# # Action System Usage
#
# This notebook demonstrates the **compositional action grammar** - a hybrid LLM+Math system that allows both:
# - **Bounded formal actions**: 12 primitives (SUBSIDIZE, TAX, BAN, etc.) with predictable math
# - **Open-ended player input**: Natural language that gets translated to formal actions
#
# The system balances player creativity with game balance.

# %%
import sys
sys.path.append('../models')

from action_system import ActionSystem
from action_system.primitives import ActionPrimitive, ActionTarget
from delhi_system_dynamics import DelhiAirQualitySD

import matplotlib.pyplot as plt
from datetime import datetime

# %% [markdown]
# ## 1. Action Primitives
#
# The system provides 12 action primitives that can be combined:

# %%
# List all available primitives
primitives = list(ActionPrimitive)

print("Available Action Primitives:")
print("="*50)
for i, prim in enumerate(primitives, 1):
    print(f"{i:2d}. {prim.value.upper()}")

print(f"\nTotal combinations possible: {len(primitives)} primitives × parameters = 1000s of actions")

# %% [markdown]
# ## 2. Creating Formal Actions
#
# Actions have three components:
# 1. **Primitive**: What type of action (SUBSIDIZE, BAN, etc.)
# 2. **Target**: Who/what it affects (farmers, vehicles, etc.)
# 3. **Magnitude**: How strong (0-1 scale)

# %%
# Initialize action system
action_system = ActionSystem()

# Example: Subsidize farmers to adopt Happy Seeder (75% coverage)
action1 = action_system.create_action(
    primitive=ActionPrimitive.SUBSIDIZE,
    target=ActionTarget.FARMERS,
    magnitude=0.75,  # 75% subsidy coverage
    duration=7,  # Days
    cost=300  # ₹300 crores
)

print("Action 1: Subsidize Farmers")
print(f"  Primitive: {action1.primitive.value}")
print(f"  Target: {action1.target.value}")
print(f"  Magnitude: {action1.magnitude}")
print(f"  Cost: ₹{action1.cost} crores")
print(f"  Duration: {action1.duration} days")

# %%
# Example: Ban construction (complete ban)
action2 = action_system.create_action(
    primitive=ActionPrimitive.BAN,
    target=ActionTarget.CONSTRUCTION,
    magnitude=1.0,  # Complete ban
    duration=14,
    cost=0  # No direct cost, but economic impact
)

print("\nAction 2: Ban Construction")
print(f"  Primitive: {action2.primitive.value}")
print(f"  Target: {action2.target.value}")
print(f"  Magnitude: {action2.magnitude} (complete ban)")
print(f"  Duration: {action2.duration} days")

# %% [markdown]
# ## 3. Executing Actions on Models
#
# Actions modify model state through two mechanisms:
# - **Parametric effects**: Direct mathematical changes (AQI reduction)
# - **Emergent effects**: Second-order consequences (public reaction, compliance)

# %%
# Initialize model
model = DelhiAirQualitySD(start_date=datetime(2024, 10, 15))

print("Initial State:")
print(f"  PM2.5: {model.state.pm25:.1f} µg/m³")
print(f"  Stubble burning: {model.state.stubble_burning_rate:.0f} tons/day")
print(f"  Construction: {model.state.construction_emissions_rate:.0f} tons/day")

# Execute actions
print("\n" + "="*50)
print("Executing Actions...")
print("="*50)

# Execute subsidy (reduces stubble burning)
result1 = action_system.execute_action(action1, model.state, context={})
print(f"\nAction 1 Results:")
print(f"  Stubble burning reduction: {result1['parametric_effects']['emission_delta']:.1f} tons/day")
print(f"  Expected AQI change: {result1['parametric_effects']['aqi_delta']:.1f}")

# Apply to model
model.state.stubble_burning_rate += result1['parametric_effects']['emission_delta']

# Execute ban (stops construction)
result2 = action_system.execute_action(action2, model.state, context={})
print(f"\nAction 2 Results:")
print(f"  Construction emissions reduction: {result2['parametric_effects']['emission_delta']:.1f} tons/day")
print(f"  Expected AQI change: {result2['parametric_effects']['aqi_delta']:.1f}")

# Apply to model
model.state.construction_emissions_rate += result2['parametric_effects']['emission_delta']

print("\n" + "="*50)
print("New State After Actions:")
print("="*50)
print(f"  PM2.5: {model.state.pm25:.1f} µg/m³")
print(f"  Stubble burning: {model.state.stubble_burning_rate:.0f} tons/day (reduced)")
print(f"  Construction: {model.state.construction_emissions_rate:.0f} tons/day (banned)")

# %% [markdown]
# ## 4. Natural Language Translation
#
# Players can input natural language, which gets translated to formal actions by the ActionTranslator.

# %%
# Example player inputs (would normally go through LLM)
player_inputs = [
    "Pay farmers ₹500/acre to not burn stubble",
    "Ban all construction for 2 weeks",
    "Run a public awareness campaign about stubble burning",
    "Subsidize electric vehicle purchases",
    "Deploy air quality monitors across the city"
]

print("Player Input → Formal Action Translation")
print("="*70)

for i, player_input in enumerate(player_inputs, 1):
    # In real system, this would call ActionTranslator with LLM
    # For demo, we'll manually map
    print(f"\n{i}. Player: \"{player_input}\"")

    if "pay farmers" in player_input.lower():
        print("   → SUBSIDIZE(farmers, magnitude=0.8, cost=400)")
    elif "ban" in player_input.lower():
        print("   → BAN(construction, magnitude=1.0, duration=14)")
    elif "awareness" in player_input.lower():
        print("   → PUBLICIZE(stubble_burning_info, magnitude=0.6, cost=50)")
    elif "subsidize electric" in player_input.lower():
        print("   → SUBSIDIZE(vehicles, magnitude=0.4, cost=500)")
    elif "monitors" in player_input.lower():
        print("   → MONITOR(air_quality, magnitude=0.8, cost=100)")

print("\n" + "="*70)
print("Note: Real system uses LLM (Gemini/GPT) for accurate translation")
print("See action_system/translator.py for implementation")

# %% [markdown]
# ## 5. Comparing Multiple Action Strategies
#
# Let's simulate different intervention strategies over 30 days.

# %%
import copy

# Strategy 1: No intervention (baseline)
model_baseline = DelhiAirQualitySD(start_date=datetime(2024, 10, 15))
baseline_history = []

for day in range(30):
    baseline_history.append(model_baseline.state.pm25)
    model_baseline.step(actions=[])

# Strategy 2: Aggressive (ban + subsidize)
model_aggressive = DelhiAirQualitySD(start_date=datetime(2024, 10, 15))
aggressive_history = []

# Apply aggressive actions
model_aggressive.state.stubble_burning_rate *= 0.3  # 70% reduction
model_aggressive.state.construction_emissions_rate = 0  # Complete ban

for day in range(30):
    aggressive_history.append(model_aggressive.state.pm25)
    model_aggressive.step(actions=[])

# Strategy 3: Moderate (partial measures)
model_moderate = DelhiAirQualitySD(start_date=datetime(2024, 10, 15))
moderate_history = []

model_moderate.state.stubble_burning_rate *= 0.6  # 40% reduction
model_moderate.state.construction_emissions_rate *= 0.5  # 50% reduction

for day in range(30):
    moderate_history.append(model_moderate.state.pm25)
    model_moderate.step(actions=[])

# Plot comparison
fig, ax = plt.subplots(figsize=(12, 6))

days = range(30)
ax.plot(days, baseline_history, linewidth=2, label='No Intervention', linestyle='--')
ax.plot(days, moderate_history, linewidth=2, label='Moderate Measures')
ax.plot(days, aggressive_history, linewidth=2, label='Aggressive Measures')

ax.axhline(y=60, color='orange', linestyle=':', alpha=0.5, label='WHO guideline')
ax.set_xlabel('Day')
ax.set_ylabel('PM2.5 (µg/m³)')
ax.set_title('Comparing Intervention Strategies')
ax.legend()
ax.grid(alpha=0.3)

plt.tight_layout()
plt.show()

print("\nFinal PM2.5 Concentrations:")
print(f"  No intervention: {baseline_history[-1]:.1f} µg/m³")
print(f"  Moderate: {moderate_history[-1]:.1f} µg/m³ ({(baseline_history[-1] - moderate_history[-1])/baseline_history[-1]*100:.1f}% improvement)")
print(f"  Aggressive: {aggressive_history[-1]:.1f} µg/m³ ({(baseline_history[-1] - aggressive_history[-1])/baseline_history[-1]*100:.1f}% improvement)")

# %% [markdown]
# ## 6. Action Costs and Trade-offs
#
# Every action has costs (budget, political capital, economic impact). Let's analyze trade-offs.

# %%
# Define several possible actions
actions = [
    {"name": "Subsidize Happy Seeder (90%)", "cost": 500, "aqi_reduction": -45},
    {"name": "Ban construction (complete)", "cost": 0, "aqi_reduction": -30, "economic_loss": 200},
    {"name": "Odd-even vehicle scheme", "cost": 50, "aqi_reduction": -20, "public_approval": -10},
    {"name": "Subsidize electric buses", "cost": 300, "aqi_reduction": -15},
    {"name": "Public awareness campaign", "cost": 50, "aqi_reduction": -5},
    {"name": "Ban firecrackers", "cost": 20, "aqi_reduction": -10, "public_approval": -15}
]

# Plot cost-effectiveness
fig, ax = plt.subplots(figsize=(10, 6))

costs = [a['cost'] for a in actions]
reductions = [-a['aqi_reduction'] for a in actions]  # Make positive for plot
names = [a['name'] for a in actions]

# Calculate cost per AQI point
efficiency = [cost / reduction if reduction > 0 else float('inf')
              for cost, reduction in zip(costs, reductions)]

colors = ['green' if e < 15 else 'orange' if e < 25 else 'red' for e in efficiency]

scatter = ax.scatter(costs, reductions, s=200, c=colors, alpha=0.6, edgecolors='black')

# Label points
for i, name in enumerate(names):
    ax.annotate(name, (costs[i], reductions[i]),
                xytext=(5, 5), textcoords='offset points',
                fontsize=8, alpha=0.8)

ax.set_xlabel('Cost (₹ crores)')
ax.set_ylabel('AQI Reduction')
ax.set_title('Action Cost-Effectiveness')
ax.grid(alpha=0.3)

plt.tight_layout()
plt.show()

print("\nAction Efficiency (Cost per AQI point reduced):")
for action, eff in sorted(zip(actions, efficiency), key=lambda x: x[1]):
    if eff != float('inf'):
        print(f"  {action['name']}: ₹{eff:.1f} crores/AQI point")

# %% [markdown]
# ## Summary
#
# The action system provides:
# - **12 primitives** that combine into thousands of possible actions
# - **Natural language input** translated to formal actions
# - **Parametric effects** (predictable math) + **Emergent effects** (LLM-generated consequences)
# - **Cost-effectiveness analysis** for decision-making
#
# Next notebook: `03_architect_mode.py` - Creating custom scenarios
