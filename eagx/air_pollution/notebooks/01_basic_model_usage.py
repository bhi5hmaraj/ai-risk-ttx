# %% [markdown]
# # Basic Model Usage
#
# This notebook demonstrates how to run the two core simulation models:
# - **Hybrid Automaton (HA)**: Regime-based air quality model with discrete states
# - **System Dynamics (SD)**: Stock-flow model for emissions and dispersion
#
# Both models simulate Delhi's air pollution crisis.

# %%
import sys
sys.path.append('../models')

import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta

from delhi_hybrid_automaton import DelhiAirQualityHA
from delhi_system_dynamics import DelhiAirQualitySD

# %% [markdown]
# ## 1. Hybrid Automaton Model
#
# The HA model classifies air quality into discrete regimes (GOOD, MODERATE, UNHEALTHY, VERY_UNHEALTHY, SEVERE) and transitions between them based on AQI thresholds.

# %%
# Initialize model
start_date = datetime(2024, 10, 15)
ha_model = DelhiAirQualityHA(start_date=start_date)

print(f"Initial State:")
print(f"  Regime: {ha_model.state.regime}")
print(f"  AQI: {ha_model.state.aqi:.0f}")
print(f"  PM2.5: {ha_model.state.pm25:.1f} µg/m³")
print(f"  GRAP Stage: {ha_model.state.grap_stage}")

# %%
# Simulate 30 days
history = []

for day in range(30):
    # Record current state
    history.append({
        'day': day,
        'regime': ha_model.state.regime,
        'aqi': ha_model.state.aqi,
        'pm25': ha_model.state.pm25,
        'grap_stage': ha_model.state.grap_stage
    })

    # Step simulation (no actions)
    ha_model.step(actions=[])

print(f"\nSimulation complete: {len(history)} days")
print(f"Final AQI: {history[-1]['aqi']:.0f}")
print(f"Final regime: {history[-1]['regime']}")

# %%
# Visualize AQI over time
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))

# AQI trajectory
days = [h['day'] for h in history]
aqis = [h['aqi'] for h in history]

ax1.plot(days, aqis, linewidth=2)
ax1.axhline(y=150, color='orange', linestyle='--', label='Unhealthy threshold')
ax1.axhline(y=300, color='red', linestyle='--', label='Severe threshold')
ax1.set_xlabel('Day')
ax1.set_ylabel('AQI')
ax1.set_title('AQI Over Time (No Interventions)')
ax1.legend()
ax1.grid(alpha=0.3)

# Regime distribution
from collections import Counter
regime_counts = Counter([h['regime'] for h in history])
regimes = list(regime_counts.keys())
counts = [regime_counts[r] for r in regimes]

ax2.bar(regimes, counts, color=['green', 'yellow', 'orange', 'red', 'purple'][:len(regimes)])
ax2.set_xlabel('Regime')
ax2.set_ylabel('Number of Days')
ax2.set_title('Time Spent in Each Regime')
ax2.grid(alpha=0.3, axis='y')

plt.tight_layout()
plt.show()

print(f"\nRegime Distribution:")
for regime, count in regime_counts.items():
    print(f"  {regime}: {count} days ({count/len(history)*100:.1f}%)")

# %% [markdown]
# ## 2. System Dynamics Model
#
# The SD model uses stock-flow equations to track emissions, dispersion, and deposition of PM2.5 from different sources.

# %%
# Initialize model
sd_model = DelhiAirQualitySD(start_date=start_date)

print(f"Initial State:")
print(f"  PM2.5: {sd_model.state.pm25:.1f} µg/m³")
print(f"  Vehicles: {sd_model.state.vehicle_emissions_rate:.0f} tons/day")
print(f"  Industry: {sd_model.state.industry_emissions_rate:.0f} tons/day")
print(f"  Stubble burning: {sd_model.state.stubble_burning_rate:.0f} tons/day")

# %%
# Simulate 30 days
sd_history = []

