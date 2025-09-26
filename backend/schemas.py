from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum

# --- Enums ---
class GamePhase(str, Enum):
    LOBBY = "LOBBY"
    STARTING = "STARTING"
    ACTION = "ACTION"
    CONSEQUENCE = "CONSEQUENCE"
    END = "END"

class RoleName(str, Enum):
    ELECTION_COMMISSIONER = "Election Commissioner"
    TECH_CEO = "Tech CEO"
    JOURNALIST = "Journalist"
    FEDERAL_REGULATOR = "Federal Regulator"
    CAMPAIGN_MANAGER = "Campaign Manager"
    CYBERSECURITY_EXPERT = "Cybersecurity Expert"

# --- ActionOption Schemas ---
class ActionOptionBase(BaseModel):
    title: str
    description: str
    cost: int

class ActionOptionCreate(ActionOptionBase):
    pass

class ActionOption(ActionOptionBase):
    id: str

    class Config:
        orm_mode = True

# --- Round Schemas ---
class RoundBase(BaseModel):
    round_number: int
    pre_round_scenario: str
    post_round_narrative: str
    hidden_score_changes: dict

class RoundCreate(RoundBase):
    pass

class Round(RoundBase):
    id: str
    game_id: str
    action_options: List[ActionOption] = []

    class Config:
        orm_mode = True

# --- Game Event Schemas ---
class GameEvent(BaseModel):
    headline: str
    detail: str

# --- Player Action Schemas ---
class PlayerRoundActions(BaseModel):
    roleName: RoleName
    actions: List[ActionOption]
    availableOptions: List[ActionOption]
    isHuman: bool

class HiddenScoreUpdate(BaseModel):
    update: int
    justification: str

class GameLogEntry(BaseModel):
    round: int
    narrative: str
    event: Optional[GameEvent]
    playerActions: List[PlayerRoundActions]
    publicScoreChange: int
    publicScoreAfter: int
    hiddenScoreChanges: Dict[RoleName, HiddenScoreUpdate]
    geminiCalls: int

# --- Player Schemas ---
class PlayerBase(BaseModel):
    role_name: RoleName
    is_human: bool

class PlayerCreate(PlayerBase):
    pass

class PlayerJoin(BaseModel):
    chosen_role: RoleName

class Player(PlayerBase):
    id: str
    hidden_score: int
    has_submitted_actions: bool
    actions: List[ActionOption] = []

    class Config:
        orm_mode = True

# --- Game Schemas ---
class GameState(BaseModel):
    id: str
    phase: GamePhase
    round: int
    publicScore: int
    eventLog: List[GameLogEntry]
    currentEvent: Optional[GameEvent]
    players: List[Player]
    actionOptions: List[ActionOption] = []

class GameCreate(BaseModel):
    host_role: RoleName

class Game(BaseModel):
    id: str
    state: str
    round_number: int
    public_score: int
    current_event: Optional[Dict[str, Any]]
    event_log: List[Dict[str, Any]]
    players: List[Player] = []
    rounds: List[Round] = []

    class Config:
        orm_mode = True

class SubmitActionsRequest(BaseModel):
    player_id: str
    chosen_action_ids: List[str]

# --- AI Response Schemas ---
class AIActionOptionsResponse(BaseModel):
    options: List[ActionOption]

class AIHiddenScoreUpdate(BaseModel):
    roleName: RoleName
    update: int
    justification: str

class AIConsequenceResponse(BaseModel):
    narrative: str
    publicScoreUpdate: int
    hiddenScoreUpdates: List[AIHiddenScoreUpdate]
    nextEvent: GameEvent

class AICounterfactualResponse(BaseModel):
    publicScoreUpdate: int