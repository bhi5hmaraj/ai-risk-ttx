"""
LLM Prompts for Delhi Air Pollution TTX

Generates context-aware narratives from simulation results.
"""

GAME_MASTER_SYSTEM_PROMPT = """You are the Game Master for a tabletop exercise simulating Delhi's air pollution crisis.

Your role is to translate dry simulation data (AQI levels, emissions, compliance rates) into vivid, realistic narratives that help players understand the human impact of their decisions.

Guidelines:
1. **Grounded in data**: Every narrative element must reflect the actual simulation outputs
2. **Show don't tell**: Use specific details (hospital names, neighborhoods, people) rather than abstractions
3. **Multiple perspectives**: Include farmers, patients, politicians, activists, children
4. **Causal clarity**: Make it clear which player actions led to which outcomes
5. **Escalating tension**: As AQI rises, narratives should become more urgent
6. **Hope and agency**: Even in crisis, show that coordinated action can help
7. **Indian context**: Use Delhi landmarks, Indian policy frameworks (GRAP), local language

Tone: Serious but not preachy. Journalistic. Empathetic to all stakeholders.
"""

def get_round_intro_prompt(round_num, season, weather, current_aqi):
    """Generate opening narrative for a round"""
    return f"""Generate a brief opening narrative for Round {round_num} of the Delhi Air Pollution Crisis game.

**Context**:
- Season: {season}
- Weather: {weather['description']}
- Current AQI: {current_aqi} ({get_aqi_category(current_aqi)})

**Requirements**:
1. Set the scene (weather, visible smog, public mood)
2. Mention 1-2 specific Delhi locations (e.g., India Gate, Connaught Place, East Delhi)
3. Include one "human interest" element (a shopkeeper, a mother, a student)
4. Keep under 100 words
5. End with forward-looking question or tension

Return JSON:
{{
    "narrative": "<opening paragraph>",
    "headline": "<Delhi Times style headline>",
    "mood": "<public sentiment 1-3 words>"
}}
"""

def get_consequence_prompt(turn_result, actions_taken):
    """Generate narrative for round resolution"""

    actions_summary = "\n".join([
        f"- {a['player_role']}: {a['action_type']} (magnitude: {a['magnitude']})"
        for a in actions_taken
    ])

    return f"""Generate a consequences narrative for the Delhi Air Pollution game.

**Player Actions**:
{actions_summary}

**Simulation Results**:
- Starting AQI: {turn_result['aqi_start']} → Ending AQI: {turn_result['aqi_end']}
- PM2.5: {turn_result['pm25']} μg/m³
- Regime: {turn_result['regime']} (GRAP Stage {turn_result['grap_stage']})
- Stubble burning events: {turn_result['burning_events']}
- Industry compliance: {turn_result['industry_compliance']*100:.0f}%
- Vehicle compliance: {turn_result['vehicle_compliance']*100:.0f}%
- Hospitalizations: {turn_result['new_hospitalizations']:.0f} new cases
- Public alarm: {turn_result['public_alarm']:.0f}%

**Events Triggered**: {', '.join(turn_result.get('events', [])) or 'None'}

**Requirements**:
1. Chronological structure: Initial state → Actions taken → Immediate effects → Ripple effects → New equilibrium
2. Attribution: Clearly link actions to outcomes (e.g., "The subsidy program reached 30% of farmers...")
3. Specificity: Use numbers from the simulation
4. Diverse voices: Quotes from 2-3 stakeholders (farmer, patient, bureaucrat, activist)
5. Causal mechanisms: Explain *why* (e.g., "With wind speeds below 3 km/h, an atmospheric inversion trapped...")
6. Forward tension: End with what's at stake next round
7. Length: 200-300 words, broken into 3-5 paragraphs

Return JSON:
{{
    "story_beats": [
        "Opening: Delhi wakes to...",
        "Action 1 effect: The vehicle ban...",
        "Action 2 effect: Meanwhile, farmer subsidies...",
        "Compounding factors: But weather conditions...",
        "Closing: As the week ends..."
    ],
    "stakeholder_quotes": [
        {{"role": "Farmer", "name": "Ram Singh", "quote": "..."}},
        {{"role": "Patient", "name": "Anjali Mehta", "quote": "..."}},
        {{"role": "Activist", "name": "Dr. Sharma", "quote": "..."}}
    ],
    "headlines": [
        "Delhi Times: ...",
        "The Hindu: ...",
        "NDTV: ..."
    ],
    "key_numbers": [
        "AQI reached XXX",
        "Y,YYY farm fires detected",
        "ZZZ patients hospitalized"
    ]
}}
"""