for day in range(30):
    sd_history.append({
        'day': day,
        'pm25': sd_model.state.pm25,
        'vehicle_emissions': sd_model.state.vehicle_emissions_rate,
        'industry_emissions': sd_model.state.industry_emissions_rate,
        'stubble_burning': sd_model.state.stubble_burning_rate,
        'total_emissions': (sd_model.state.vehicle_emissions_rate +
                          sd_model.state.industry_emissions_rate +
                          sd_model.state.stubble_burning_rate),
        'dispersion_rate': sd_model.state.dispersion_rate
    })

    sd_model.step(actions=[])

print(f"\nSimulation complete: {len(sd_history)} days")
print(f"Final PM2.5: {sd_history[-1]['pm25']:.1f} µg/m³")

# %%
# Visualize emissions and PM2.5
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 8))

days = [h['day'] for h in sd_history]

# PM2.5 concentration
pm25_values = [h['pm25'] for h in sd_history]
ax1.plot(days, pm25_values, linewidth=2, color='darkred')
ax1.axhline(y=60, color='orange', linestyle='--', alpha=0.5, label='WHO guideline (24h)')
ax1.set_xlabel('Day')
ax1.set_ylabel('PM2.5 (µg/m³)')
ax1.set_title('PM2.5 Concentration Over Time')
ax1.legend()
ax1.grid(alpha=0.3)

# Emissions by source (stacked)
vehicle = [h['vehicle_emissions'] for h in sd_history]
industry = [h['industry_emissions'] for h in sd_history]
stubble = [h['stubble_burning'] for h in sd_history]

ax2.stackplot(days, vehicle, industry, stubble,
              labels=['Vehicles', 'Industry', 'Stubble Burning'],
              colors=['#3498db', '#95a5a6', '#e74c3c'],
              alpha=0.8)
ax2.set_xlabel('Day')
ax2.set_ylabel('Emissions (tons/day)')
ax2.set_title('Emission Sources Over Time')
ax2.legend(loc='upper left')
ax2.grid(alpha=0.3)

plt.tight_layout()
plt.show()

# %% [markdown]
# ## 3. Comparing Models
#
# Let's compare how the two models predict AQI/PM2.5 over the same time period.

# %%
# Convert PM2.5 to AQI (simplified)
def pm25_to_aqi_simple(pm25):
    """Simplified PM2.5 to AQI conversion."""
    if pm25 <= 12:
        return pm25 * 50 / 12
    elif pm25 <= 35.4:
        return 50 + (pm25 - 12) * 50 / (35.4 - 12)
    elif pm25 <= 55.4:
        return 100 + (pm25 - 35.4) * 50 / (55.4 - 35.4)
    elif pm25 <= 150.4:
        return 150 + (pm25 - 55.4) * 100 / (150.4 - 55.4)
    else:
        return 250 + (pm25 - 150.4) * 250 / (250.4 - 150.4)

# Plot comparison
fig, ax = plt.subplots(figsize=(12, 6))

ha_days = [h['day'] for h in history]
ha_aqis = [h['aqi'] for h in history]

sd_days = [h['day'] for h in sd_history]
sd_aqis = [pm25_to_aqi_simple(h['pm25']) for h in sd_history]

ax.plot(ha_days, ha_aqis, linewidth=2, label='Hybrid Automaton', marker='o', markersize=4)
ax.plot(sd_days, sd_aqis, linewidth=2, label='System Dynamics', marker='s', markersize=4)

ax.axhline(y=150, color='orange', linestyle='--', alpha=0.3)
ax.axhline(y=300, color='red', linestyle='--', alpha=0.3)

ax.set_xlabel('Day')
ax.set_ylabel('AQI')
ax.set_title('Model Comparison: AQI Predictions Over 30 Days')
ax.legend()
ax.grid(alpha=0.3)

plt.tight_layout()
plt.show()

# Calculate correlation
correlation = np.corrcoef(ha_aqis, sd_aqis)[0, 1]
print(f"\nCorrelation between models: {correlation:.3f}")

# %% [markdown]
# ## Summary
#
# - **Hybrid Automaton**: Best for regime-based reasoning ("Are we in SEVERE?") and policy triggers (GRAP stages)
# - **System Dynamics**: Best for understanding emission sources and intervention effects
# - Both models can be used together for comprehensive analysis
#
# Next notebook: `02_action_system.py` - How to apply interventions to modify model behavior
