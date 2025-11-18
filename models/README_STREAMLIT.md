# Streamlit Web UI for AI 2027 Formal Models

Interactive web interface for exploring the formal models of the AI 2027 scenario.

## Quick Start

### 1. Install Dependencies

```bash
pip install -r models/requirements.txt
```

### 2. Run the UI

```bash
streamlit run models/web_ui.py
```

The UI will open in your browser at `http://localhost:8501`

## Features

### 🔄 Hybrid Automaton
- Adjust initial conditions (capabilities, trust, coordination)
- Control simulation parameters (time, racing intensity)
- Visualize mode transitions and continuous state evolution
- See real-time switching between PRE_AGI → RACING → CRISIS → SAFE_TRANSITION

### 🎯 Markov Decision Process (MDP)
- Compute optimal policies for different roles (tech CEO, regulator, journalist)
- Adjust discount factor and convergence parameters
- View policy tables and heatmaps
- Analyze action distributions across states

### 📖 Mealy Machine
- Build custom input sequences (player roles + actions)
- Generate context-aware narratives
- Track state transitions
- See score changes and event triggers

### 🔁 System Dynamics
- Configure initial stocks and parameters
- Adjust racing multiplier and trust erosion rates
- Visualize feedback loops (reinforcing and balancing)
- Detect crisis tipping points automatically

### 👥 Agent-Based Model (ABM)
- Control agent population (CEOs, regulators, journalists, researchers)
- Adjust information noise and simulation length
- Watch emergent coordination (or failure)
- Explore trust networks and strategy evolution

## Architecture

The UI uses Streamlit's reactive programming model:

```python
# User adjusts slider
racing_intensity = st.slider("Racing Intensity", 0.0, 1.0, 0.3)

# Button triggers simulation
if st.button("Run Simulation"):
    model = HybridAutomaton()
    results = model.simulate(...)
    st.pyplot(plot_results(results))  # Auto-updates
```

## Integration with TypeScript Frontend

### Option 1: Standalone Analysis Tool
Run Streamlit as a separate analytics dashboard for researchers and game designers.

### Option 2: FastAPI Bridge
Wrap models in a REST API:

```python
# models/api.py
from fastapi import FastAPI
from hybrid_automaton import HybridAutomaton

app = FastAPI()

@app.post("/api/simulate/hybrid")
async def simulate_hybrid(params: dict):
    ha = HybridAutomaton()
    results = ha.simulate(**params)
    return {"trajectory": results}
```

Then call from TypeScript:
```typescript
const response = await fetch('http://localhost:8000/api/simulate/hybrid', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({max_time: 10, actions: [...]})
})
const data = await response.json()
```

### Option 3: PyScript (Python in Browser)
Experimental: Run Python models directly in the browser using PyScript.

## Tips

- **Performance**: For large simulations, consider caching results with `@st.cache_data`
- **Deployment**: Deploy to Streamlit Cloud with one click (free tier available)
- **Customization**: Modify `web_ui.py` to add new visualizations or parameter controls

## File Structure

```
models/
├── web_ui.py              # Main Streamlit interface
├── requirements.txt       # Python dependencies
├── hybrid_automaton.py    # Model implementations
├── mdp_model.py
├── mealy_machine.py
├── system_dynamics.py
├── agent_based_model.py
└── README.md             # Model documentation
```

## Troubleshooting

**Import errors?**
```bash
# Make sure you're in the project root
cd /home/user/ai-risk-ttx
export PYTHONPATH=$PYTHONPATH:$(pwd)
streamlit run models/web_ui.py
```

**Slow simulations?**
Reduce simulation steps or enable caching:
```python
@st.cache_data
def run_simulation(params):
    # ... expensive computation
```

## Next Steps

1. **Add real-time updates**: Use `st.empty()` for live simulation progress
2. **Export results**: Add CSV/JSON download buttons
3. **Compare models**: Side-by-side visualization of different approaches
4. **Parameter sweeps**: Automated sensitivity analysis
5. **Integration**: Connect to game server for live policy recommendations
