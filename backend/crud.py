from sqlalchemy.orm import Session
import uuid
import json
from typing import List, Dict, Any
from . import models, schemas

# All available roles
ALL_ROLES = [
    "Election Commissioner",
    "Tech CEO", 
    "Journalist",
    "Federal Regulator",
    "Campaign Manager",
    "Cybersecurity Expert"
]

def create_game(db: Session, game: schemas.GameCreate) -> models.Game:
    """
    Creates a new game with all players (1 human, 5 AI).
    """
    game_id = f"game_{uuid.uuid4().hex[:8]}"

    # Create the Game instance
    db_game = models.Game(
        id=game_id,
        state="LOBBY",  # Start in LOBBY, then transition via start_game
        round_number=0,
        event_log=[]
    )
    db.add(db_game)
    
    # Create players for all roles
    for role in ALL_ROLES:
        player_id = f"player_{uuid.uuid4().hex[:8]}"
        is_human = (role == game.host_role.value)
        
        db_player = models.Player(
            id=player_id,
            game_id=game_id,
            role_name=role,
            is_human=is_human,
            hidden_score=0,
            has_submitted_actions_for_round=False,
            chosen_actions=[]
        )
        db.add(db_player)
    
    db.commit()
    db.refresh(db_game)
    return db_game

def get_game(db: Session, game_id: str) -> models.Game | None:
    return db.query(models.Game).filter(models.Game.id == game_id).first()

def convert_game_to_state(db_game: models.Game) -> schemas.GameState:
    """
    Converts a database Game model to a GameState schema for the frontend.
    """
    # Convert phase string to enum
    phase_map = {
        "LOBBY": schemas.GamePhase.LOBBY,
        "STARTING": schemas.GamePhase.STARTING, 
        "ACTION": schemas.GamePhase.ACTION,
        "CONSEQUENCE": schemas.GamePhase.CONSEQUENCE,
        "END": schemas.GamePhase.END
    }
    
    # Convert players
    players = []
    for db_player in db_game.players:
        # For now, chosen_actions contains action IDs (strings), not full ActionOption objects
        # We'll convert them to empty ActionOption objects or fetch them properly later
        actions = []
        # TODO: In the future, we should store full action data or fetch it from action_options table
        
        player = schemas.Player(
            id=db_player.id,
            role_name=schemas.RoleName(db_player.role_name),
            is_human=db_player.is_human,
            hidden_score=db_player.hidden_score,
            has_submitted_actions=db_player.has_submitted_actions_for_round,
            actions=actions  # Empty for now since we only store IDs
        )
        players.append(player)
    
    # Convert current event
    current_event = None
    if db_game.current_event:
        current_event = schemas.GameEvent(**db_game.current_event)
    
    # Convert event log
    event_log = []
    if db_game.event_log:
        for log_entry in db_game.event_log:
            event_log.append(schemas.GameLogEntry(**log_entry))
    
    return schemas.GameState(
        id=db_game.id,
        phase=phase_map.get(db_game.state, schemas.GamePhase.LOBBY),
        round=db_game.round_number,
        publicScore=db_game.public_score,
        eventLog=event_log,
        currentEvent=current_event,
        players=players,
        actionOptions=[]
    )

def start_game(db: Session, game_id: str) -> models.Game | None:
    """
    Starts the game by changing its state from LOBBY to ACTION.
    """
    db_game = get_game(db, game_id)
    if not db_game or db_game.state != "LOBBY":
        return None

    # Transition to ACTION phase and set initial round
    db_game.state = "ACTION"
    db_game.round_number = 1
    
    # TODO: In the future, this would generate the initial scenario via Gemini API
    # For now, create a simple placeholder event
    db_game.current_event = {
        "headline": "AI-Generated Misinformation Campaign Detected",
        "detail": "Intelligence agencies have identified a sophisticated AI-powered misinformation campaign targeting the upcoming election. Deep-fake videos and fabricated news articles are spreading rapidly across social media platforms. Public trust in electoral integrity is beginning to waver as citizens struggle to distinguish authentic information from AI-generated content."
    }
    
    # Add placeholder event log entry
    initial_log_entry = {
        "round": 0,
        "narrative": "The nation stands at a crossroads as artificial intelligence begins to reshape the very nature of truth and democracy. Your role in this crisis will determine the fate of public trust in the electoral process.",
        "event": None,
        "playerActions": [],
        "publicScoreChange": 0,
        "publicScoreAfter": db_game.public_score,
        "hiddenScoreChanges": {},
        "geminiCalls": 0
    }
    
    if not db_game.event_log:
        db_game.event_log = []
    db_game.event_log.append(initial_log_entry)
    
    db.commit()
    db.refresh(db_game)
    return db_game

def submit_actions(db: Session, game_id: str, player_id: str, chosen_action_ids: List[str]) -> bool:
    """
    Stores a player's chosen actions for the round.
    """
    db_player = db.query(models.Player).filter(models.Player.id == player_id).first()
    if not db_player:
        return False
    
    # Store the chosen action IDs in the player's chosen_actions field
    db_player.chosen_actions = chosen_action_ids
    db_player.has_submitted_actions_for_round = True
    
    db.commit()
    return True

def update_game_state(db: Session, game_id: str, **updates) -> models.Game | None:
    """
    Updates game state fields.
    """
    db_game = get_game(db, game_id)
    if not db_game:
        return None
    
    for key, value in updates.items():
        if hasattr(db_game, key):
            setattr(db_game, key, value)
    
    db.commit()
    db.refresh(db_game)
    return db_game

def reset_player_actions(db: Session, game_id: str) -> bool:
    """
    Resets all players' actions for a new round.
    """
    db.query(models.Player).filter(models.Player.game_id == game_id).update({
        "has_submitted_actions_for_round": False,
        "chosen_actions": []
    })
    db.commit()
    return True

def update_player_scores(db: Session, game_id: str, score_updates: Dict[str, int]) -> bool:
    """
    Updates hidden scores for players.
    """
    for role_name, score_change in score_updates.items():
        db_player = db.query(models.Player).filter(
            models.Player.game_id == game_id,
            models.Player.role_name == role_name
        ).first()
        
        if db_player:
            db_player.hidden_score += score_change
    
    db.commit()
    return True