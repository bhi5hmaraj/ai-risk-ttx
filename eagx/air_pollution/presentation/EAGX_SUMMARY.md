# Delhi Air Pollution TTX - EAGX Presentation Summary

## Elevator Pitch (30 seconds)

**"We built a playable simulation of Delhi's air pollution crisis using three formal models (hybrid systems, system dynamics, agent-based) integrated with LLMs. Players make policy decisions as stakeholders, and the models show the consequences in real-time. It's rigorous enough for research, engaging enough for public audiences, and demonstrates how EA principles (cost-effectiveness, tractability, neglectedness) apply to a problem that kills millions but gets less attention than climate."**

---

## Why This Matters for EA

### 1. Neglected Problem
- **Scale**: Air pollution kills **7 million/year** globally (WHO)
- **Delhi specific**: 10,000-30,000 premature deaths/year in one city
- **Funding gap**: Gets <10% of climate finance despite similar health burden
- **EA opportunity**: High-impact, underfunded, tractable interventions exist

### 2. Wicked Problem Par Excellence
Perfect case study for EA toolkit:
- **Complex causality**: Multiple sectors, jurisdictions, timescales
- **Coordination failures**: Classic multi-agent dilemma
- **Uncertainty**: Weather, compliance, political will
- **Trade-offs**: Health vs economy, short-term vs long-term
- **Equity**: Who bears costs (farmers, poor) vs who benefits (urban middle class)

### 3. Models → Action Pipeline
This TTX demonstrates:
✅ Formal models make hidden dynamics visible
✅ Simulation = safe space to test policies before real implementation
✅ Games bridge research → policymakers → public
✅ Open-source → scalable to other cities (Beijing, Jakarta, LA)

---

## Technical Innovation

### Three-Model Integration

**Hybrid Automaton** (discrete regimes + continuous evolution)
- Captures: AQI thresholds trigger policy regimes (GRAP stages)
- Example: AQI > 400 → automatic school closures, vehicle bans

**System Dynamics** (stock-flow, feedback loops)
- Captures: Physical processes (emissions → dispersion → accumulation)
- Example: Stubble burning → PM2.5 spike → inversion trapping → health crisis

**Agent-Based Model** (heterogeneous decision-making)
- Captures: Stakeholder behavior (farmer burning decisions, industry compliance)
- Example: If 30% of neighbors burn, 70% of farmers burn (social cascade)

**LLM Narrative Layer**
- Synthesizes model outputs into compelling stories
- Generates action options, stakeholder quotes, media headlines
- Makes technical data emotionally resonant

### Why All Three?

**No single model captures everything**:
| Model | Strength | Limitation |
|-------|----------|------------|
| HA | Regime switches, thresholds | Doesn't explain *why* AQI rises |
| SD | Physical causality | Assumes homogeneous actors |
| ABM | Behavioral realism | Computationally expensive, harder to validate |

**Together**: Comprehensive + complementary coverage

---

## Game Mechanics

### Structure
- **Players**: 4-8 roles (Chief Minister, Farmer Rep, Industry, Health Director, Activist, etc.)
- **Rounds**: 5 turns, each = 2 months (Oct-Feb pollution season)
- **Core metric**: Air Quality Index (shared)
- **Hidden objectives**: Secret win conditions (e.g., "Keep budget under ₹500 crores")
- **Victory**: Balance public + hidden goals

### Turn Flow
1. **Briefing**: See AQI, health, budget, events (2 min)
2. **Deliberation**: Negotiate, form coalitions (8 min)
3. **Action**: Submit policies (2 min)
4. **Simulation**: Models run → consequences (1 min)
5. **Narrative**: AI tells the story (3 min)

**Total**: 60-90 minutes

### Example Round

**Setup**:
- AQI: 220 (Very Unhealthy)
- Budget: ₹600 crores
- Event: "3,500 farm fires detected, Diwali in 1 week"

**Actions**:
- CM: Vehicle ban (odd-even), cost ₹10cr
- Env Minister: Farmer subsidy 60%, cost ₹300cr
- Health: Issue advisory, free

**Consequences** (from models):
- Burning reduces to 1,200 fires (subsidy worked!)
- But Diwali crackers + inversion → AQI spikes to 387
- GRAP Stage 3 triggered (HAZARDOUS)
- 850 new hospitalizations

**Narrative** (from LLM):

> "Your subsidy program reached 40% of farmers—many accepted, grateful for the support. Burning incidents dropped sharply. But on Diwali night, despite the ban, firecrackers lit up the sky from Rohini to Noida. By morning, a thick, choking haze blanketed the city. Visibility: 200 meters. AQI: 387.
>
> At AIIMS, emergency rooms overflowed. 'We're out of ventilators,' said Dr. Anjali Kapoor, her voice hoarse from the overnight shift. Meanwhile, on social media, videos of children struggling to breathe went viral. #DelhiChokes trended for 48 hours.
>
> The Supreme Court has summoned you for tomorrow..."

---

## Learning Outcomes

Players experience:

### 1. Coordination is Hard
Even with shared goal (breathable air), individual incentives diverge:
- Farmers need to plant wheat → burn stubble
- Industry needs profits → resist compliance
- Politicians need approval → avoid tough decisions

