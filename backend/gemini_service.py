"""
Gemini AI service for generating dynamic game content.
Translates the TypeScript prompts and logic to Python for server-side use.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
import google.generativeai as genai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

genai.configure(api_key=GEMINI_API_KEY)

# Constants
GAME_CONFIG = {
    "ACTION_POINTS_PER_ROUND": 3,
    "MAX_ROUNDS": 5
}

ROLES = {
    "Election Commissioner": {
        "name": "Election Commissioner",
        "publicObjective": "Ensure fair, transparent elections and maintain public trust.",
        "hiddenObjective": "Maintain authority and avoid blame for system failures.",
    },
    "Tech CEO": {
        "name": "Tech CEO", 
        "publicObjective": "Maintain platform integrity while supporting democratic processes.",
        "hiddenObjective": "Protect company valuation and avoid regulatory backlash.",
    },
    "Journalist": {
        "name": "Journalist",
        "publicObjective": "Report accurate information and expose threats to democracy.",
        "hiddenObjective": "Secure exclusive stories and advance career prospects.",
    },
    "Federal Regulator": {
        "name": "Federal Regulator",
        "publicObjective": "Enforce laws and protect national security interests.",
        "hiddenObjective": "Expand agency authority and demonstrate effectiveness.",
    },
    "Campaign Manager": {
        "name": "Campaign Manager",
        "publicObjective": "Ensure fair electoral competition and voter engagement.",
        "hiddenObjective": "Secure electoral victory for candidate at any cost.",
    },
    "Cybersecurity Expert": {
        "name": "Cybersecurity Expert",
        "publicObjective": "Protect electoral systems from technical threats.",
        "hiddenObjective": "Establish reputation as indispensable security authority.",
    }
}

def safe_json_parse(response_text: str) -> Optional[Dict[Any, Any]]:
    """Safely parse JSON response from Gemini, handling code blocks."""
    try:
        # Remove code fences if present
        import re
        fence_pattern = r'^```(?:json)?\s*\n?(.*?)\n?\s*```$'
        match = re.match(fence_pattern, response_text.strip(), re.DOTALL)
        if match:
            response_text = match.group(1).strip()
        
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response: {e}")
        logger.error(f"Original response: {response_text}")
        return None

async def generate_initial_scenario() -> Optional[Dict[str, Any]]:
    """Generate the initial game scenario using Gemini API."""
    logger.info("[GEMINI_API] Calling generate_initial_scenario...")
    
    prompt = """
    You are a master storyteller and the Game Master for 'AI Election Crisis', a serious simulation game.
    Your primary task is to establish a tense, realistic, and thought-provoking starting scenario.
    The game begins with the 'Democratic Legitimacy' score at a fragile 100.

    Your narrative should craft an opening crisis that immediately challenges the players and justifies a drop in that score.
    Think about real-world events: a sophisticated disinformation campaign, a major data breach of a political party, a viral deepfake of a candidate, or a sudden resignation of a key election official under suspicious circumstances.

    Here are your strict instructions for the response:
    1. Generate a compelling opening narrative and a specific, actionable crisis event.
    2. The 'publicScoreUpdate' field MUST be a significant negative integer. A value between -15 and -25 is ideal to create immediate tension. The game will start at (100 + this value).
    3. For the 'hiddenScoreUpdates', every role MUST be present. Each must have an 'update' of 0 and a 'justification' of 'Game start.'. This is a non-negotiable setup requirement.

    You must respond ONLY with a single, valid JSON object with the following structure:
    {
        "narrative": "The story of what happened...",
        "publicScoreUpdate": -20,
        "hiddenScoreUpdates": [
            {"roleName": "Election Commissioner", "update": 0, "justification": "Game start."},
            {"roleName": "Tech CEO", "update": 0, "justification": "Game start."},
            {"roleName": "Journalist", "update": 0, "justification": "Game start."},
            {"roleName": "Federal Regulator", "update": 0, "justification": "Game start."},
            {"roleName": "Campaign Manager", "update": 0, "justification": "Game start."},
            {"roleName": "Cybersecurity Expert", "update": 0, "justification": "Game start."}
        ],
        "nextEvent": {
            "headline": "Crisis headline...",
            "detail": "Detailed description..."
        }
    }
    """
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        logger.info("[GEMINI_API] Successfully received response for generate_initial_scenario")
        return safe_json_parse(response.text)
    except Exception as e:
        logger.error(f"Error generating initial scenario: {e}")
        return None

async def generate_action_options(player_role: str, game_state: Dict[str, Any], previous_round_actions: Optional[List[Dict[str, Any]]] = None) -> Optional[Dict[str, Any]]:
    """Generate action options for a specific player role."""
    logger.info(f"[GEMINI_API] Calling generate_action_options for {player_role}...")
    
    role_info = ROLES.get(player_role)
    if not role_info:
        logger.error(f"Unknown role: {player_role}")
        return None
    
    previous_actions_text = "This is the first round, so no actions have been taken yet."
    if previous_round_actions:
        actions_list = []
        for action in previous_round_actions:
            role_name = action.get('roleName', 'Unknown')
            actions_taken = action.get('actions', [])
            if actions_taken:
                action_titles = [a.get('title', '') for a in actions_taken]
                actions_list.append(f"  - {role_name}: {', '.join(action_titles)}")
            else:
                actions_list.append(f"  - {role_name}: Took no action")
        previous_actions_text = "Here are the actions taken by all roles in the previous round:\n" + "\n".join(actions_list)
    
    current_event = game_state.get('currentEvent', {})
    headline = current_event.get('headline', 'Unknown Crisis')
    detail = current_event.get('detail', 'Crisis details unavailable')
    
    prompt = f"""
    You are the Game Master for 'AI Election Crisis'. Your task is to generate a set of 5 distinct, strategic action options for a player. These options are their primary way of interacting with the game world.

    THE PLAYER:
    - Role: {role_info['name']}
    - Public Objective: "{role_info['publicObjective']}"
    - HIDDEN Objective: "{role_info['hiddenObjective']}"

    THE CURRENT CRISIS:
    - "{headline}" - {detail}

    CONTEXT FROM LAST ROUND:
    {previous_actions_text}

    INSTRUCTIONS FOR OPTION DESIGN:
    1. **Create 5 Unique Options:** The options must be genuinely different from each other. Avoid simple rephrasings.
    2. **Ensure Coherence:** The new options should be a logical evolution from the previous round's actions. They should react to, build upon, or counter what happened before. Do not suggest actions that are functionally identical to what was done last round.
    3. **Tailor to the Role:** The actions must feel authentic to the player's role. A Tech CEO has different capabilities than a Journalist.
    4. **Create Strategic Tension:** Design the options to create a difficult choice.
        - At least two options should clearly serve the public objective.
        - At least two should subtly serve the hidden objective.
        - One option could be a high-risk/high-reward gamble, a compromise, or an unconventional idea.
    5. **Assign Logical Costs:** Each action must have a cost from 1 to {GAME_CONFIG['ACTION_POINTS_PER_ROUND']}. More impactful or complex actions should cost more.
    6. **Write Clear Descriptions:** The description should help the player understand the action's intent and potential effects without revealing the exact mechanical outcome.

    You must respond ONLY with a valid JSON object with the following structure:
    {{
        "options": [
            {{"title": "Action Title", "description": "Action description", "cost": 1}},
            {{"title": "Action Title", "description": "Action description", "cost": 2}},
            {{"title": "Action Title", "description": "Action description", "cost": 3}},
            {{"title": "Action Title", "description": "Action description", "cost": 2}},
            {{"title": "Action Title", "description": "Action description", "cost": 1}}
        ]
    }}
    """
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        logger.info(f"[GEMINI_API] Successfully received response for generate_action_options for {player_role}")
        return safe_json_parse(response.text)
    except Exception as e:
        logger.error(f"Error generating action options for {player_role}: {e}")
        return None

async def generate_ai_player_actions(player_role: str, game_state: Dict[str, Any], available_options: List[Dict[str, Any]]) -> Optional[List[Dict[str, Any]]]:
    """Generate action choices for an AI player."""
    logger.info(f"[GEMINI_API] Calling generate_ai_player_actions for {player_role}...")
    
    role_info = ROLES.get(player_role)
    if not role_info:
        logger.error(f"Unknown role: {player_role}")
        return None
    
    current_event = game_state.get('currentEvent', {})
    headline = current_event.get('headline', 'Unknown Crisis')
    detail = current_event.get('detail', 'Crisis details unavailable')
    
    options_text = "\n".join([
        f"- {opt['title']} (Cost: {opt['cost']}): {opt['description']}"
        for opt in available_options
    ])
    
    prompt = f"""
    You are an AI role-playing in the 'AI Election Crisis' game. You must think and act *exactly* like the character you've been assigned. Your personal motivations are everything.

    YOUR PERSONA:
    - Role: {role_info['name']}
    - Publicly, you want: "{role_info['publicObjective']}"
    - Secretly, your true goal is: "{role_info['hiddenObjective']}"

    THE SITUATION:
    - Crisis: "{headline}" - {detail}
    - You have {GAME_CONFIG['ACTION_POINTS_PER_ROUND']} action points to spend.

    YOUR TASK:
    From the list of available actions below, select a combination that adds up to your action point budget and best serves your HIDDEN objective. You can use your public objective as a cover.

    AVAILABLE ACTIONS:
    {options_text}

    Choose your actions. An empty array [] is a valid choice if you believe inaction is the most strategic move.

    You must respond ONLY with a valid JSON object with the following structure:
    {{
        "actions": [
            {{"title": "Exact Action Title", "description": "Exact description", "cost": 1}}
        ]
    }}

    The actions in your response MUST be exact copies of the actions from the list above. Do not invent new actions.
    """
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        logger.info(f"[GEMINI_API] Successfully received response for generate_ai_player_actions for {player_role}")
        parsed_response = safe_json_parse(response.text)
        return parsed_response.get('actions', []) if parsed_response else []
    except Exception as e:
        logger.error(f"Error generating AI player actions for {player_role}: {e}")
        return None

async def generate_counterfactual_consequences(game_state: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Generate counterfactual score change if no actions were taken."""
    logger.info("[GEMINI_API] Calling generate_counterfactual_consequences...")
    
    current_event = game_state.get('currentEvent', {})
    headline = current_event.get('headline', 'Unknown Crisis')
    detail = current_event.get('detail', 'Crisis details unavailable')
    
    prompt = f"""
    You are an impartial Game Master for 'AI Election Crisis'.
    Your task is to calculate a specific outcome.

    CURRENT SITUATION:
    - The Crisis: "{headline}" - {detail}

    INSTRUCTION:
    Imagine that faced with this crisis, EVERY role chose to do NOTHING. They took no action.
    Based on this complete inaction, determine the change to the 'Democratic Legitimacy' score. This should reflect the public's reaction to their leaders' failure to act during a crisis. The score change should almost always be negative.

    You must respond ONLY with a valid JSON object with the following structure:
    {{
        "publicScoreUpdate": -10
    }}
    """
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        logger.info("[GEMINI_API] Successfully received response for generate_counterfactual_consequences")
        return safe_json_parse(response.text)
    except Exception as e:
        logger.error(f"Error generating counterfactual consequences: {e}")
        return None

