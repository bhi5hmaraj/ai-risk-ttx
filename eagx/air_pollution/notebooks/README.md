# Notebooks: Interactive Model Exploration

This folder contains Python notebooks (`.py` format with `# %%` cell markers) that demonstrate different ways to interact with the air pollution TTX models.

## Format

These are **Python scripts** that can be opened in:
- **Jupyter Lab/Notebook**: Automatically recognizes `# %%` cell markers
- **VS Code**: Install Python extension, cells appear automatically
- **PyCharm**: Recognizes percent format out of the box
- **Command line**: Run as regular Python scripts (`python 01_basic_model_usage.py`)

## Notebooks Overview

### 01_basic_model_usage.py
**What it covers:**
- Running Hybrid Automaton (HA) model
- Running System Dynamics (SD) model
- Comparing model predictions
- Visualizing AQI trajectories and regime distributions

**Run time:** ~2 minutes

**Key concepts:**
- Regime-based air quality classification
- Stock-flow emission modeling
- Model validation through comparison

**Example output:**
```
Initial AQI: 150 (MODERATE)
Final AQI: 274 (VERY_UNHEALTHY)
Correlation between models: 0.847
```

---

### 02_action_system.py
**What it covers:**
- 12 action primitives (SUBSIDIZE, BAN, TAX, etc.)
- Creating formal actions with parameters
- Executing actions on models
- Natural language → formal action translation
- Comparing intervention strategies

**Run time:** ~3 minutes

**Key concepts:**
- Compositional action grammar
- Parametric vs emergent effects
- Cost-effectiveness analysis

**Example output:**
```
Action: SUBSIDIZE(farmers, magnitude=0.75, cost=300)
Effect: Stubble burning reduced by 70%
Expected AQI reduction: -45 points
```

---

### 03_architect_mode.py
**What it covers:**
- Document ingestion (Phase 1)
- Scenario compilation (Phase 2)
- Validation through simulation (Phase 3)
- Difficulty presets (easy/medium/hard)
- Saving scenarios as JSON

**Run time:** ~5 minutes (includes validation simulations)