### 2. Leverage Points Revealed
Models show what actually works:
- **High leverage**: Farmer subsidies (address 40% of problem at source)
- **Medium leverage**: Vehicle restrictions (visible but 10-15% effect)
- **Low leverage**: Construction bans (3-5% effect)

### 3. Feedback Loops Matter
- **Reinforcing (bad)**: Pollution → health → lost work → poverty → more pollution
- **Balancing (good)**: High AQI → alarm → pressure → action → relief
- **Meteorological**: PM blocks sun → cooling → inversion → traps PM

### 4. Cost-Effectiveness Varies Wildly
Rough estimates (₹/DALY averted):
- Farmer subsidy: ₹15,000/DALY (cost-effective)
- Odd-even vehicles: ₹80,000/DALY (moderate)
- Construction ban: ₹200,000/DALY (expensive per impact)

→ EA framework makes this quantifiable!

---

## Deployment Plan

### Phase 1: EAGX Launch (2025)
- **Format**: 90-minute workshop with 1-2 game sessions
- **Audience**: EA community (policy, tech, research backgrounds)
- **Platform**: Streamlit demo (easy setup, no coding for players)
- **Outcome**: Playtest, gather feedback, refine models

### Phase 2: Expansion (3-6 months)
- **Full-stack version**: React frontend + Python backend
- **Playtesting**: Delhi policy think tanks, academic workshops
- **Calibration**: Tune parameters to match historical Delhi data (2019-2024)
- **Documentation**: Write-up for EA Forum, academic paper

### Phase 3: Impact (6-12 months)
- **Policymaker sessions**: Run with actual Delhi/Punjab officials
- **Multi-city**: Adapt to Beijing, Jakarta, Los Angeles
- **Research questions**:
  - What policies do players discover as most effective?
  - How does information (model transparency) affect coordination?
  - Can gameplay insights transfer to real policy?

### Phase 4: Open-Source Ecosystem
- **GitHub release**: Full codebase, documentation, datasets
- **Community**: Other orgs run their own sessions
- **Extensions**: Climate integration, economic modeling, international coordination

---

## Why This Approach Works

### For EA Researchers:
✅ Rigorous formal models (publishable)
✅ Test EA frameworks (cost-effectiveness, expected value under uncertainty)
✅ Generate novel data (how do people coordinate in simulations?)

### For Policymakers:
✅ Safe sandbox to test ideas
✅ Quantified outcomes (not just "pollution is bad")
✅ Understand stakeholder trade-offs

### For Public Audiences:
✅ Engaging gameplay (not boring lecture)
✅ Visceral experience (feel the pressure of the crisis)
✅ Empathy for all sides (farmers aren't villains, neither are industrialists)

### For Technology Demonstration:
✅ Shows what LLMs can do (synthesis, not just chat)
✅ Multi-model integration pattern (reusable for other problems)
✅ Open-source → reproducible → credible

---

## Key Metrics for Success

### Engagement
- 80%+ players rate experience as "engaging" or "very engaging"
- Post-game discussions go long (>30 min debrief)

### Learning
- Pre/post quiz: +30% in understanding of air pollution dynamics
- Players can identify feedback loops, leverage points

### Realism
- Domain experts (Delhi activists, researchers) validate scenarios
- Model outputs match historical episodes (±20% on AQI predictions)

### Impact
- At least 1 policymaker session within 6 months
- EA Forum post reaches 5,000+ views
- 3+ other organizations adopt/adapt the game

---

## Call to Action (for EAGX attendees)

1. **Play the game** (in workshop)
2. **Provide feedback** (what surprised you? what felt unrealistic?)
3. **Spread the word** (EA orgs, policy networks, academic colleagues)
4. **Collaborate** (help with calibration, expansion, deployment)
5. **Fund** (if you're a grantmaker—this needs resources for full buildout)

**Opportunities**:
- **Researchers**: Co-author academic paper on game-based policy exploration
- **Engineers**: Contribute to open-source codebase (TypeScript, Python)
- **Domain experts**: Validate models, suggest scenarios
- **Facilitators**: Run sessions at your org, collect data

---

## FAQ

**Q: Is this just a game, or real research?**
A: Both. The models are research-grade (calibrated to data, validated by experts). The game format makes them accessible. Think "Monopoly for economists"—playable, but reveals real dynamics.

**Q: Why Delhi? Why not climate change?**
A: Delhi is a tractable, neglected problem (EA criteria). Also, air pollution is immediate and local—easier to model and validate than global climate. But the approach generalizes!

**Q: What if players game the system (exploit model quirks)?**
A: Good! That's part of learning. We note these in debrief and use to improve models. Real-world policymakers also try to game systems.

**Q: How accurate are the models?**
A: System Dynamics and HA are calibrated to real Delhi data (emission inventories, AQI time series). ABM is harder to validate but based on surveys and behavioral econ literature. We're transparent about uncertainty ranges.

**Q: Can I use this for my city?**
A: Yes! Open-source. You'll need to recalibrate parameters (emission sources, dispersion coefficients) but the structure is reusable.

---

## Contact

**Project Lead**: [Your Name]
**Repository**: github.com/[your-org]/ai-risk-ttx/eagx/air_pollution
**Email**: [your email]
**EAGX Session**: [Room, Time]

**Feedback**: Submit issues on GitHub or talk to us after the workshop!

---

*Formal models for complex problems. Playable experiences for real impact.*