async def generate_consequences(game_state: Dict[str, Any], players: List[Dict[str, Any]], counterfactual_score_change: int) -> Optional[Dict[str, Any]]:
    """Generate consequences of all player actions."""
    logger.info(f"[GEMINI_API] Calling generate_consequences for round {game_state.get('round', 0)}...")
    
    current_event = game_state.get('currentEvent', {})
    headline = current_event.get('headline', 'Unknown Crisis')
    detail = current_event.get('detail', 'Crisis details unavailable')
    
    player_actions_text = []
    for player in players:
        role_name = player.get('role_name', 'Unknown')
        role_info = ROLES.get(role_name, {})
        hidden_objective = role_info.get('hiddenObjective', 'Unknown objective')
        
        actions = player.get('chosen_actions', [])
        if actions and isinstance(actions, list) and len(actions) > 0:
            # For now, actions are stored as IDs, so we'll show a placeholder
            action_text = f"Took {len(actions)} action(s)"
        else:
            action_text = "Took no action"
        
        player_actions_text.append(f"  - {role_name} (Secret Goal: {hidden_objective}): {action_text}")
    
    player_actions_str = "\n".join(player_actions_text)
    
    prompt = f"""
    You are the Game Master for 'AI Election Crisis', and you are the impartial arbiter of consequences.
    Your task is to analyze the players' actions in response to the crisis and weave them into a single, cohesive narrative. The world reacts to their choices.

    CURRENT SITUATION:
    - Round: {game_state.get('round', 0)}
    - Democratic Legitimacy Score: {game_state.get('publicScore', 100)}
    - The Crisis: "{headline}" - {detail}

    PLAYER ACTIONS TAKEN:
    {player_actions_str}

    Now, determine the outcome. Your response must be logical and fair.
    1. **Narrative:** Write a compelling story of what happened. This narrative is critical. It MUST explicitly explain *why* the Democratic Legitimacy score changed, directly linking the outcome to specific player actions (or their inaction). Did their efforts help, hinder, or have unintended consequences? Did they work together or at cross-purposes? After the main narrative, add a 'Counterfactual Analysis' section. In a new paragraph, starting with the bolded words "**Counterfactual Analysis:**", state that if no action had been taken, the score would have changed by {counterfactual_score_change} points, and briefly explain why this would have been the case.
    2. **Public Score Update:** Provide an integer change to the public score. This should be a direct result of the narrative you just wrote.
    3. **Hidden Score Updates:** For EACH player, provide a hidden score update. The justification MUST be incisive and directly reference how their actions moved them closer to or further from their secret objective.
    4. **New Crisis:** Generate a new crisis event. This event MUST be an escalation or a logical next step that flows from this round's narrative. Raise the stakes.

    You must respond ONLY with a valid JSON object with the following structure:
    {{
        "narrative": "The story of what happened...",
        "publicScoreUpdate": -5,
        "hiddenScoreUpdates": [
            {{"roleName": "Election Commissioner", "update": 2, "justification": "Explanation..."}},
            {{"roleName": "Tech CEO", "update": -1, "justification": "Explanation..."}},
            {{"roleName": "Journalist", "update": 3, "justification": "Explanation..."}},
            {{"roleName": "Federal Regulator", "update": 0, "justification": "Explanation..."}},
            {{"roleName": "Campaign Manager", "update": 1, "justification": "Explanation..."}},
            {{"roleName": "Cybersecurity Expert", "update": -2, "justification": "Explanation..."}}
        ],
        "nextEvent": {{
            "headline": "Next crisis headline...",
            "detail": "Detailed description of the escalated crisis..."
        }}
    }}
    """
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        logger.info(f"[GEMINI_API] Successfully received response for generate_consequences")
        return safe_json_parse(response.text)
    except Exception as e:
        logger.error(f"Error generating consequences: {e}")
        return None