**Key concepts:**
- GM control tiers (must/can/shouldn't control)
- Balance checking (target win rate: 40-60%)
- Scenario schema compliance

**Example output:**
```
✅ Scenario compiled: October Crisis 2024
   Stakeholders: 5
   Events: 4
   Win rate: 55% (Balanced ✅)
   File size: 15.8 KB
```

---

### 04_game_theory.py
**What it covers:**
- Utility functions for stakeholders
- Computing Nash equilibria
- Pareto frontier analysis
- Mechanism design (subsidies, coordination bonuses)
- Strategy profile heatmaps

**Run time:** ~4 minutes

**Key concepts:**
- Nash equilibrium as stable strategy profile
- Pareto optimality (cost vs public welfare trade-offs)
- Incentive alignment through mechanism design

**Example output:**
```
Nash Equilibrium found:
  Delhi CM: Subsidize Happy Seeder
  Punjab Farmer: Partial compliance
  Central Minister: Interstate coordination

Final AQI: 210 (not optimal, but stable)
```

---

### 05_full_simulation.py
**What it covers:**
- Complete 5-round game simulation
- Multi-stakeholder strategic interaction
- Dynamic events (Diwali spike, Supreme Court)
- Win/lose condition checking
- Comprehensive visualization

**Run time:** ~3 minutes

**Key concepts:**
- Full game loop integration
- Event triggering logic
- Score tracking across rounds
- Game outcome determination

**Example output:**
```
ROUND 5 COMPLETE
✅ SUCCESS: Crisis managed
   Final AQI: 187
   Public score: 72/100
   Delhi CM: +15 points
   Punjab Farmer: +10 points
```

---

## Quick Start

### Option 1: Jupyter Lab (Recommended)

```bash
# Install Jupyter
pip install jupyterlab

# Launch Jupyter
cd eagx/air_pollution/notebooks
jupyter lab

# Open any .py file - cells will appear automatically
```

### Option 2: VS Code

```bash
# Install Python extension (if not installed)
# code --install-extension ms-python.python

# Open folder in VS Code
code eagx/air_pollution/notebooks/

# Open any .py file
# Click "Run Cell" buttons that appear above # %% markers
```

### Option 3: Command Line

```bash
cd eagx/air_pollution/notebooks

# Run entire notebook
python 01_basic_model_usage.py

# Or run specific cells interactively with IPython
ipython -i 01_basic_model_usage.py
```

## Dependencies

Install required packages:

```bash
pip install numpy matplotlib pandas
```

Optional (for better visualizations):
```bash
pip install seaborn plotly
```

## File Structure

```
notebooks/
├── README.md                    # This file
├── 01_basic_model_usage.py      # Model fundamentals
├── 02_action_system.py          # Action mechanics
├── 03_architect_mode.py         # Scenario creation
├── 04_game_theory.py            # Strategic analysis
└── 05_full_simulation.py        # Complete game
```

## Learning Path

**Recommended sequence:**

1. **Start with 01_basic_model_usage.py**
   - Understand how the models work
   - See baseline (no intervention) trajectories

2. **Then 02_action_system.py**
   - Learn how to intervene in the models
   - Compare different strategies

3. **Then 03_architect_mode.py**
   - See how Game Masters create scenarios
   - Understand validation process

4. **Then 04_game_theory.py**
   - Analyze strategic interactions
   - Understand Nash equilibria and Pareto frontiers

5. **Finally 05_full_simulation.py**
   - See everything integrated
   - Complete 5-round game

**Alternative paths:**

- **For Game Designers**: Start with 03 (Architect Mode), then 05 (Full Simulation)
- **For Policy Researchers**: Start with 01 (Models), then 02 (Actions), then 04 (Game Theory)
- **For Players**: Start with 05 (Full Simulation) to see the complete experience

## Customization

All notebooks can be modified to explore different scenarios:

### Change starting conditions
```python
# In 01_basic_model_usage.py
ha_model = DelhiAirQualityHA(
    start_date=datetime(2024, 11, 1),  # Different start
    initial_aqi=200  # Worse starting conditions
)
```

### Try different actions
```python
# In 02_action_system.py
action = action_system.create_action(
    primitive=ActionPrimitive.TAX,  # Try TAX instead of SUBSIDIZE
    target=ActionTarget.VEHICLES,
    magnitude=0.5
)
```

### Adjust difficulty
```python
# In 03_architect_mode.py
gm_config['difficulty'] = 'hard'  # Try hard mode
gm_config['rounds'] = 7  # Longer game
```

### Modify utility functions
```python
# In 04_game_theory.py
delhi_cm.alpha = 0.8  # More weight on public score
delhi_cm.beta = 0.2   # Less weight on hidden objective
```

### Change simulation strategy
```python
# In 05_full_simulation.py
# Modify simulate_stakeholder_actions() function
# to test different player strategies
```

## Troubleshooting

### "Module not found" error
```bash
# Make sure you're in the notebooks directory
cd eagx/air_pollution/notebooks

# And that models/ is in the parent directory
ls ../models/  # Should show .py files
```

### Cells not appearing in Jupyter
```bash
# Check file has # %% markers
head -20 01_basic_model_usage.py | grep "# %%"

# If using Jupyter Notebook (not Lab), update to latest:
pip install --upgrade notebook
```

### Plots not showing
```python
# Add this at the start of any notebook
%matplotlib inline
```

### Import errors from action_system
```bash
# Make sure action_system/ module exists
ls ../models/action_system/  # Should show __init__.py

# Try installing in development mode
cd .. && pip install -e .
```

## Tips

### Interactive Exploration

Use IPython for interactive exploration:
```python
ipython
>>> %load 01_basic_model_usage.py
>>> # Run cells one by one with Ctrl+Enter
```

### Saving Outputs

Save figures programmatically:
```python
plt.savefig('my_plot.png', dpi=300, bbox_inches='tight')
```

Export data to CSV:
```python
import pandas as pd
df = pd.DataFrame(history)
df.to_csv('simulation_results.csv', index=False)
```

### Running in Batch

Run all notebooks sequentially:
```bash
for nb in 0*.py; do
    echo "Running $nb..."
    python $nb
done
```

### Creating Your Own Notebooks

Use the percent format:
```python
# %% [markdown]
# # My Custom Analysis
#
# Description here

# %%
import numpy as np
# Your code here

# %%
# Next cell
```

## Output Examples

### Typical Visualizations

- **AQI trajectories**: Line plots showing AQI over time
- **Regime distributions**: Bar charts of time in each regime
- **Cost-effectiveness**: Scatter plots of cost vs impact
- **Heatmaps**: Strategy profile outcomes
- **Pareto frontiers**: Trade-off curves

### Typical Console Output

```
Initial State:
  Regime: MODERATE
  AQI: 150
  PM2.5: 80.0 µg/m³

Simulation complete: 30 days
Final AQI: 274
Final regime: VERY_UNHEALTHY

Regime Distribution:
  MODERATE: 8 days (26.7%)
  UNHEALTHY: 12 days (40.0%)
  VERY_UNHEALTHY: 10 days (33.3%)
```

## Further Reading

- **ARCHITECTURE.md**: Detailed system architecture
- **EVALUATION_FRAMEWORK.md**: Metrics and validation
- **ARCHITECT_MODE_DESIGN.md**: GM workflow details
- **HYBRID_LLM_MATH_ARCHITECTURE.md**: Action system design

## Contributing

To add a new notebook:

1. Use percent format (`# %%` for cells)
2. Add markdown cells (`# %% [markdown]`)
3. Include clear section headers
4. Provide example outputs in markdown
5. Update this README with description
6. Test in both Jupyter and command line

## License

Same as main project.