def get_action_options_prompt(role, game_state):
    """Generate 5 action options for a player role"""
    return f"""Generate 5 action options for the {role} in Round {game_state['round']} of the Delhi Air Pollution Crisis game.

**Current Situation**:
- AQI: {game_state['aqi']} ({game_state['regime']})
- Budget: ₹{game_state['budget']} crores
- Public Approval: {game_state['public_approval']}%
- Season: {game_state['season']}
- Days until Diwali: {game_state.get('days_until_diwali', 'N/A')}

**Role Context**:
{get_role_context(role)}

**Requirements**:
1. Each option should be **actionable** (specific policy instrument)
2. Vary in **cost** (₹10-500 crores) and **political capital**
3. Include **trade-offs** (helps X but hurts Y)
4. At least one **bold** option (high risk, high reward)
5. At least one **safe** option (minimal backlash)
6. Grounded in **real Delhi policies** (e.g., odd-even, GRAP measures, subsidies)

Return JSON:
{{
    "options": [
        {{
            "title": "Expand Farmer Subsidy to 75% Coverage",
            "description": "Increase subsidy for stubble management machinery from 50% to 75%. Projected to reduce burning by 40%.",
            "cost_rupees_crores": 300,
            "aqi_impact_estimate": "-60 to -100 (seasonal)",
            "public_approval_impact": "+5 (farmers), -2 (urban voters - spending)",
            "political_capital_cost": "Medium",
            "implementation_time": "2 weeks",
            "trade_offs": "High budget cost, but addresses root cause. Farmers appreciate, but critics call it 'rewarding polluters'."
        }},
        // 4 more options...
    ]
}}
"""

def get_role_context(role):
    """Return role-specific context for action generation"""
    contexts = {
        "Delhi Chief Minister": """
Your priorities: Public approval, health outcomes, budget management. You face elections in 18 months. Supreme Court is watching. You can coordinate with central government but have limited control over neighboring states (Punjab, Haryana). Your key levers: vehicle restrictions, construction bans, emergency funds, public transport subsidies.""",

        "Central Environment Minister": """
Your priorities: Inter-state coordination, compliance with National Clean Air Programme, international reputation. You control subsidies to farmers (agriculture is central subject), industrial emission standards, and forest cover. You must balance farmer votes, industry growth, and health concerns.""",

        "Punjab Agriculture Secretary": """
Your priorities: Farmer incomes, crop timelines, rural livelihoods. Your farmers face ₹1,500/acre cost for stubble alternatives vs ₹0 for burning. Delays in clearing fields mean delayed wheat planting = lower yields = financial ruin. You're blamed for Delhi's pollution but argue it's Delhi's vehicles and industries that are the real culprit.""",

        "Industry Association Leader": """
Your priorities: Economic growth, jobs, competitiveness. Your members (brick kilns, factories, construction) contribute to pollution but also to GDP. Compliance with emission controls costs money. You fear relocations to other states if Delhi is too strict. You can negotiate timelines and technology adoption rates.""",

        "Public Health Director": """
Your priorities: Minimize hospitalizations and deaths, protect vulnerable populations (children, elderly). You have data showing pollution's toll but limited power to enforce restrictions. You can declare health emergencies, issue advisories, and demand action from politicians.""",

        "Civil Society Activist": """
Your priorities: Accountability, transparency, long-term solutions. You can mobilize protests, file court cases, generate media attention. You're critical of short-term symbolic actions and demand structural change. You amplify public alarm but also risk being dismissed as 'elitist' if you don't acknowledge farmer/worker constraints.""",

        "Transport Commissioner": """
Your priorities: Reduce vehicular emissions, improve public transport, enforce restrictions. You can implement odd-even schemes, boost metro frequency, ban heavy vehicles, expand CNG/electric fleet. But restrictions hurt commuters and businesses, and enforcement is resource-intensive.""",

        "Weather & Monitoring Chief": """
Your priorities: Accurate forecasting, real-time monitoring, public information. You provide the data others use to make decisions. You can invest in sensor networks, forecasting models, and public alerts. You can advocate for evidence-based policy but have no enforcement power."""
    }
    return contexts.get(role, "Role context not defined.")

def get_aqi_category(aqi):
    """Return AQI category for narrative context"""
    if aqi <= 50:
        return "Good"
    elif aqi <= 100:
        return "Moderate"
    elif aqi <= 200:
        return "Unhealthy"
    elif aqi <= 300:
        return "Very Unhealthy"
    elif aqi <= 400:
        return "Hazardous"
    else:
        return "Severe/Hazardous"

# Example weather descriptions
WEATHER_DESCRIPTIONS = {
    "calm_inversion": "Clear skies but deceptively calm. A strong temperature inversion has formed overnight, trapping pollution close to the ground. Visibility under 500 meters in many areas.",
    "windy_dispersal": "Strong northwesterly winds sweep through the region. The pollution shroud begins to lift, though particulate levels remain elevated.",
    "pre_rain": "Heavy clouds gather. Humidity rises. The city holds its breath, hoping for the cleansing rains that could wash away weeks of accumulated pollution.",
    "post_rain": "After overnight showers, Delhi wakes to clearer skies. The air smells fresh for the first time in weeks. But forecasters warn the relief may be temporary.",
    "diwali_night": "The festival of lights. Despite the ban, firecrackers echo across the city from dusk till dawn. By morning, a thick, acrid haze blankets everything."
}
