from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import os
import asyncio
from . import crud, models, schemas
from .database import SessionLocal, engine
from .websocket_manager import manager

# This will create the database tables if they don't exist
models.Base.metadata.create_all(bind=engine)

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def read_root():
    return {"Hello": "World", "status": "Backend is running"}

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "message": "API is working"}

@app.post("/api/games", response_model=schemas.GameState)
def create_game_endpoint(game: schemas.GameCreate, db: Session = Depends(get_db)):
    try:
        print(f"Creating game with host role: {game.host_role}")
        db_game = crud.create_game(db=db, game=game)
        print(f"Game created with ID: {db_game.id}")
        game_state = crud.convert_game_to_state(db_game)
        print(f"Converted game state: {game_state}")
        return game_state
    except Exception as e:
        print(f"Error creating game: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create game: {str(e)}")

@app.get("/api/games/{game_id}", response_model=schemas.GameState)
def read_game_endpoint(game_id: str, db: Session = Depends(get_db)):
    db_game = crud.get_game(db, game_id=game_id)
    if db_game is None:
        raise HTTPException(status_code=404, detail="Game not found")
    return crud.convert_game_to_state(db_game)

@app.post("/api/games/{game_id}/start", response_model=schemas.GameState)
async def start_game_endpoint(game_id: str, db: Session = Depends(get_db)):
    db_game = crud.start_game(db, game_id=game_id)
    if db_game is None:
        raise HTTPException(status_code=400, detail="Could not start game. It may not exist or is not in LOBBY state.")
    
    # After starting, get the full game state and broadcast it
    updated_game = crud.get_game(db, game_id=game_id)
    game_state = crud.convert_game_to_state(updated_game)
    await manager.broadcast(game_id, {"event": "game_state_update", "payload": game_state.dict()})

    return game_state

@app.post("/api/games/{game_id}/actions")
async def submit_actions_endpoint(game_id: str, action_data: schemas.SubmitActionsRequest, db: Session = Depends(get_db)):
    success = crud.submit_actions(
        db,
        game_id=game_id,
        player_id=action_data.player_id,
        chosen_action_ids=action_data.chosen_action_ids
    )
    if not success:
        raise HTTPException(status_code=400, detail="Could not submit actions.")
    
    # Broadcast updated game state
    updated_game = crud.get_game(db, game_id=game_id)
    game_state = crud.convert_game_to_state(updated_game)
    await manager.broadcast(game_id, {"event": "game_state_update", "payload": game_state.dict()})

    return {"message": "Actions received and are being processed."}

@app.get("/api/games/{game_id}/actions/{player_id}")
def get_action_options_endpoint(game_id: str, player_id: str, db: Session = Depends(get_db)):
    """
    Get action options for a specific player in the current round.
    TODO: This will eventually generate options via Gemini API.
    """
    db_game = crud.get_game(db, game_id=game_id)
    if not db_game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    db_player = db.query(models.Player).filter(
        models.Player.id == player_id,
        models.Player.game_id == game_id
    ).first()
    
    if not db_player:
        raise HTTPException(status_code=404, detail="Player not found")
    
    # TODO: Generate role-specific action options via Gemini API
    # For now, return placeholder options based on role
    placeholder_options = [
        {"id": f"action_1_{player_id}", "title": "Investigate Further", "description": "Gather more information before taking action", "cost": 1},
        {"id": f"action_2_{player_id}", "title": "Issue Public Statement", "description": "Make an official statement to address the situation", "cost": 2},
        {"id": f"action_3_{player_id}", "title": "Coordinate Response", "description": "Work with other stakeholders to develop a coordinated response", "cost": 2},
        {"id": f"action_4_{player_id}", "title": "Emergency Measures", "description": "Implement emergency protocols to address immediate threats", "cost": 3}
    ]
    
    return {"options": placeholder_options}


@app.websocket("/ws/{game_id}")
async def websocket_endpoint(websocket: WebSocket, game_id: str):
    await manager.connect(websocket, game_id)
    try:
        while True:
            # Wait for messages from the client
            data = await websocket.receive_text()
            try:
                import json
                message = json.loads(data)
                print(f"Received WebSocket message for game {game_id}: {message}")
                
                # Handle different message types
                if message.get("type") == "ping":
                    await websocket.send_json({"type": "pong", "gameId": game_id})
                # Add other message handlers as needed
                
            except json.JSONDecodeError:
                print(f"Invalid JSON received: {data}")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, game_id)
# @app.websocket("/ws/{game_id}")
# async def websocket_endpoint(websocket: WebSocket, game_id: str):
#     await manager.connect(websocket)
#     try:
#         while True:
#             data = await websocket.receive_text()
#             # Handle WebSocket messages
#     except WebSocketDisconnect:
#         manager.disconnect(websocket)