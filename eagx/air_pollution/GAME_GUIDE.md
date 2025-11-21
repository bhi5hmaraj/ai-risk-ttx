# Delhi Air Pollution TTX - Game Guide for Facilitators

## Pre-Session Preparation (30 minutes before)

### 1. Technical Setup

```bash
# Backend
cd eagx/air_pollution/models
pip install -r requirements.txt
python delhi_hybrid_automaton.py  # Test run
python delhi_system_dynamics.py   # Test run

# Quick demo
streamlit run ../web_ui/streamlit_demo.py
```

Verify:
- ✅ Models run without errors
- ✅ Streamlit opens at localhost:8501
- ✅ LiteLLM API key is set (`VITE_LITELLM_API_KEY`)

### 2. Room Setup

**Layout**: Round table or U-shape for 4-8 players

**Materials**:
- Projector showing game dashboard (AQI, health, budget)
- Printed role cards (one per player)
- Scratch paper for negotiations
- Timer (visible 8-minute countdown)

**Roles to assign** (scale based on player count):

| Min Players | Roles |
|-------------|-------|
| 4 | Chief Minister, Environment Minister, Farmer Rep, Industry Leader |
| 6 | Add: Public Health Director, Civil Society Activist |
| 8 | Add: Transport Commissioner, Weather Chief |

### 3. Print Materials

Print 1 copy per player:
- Role card (public + hidden objectives)
- Quick reference (action costs, AQI scale)
- Note-taking sheet

---

## Session Rundown (90 minutes total)

### Introduction (10 min)

**Script**:

> "Welcome to Delhi, November 2027. You are the key decision-makers during the worst air pollution crisis in a decade. Your city is choking. Children are hospitalized. The Supreme Court is demanding action. International events are being canceled. And your economy depends on the very activities causing the problem.
>
> This is not a game about who's right or wrong. It's about **coordination under constraints**. Each of you has public responsibilities—but also private pressures. Your success depends on finding trade-offs that satisfy both.
>
> The simulation is powered by three formal models running in real-time:
> 1. **Hybrid Automaton**: Regime switches when AQI crosses thresholds (GRAP stages)
> 2. **System Dynamics**: Physical emissions, dispersion, health impacts
> 3. **Agent-Based Model**: How farmers, industries, and citizens actually respond to your policies
>
> An AI narrator will tell the story of what happens based on your choices and the model outcomes.
>
> You have **5 rounds** (each = 2 months). Let's begin."

### Role Assignment (5 min)

Distribute role cards. Give players 3 minutes to read in silence.

**Facilitator**: Walk around, answer clarifying questions quietly.

### Round 1: Learning (15 min)

**Briefing** (display on screen):
```
=== ROUND 1: Early October ===
AQI: 150 (Unhealthy)
Public Health: 70/100
Budget: ₹800 crores
Public Approval: 65%

Weather Forecast: Wind speeds dropping next week. Stubble burning season begins in 10 days. Diwali in 3 weeks.

Recent News: "Delhi ranked #1 most polluted capital globally for third consecutive year"
```

**Deliberation** (8 min):
- Players discuss options
- Can form coalitions, negotiate
- **Facilitator**: Observe dynamics, don't interfere unless stuck

**Action Selection** (2 min):
- Players submit choices to you (or via web interface)
- Common Round 1 choices:
  - Subsidy farmers (expensive but addresses root cause)
  - Vehicle restrictions (visible action, modest effect)
  - Monitoring boost (info gathering)

**Consequence** (5 min):
- Run simulation
- Read AI-generated narrative aloud
- Update dashboard
- Reveal events (if any)

**Example consequence narrative**:

> "Your subsidies reach 20% of farmers—many welcome the help, but most say it's too little, too late. Planting deadlines loom. By mid-October, satellite imagery reveals **2,800 active farm fires** across Punjab and Haryana. Winds die down. A thick, acrid haze settles over Delhi.
>
> **AQI: 287** (Very Unhealthy). GRAP Stage 2 now in effect.
>
> Emergency rooms report a **40% surge** in respiratory cases. Schools debate closure. The Supreme Court issues a notice demanding action within 48 hours."

### Rounds 2-4: Escalation (40 min total, ~13 min each)

Same structure, but:
- **Round 2**: Diwali firecracker spike, temperature inversion
- **Round 3**: Crisis peak (possible SEVERE regime)
- **Round 4**: Political backlash, inter-state conflict

**Facilitator Tips**:
- **Pacing**: Keep to 8-min deliberation max. Use timer.
- **Tension**: If AQI stays high, introduce crisis events (e.g., "Celebrity posts video of child on ventilator—viral")
- **Coalitions**: Notice alliances forming? Highlight in debrief.
- **Hidden objectives**: Remind players they have secret win conditions.

### Round 5: Endgame (15 min)

**Setup**:
- Reveal hidden objectives to all players
- "This is your last chance to secure your victory condition"

**Deliberation**: May be chaotic—allow it.

**Final Consequence**: Resolve, show final AQI and outcomes.

### Debrief (15 min)

**Questions to pose**:

1. **Individual reflection**: "Did you achieve your hidden objective? Why or why not?"

2. **Coordination**: "What made coordination hard? Was there a moment you could have cooperated but didn't?"

3. **Trade-offs**: "Which actions felt most impactful? Which felt symbolic?"

4. **Models**: "Were you surprised by any simulation results? Did the models match your intuition?"

5. **Real-world**: "What did this reveal about real Delhi? What policies do you think would actually work?"

**Facilitator**: Synthesize themes
- Coordination failures (even with same ultimate goal)
- Short-term vs long-term tensions
- Information gaps (weather uncertainty)
- Equity issues (who bears costs?)

### Wrap-Up (5 min)

**Key Takeaways**:

✅ **Formal models made hidden dynamics visible**
- You saw exactly how stubble burning translates to AQI
- Health impacts quantified (not just "bad")
- Compliance rates matter more than policies on paper

✅ **Coordination is hard even for rational actors**
- Despite shared interest (breathable air), individual incentives diverged
- Hidden objectives created realistic tensions

✅ **Effective Altruism principles apply**:
- **Cost-effectiveness**: ₹/DALY saved varies wildly by intervention
- **Neglectedness**: Air pollution kills millions but gets less attention than climate
- **Tractability**: Some problems (inversions) are hard; others (subsidies) are solvable

---

## Common Facilitator Questions

**Q: Players argue the simulation is unrealistic**
A: Ask: "In what way?" Often reveals misconceptions. Use as teaching moment. If genuinely wrong, note for model calibration.

**Q: One player dominates discussion**
A: "Let's hear from [quieter player]. What's your priority this round?"

**Q: Players stuck in analysis paralysis**
A: "You have 2 minutes left. Sometimes action under uncertainty is better than perfect inaction."

**Q: Technical glitch (model crash, API timeout)**
A: Have backup: Pre-run a scenario, use screenshots. Narrate manually if needed.

**Q: Players ask: "How much does action X help?"**
A: "You'll see in the consequence phase." (Don't give away model internals—makes choices too mechanical.)

---

## Customization Options

### Easier (for non-expert audiences)
- Reduce roles to 4
- Start at AQI 100 (less dire)
- Give hints: "Stubble burning is 40% of problem in Oct-Nov"

### Harder (for policy experts)
- Add weather uncertainty (don't reveal forecast)
- Budget constraints (force hard choices)
- Inter-state politics (Punjab player added)

### Research Mode
- Ask players to predict outcomes before seeing them
- Compare player intuitions vs model results
- Survey: "What surprised you?"

---

## Post-Session: Data Collection

For research/improvement:

```python
# Log all game sessions
session_data = {
    'session_id': uuid4(),
    'players': [list of roles],
    'actions_history': [all submitted actions],
    'outcomes': [AQI, health, approval per round],
    'hidden_objectives_achieved': [bool per player],
    'player_feedback': [post-game survey responses]
}

# Save to JSON for analysis
```

**Questions to ask** (post-game survey):
1. Engagement (1-5): How engaged were you?
2. Learning (1-5): Did you learn about air pollution dynamics?
3. Realism (1-5): Did the scenario feel realistic?
4. Models (1-5): Did the formal models enhance the experience?
5. Open: What surprised you most?
6. Open: What would you change about the game?

---

## Appendix: Quick Reference

### AQI Scale
| AQI | Level | Color | Health Implications |
|-----|-------|-------|---------------------|
| 0-50 | Good | Green | Minimal impact |
| 51-100 | Moderate | Yellow | Sensitive groups affected |
| 101-200 | Unhealthy | Orange | General public affected |
| 201-300 | Very Unhealthy | Red | Health alert |
| 301-400 | Hazardous | Purple | Health emergency |
| 401+ | Severe | Maroon | All affected |

### GRAP Stages
- **Stage 1** (AQI 101-200): Advisories, dust control
- **Stage 2** (AQI 201-300): Parking fees, construction limits
- **Stage 3** (AQI 301-400): Odd-even vehicles, ban on construction
- **Stage 4** (AQI 401+): Schools closed, work from home, trucks banned

### Typical Action Costs
| Action | Cost (₹ crores) | AQI Impact |
|--------|-----------------|------------|
| Farmer subsidy (50%) | 200 | -40 to -80 (seasonal) |
| Odd-even vehicle scheme | 10 | -10 to -20 |
| Construction ban (full) | 5 (enforcement) | -15 to -25 |
| Industry compliance boost | 50 | -20 to -30 |
| Dust suppression (roads) | 30 | -10 to -15 |
| Metro expansion (long-term) | 500 | -5 to -10 (gradual) |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Model runs too slow | Use simplified ABM (fewer agents) |
| LLM narratives repetitive | Add temperature=0.9, diversify prompts |
| Players confused by hidden objectives | Clarify: "Think of it as your political constraint" |
| No crisis despite high AQI | Manually trigger event: "Media reports..." |
| Players give up (fatalism) | Introduce hope: "New WHO funding available" |

---

**Good luck facilitating! Remember: The goal is learning through experience, not winning.**
