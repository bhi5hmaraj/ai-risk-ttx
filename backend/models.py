from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class Game(Base):
    __tablename__ = "games"
    id = Column(String, primary_key=True, index=True)
    state = Column(String, default="LOBBY")  # LOBBY, STARTING, ACTION, CONSEQUENCE, END
    round_number = Column(Integer, default=0)
    public_score = Column(Integer, default=100)
    current_event = Column(JSON)  # Store current event as JSON
    event_log = Column(JSON, default=list)  # Store complete event log
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    players = relationship("Player", back_populates="game")
    rounds = relationship("Round", back_populates="game")

class Player(Base):
    __tablename__ = "players"
    id = Column(String, primary_key=True, index=True)
    game_id = Column(String, ForeignKey("games.id"))
    role_name = Column(String)
    is_human = Column(Boolean)
    hidden_score = Column(Integer, default=0)
    has_submitted_actions_for_round = Column(Boolean, default=False)
    chosen_actions = Column(JSON, default=list)  # Store chosen action IDs
    game = relationship("Game", back_populates="players")
    action_options = relationship("ActionOption", back_populates="player")

class Round(Base):
    __tablename__ = "rounds"
    id = Column(String, primary_key=True, index=True)
    game_id = Column(String, ForeignKey("games.id"))
    round_number = Column(Integer)
    pre_round_scenario = Column(String)
    post_round_narrative = Column(String)
    hidden_score_changes = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    game = relationship("Game", back_populates="rounds")
    action_options = relationship("ActionOption", back_populates="round")

class ActionOption(Base):
    __tablename__ = "action_options"
    id = Column(String, primary_key=True, index=True)
    round_id = Column(String, ForeignKey("rounds.id"))
    player_id = Column(String, ForeignKey("players.id"))
    title = Column(String)
    description = Column(String)
    cost = Column(Integer)
    is_chosen = Column(Boolean, default=False)
    round = relationship("Round", back_populates="action_options")
    player = relationship("Player", back_populates="action_options")