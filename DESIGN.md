# AI Risk Tabletop Exercise - Technical Design Document

## 1. Overview

This document outlines the technical design for evolving the AI Risk Tabletop Exercise from a single-player proof-of-concept into a robust, multiplayer web application.

The core architectural goal is to move all game logic and state management to a dedicated backend server. The frontend will be refactored into a "dumb" client that renders the state provided by the server and forwards user input.

## 2. High-Level Architecture

We will implement a **hybrid architecture** that leverages a **REST API** for client-initiated commands and **WebSockets** for real-time, server-pushed state updates.

*   **Backend:** A **FastAPI** (Python) application will manage the game logic, state, and communication with the Google Gemini API.
*   **Frontend:** A **React** application (built with Vite) will manage the UI. State synchronization will be handled by **Zustand**.
*   **Database:** A **PostgreSQL** database will be used for data persistence.

```mermaid
graph TD
    subgraph "Clients (React + Zustand)"
        HumanPlayer1("Human Player 1")
        HumanPlayer2("Human Player 2")
    end

    subgraph "Backend Server (FastAPI)"
        APIServer["REST API"]
        WebSocketServer["WebSocket Server"]
        GameEngine["Game State Machine"]
        GeminiService["Gemini Service"]
        Database["PostgreSQL Database"]
    end

    subgraph "External Services"
        GeminiAPI[("Google Gemini API")]
    end

    HumanPlayer1 -- "HTTP Commands" --> APIServer
    APIServer -- "Processes Actions" --> GameEngine
    GameEngine -- "Updates State" --> Database
    GameEngine -- "Generates Narrative" --> GeminiService
    GeminiService -- "API Call" --> GeminiAPI
    
    GameEngine -- "State Change Event" --> WebSocketServer
    WebSocketServer -- "Pushes 'game_state_update'" --> HumanPlayer1
    WebSocketServer -- "Pushes 'game_state_update'" --> HumanPlayer2

    HumanPlayer1 -- "Persistent Connection" --> WebSocketServer
```

## 3. Game State Machine

The server's Game Engine will manage the game flow according to a formal state machine.

### State Machine Diagram

```mermaid
stateDiagram-v2
    direction LR
    [*] --> LOBBY
    LOBBY --> STARTING: All players joined & host starts
    STARTING --> ACTION: "Scenario Create"
    
    ACTION --> PROCESSING: "Wait" ends (all players acted or timer expires)
    PROCESSING --> ACTION: "Outcome" calculated, next round begins
    PROCESSING --> END: Game over condition met
    
    ACTION --> END: Game aborted
    END --> [*]
```

### Mapping to Conceptual Flow

| Conceptual Term (from diagram) | Formal State | Description |
| :--- | :--- | :--- |
| "All Players ready" | `LOBBY` | The game is waiting for players to join. |
| "Scenario Create" | `STARTING` / `ACTION` | The server generates the pre-round scenario and presents it to the players. |
| "Action/Goals Space" / "Wait" | `ACTION` | The system is waiting for players to choose and submit their actions. |
| "Outcome" | `PROCESSING` | The server has all actions and is calculating the results and the post-round narrative. |
| "> T rounds" -> "End" | `END` | The game has concluded. |

## 4. AI Player and State Transition Logic

The `PROCESSING` state involves a critical sequence of automated, server-side actions. When the game transitions from `ACTION` to `PROCESSING`, the Game Engine executes the following steps in order:

1.  **Notify Clients**: The server immediately pushes a `game_state_update` to all clients, setting the game state to `PROCESSING`. The UI will show a "Waiting for results..." message.
2.  **Generate AI Player Actions**: The server iterates through all players where `is_human` is `false`. For each AI player, it makes a call to the Gemini API (`generateAIPlayerActions`) to determine their actions for the round. These actions are stored temporarily.
3.  **Calculate Consequences**: Once all AI actions have been generated, the server makes a final, comprehensive call to the Gemini API (`generateConsequences`). This call includes the actions taken by *all* players (human and AI).
4.  **Update Database**: The server receives the round's outcome (public score change, hidden score changes, narrative) from the Gemini API. It then updates the `GAMES`, `PLAYERS`, and `ROUNDS` tables in the database with this new information.
5.  **Transition to Next Round**: The Game Engine transitions the game state back to `ACTION` (for the next round) or to `END` if a game-over condition is met. This new, complete game state is then broadcast to all clients via the `game_state_update` WebSocket event.

## 5. Database Schema

The PostgreSQL database will use the following schema to persist all game data.

```mermaid
erDiagram
    GAMES {
        string id PK
        string state "LOBBY, ACTION, END, etc."
        int round_number
        int public_score
        datetime created_at
        datetime updated_at
    }

    PLAYERS {
        string id PK
        string game_id FK
        string role_name
        boolean is_human
        int hidden_score
        boolean has_submitted_actions_for_round "Reset to false each round"
    }

    ROUNDS {
        string id PK
        string game_id FK
        int round_number
        text pre_round_scenario "The state of the world before this round's actions"
        text post_round_narrative "The outcome narrative after this round's actions"
        json hidden_score_changes
        datetime created_at
    }

    ACTION_OPTIONS {
        string id PK
        string round_id FK
        string player_id FK
        string title
        string description
        int cost "Action Points cost"
        boolean is_chosen "True if the player selected this option"
    }

    GAMES ||--o{ PLAYERS : "has"
    GAMES ||--o{ ROUNDS : "has"
    ROUNDS ||--o{ ACTION_OPTIONS : "generates"
    PLAYERS ||--o{ ACTION_OPTIONS : "receives"
```

## 6. API Contract

### REST API Endpoints (Client -> Server)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/games` | Creates a new game instance. |
| `POST` | `/api/games/{game_id}/join` | Allows a player to join an existing game. |
| `POST` | `/api/games/{game_id}/start` | Starts the game (host only). |
| `GET` | `/api/games/{game_id}` | Retrieves the full current state of a game. |
| `POST` | `/api/games/{game_id}/actions` | Submits the chosen actions for the current player. |

### WebSocket Events (Server -> Client)

A client connects to `ws://your-server.com/ws/{game_id}`.

| Event Name | Payload | Description |
| :--- | :--- | :--- |
| `game_state_update` | The entire, updated `GameState` object. | The primary event sent by the server whenever any aspect of the game state changes. This keeps the client in sync. |
| `error` | `{ "message": "Error details..." }` | Sent to a specific client when their action results in an error. |

## 7. Interaction Sequence Diagram (with AI Handling)

This diagram shows the flow of a single game round, including the server-side AI logic.

```mermaid
sequenceDiagram
    participant Client
    participant Server (Game Engine)
    participant Gemini API

    Note over Client, Server (Game Engine): Game is in ACTION state.
    Server (Game Engine)->>Client: Pushes `game_state_update` (state: ACTION)
    Client->>Server (Game Engine): POST /api/games/{id}/actions
    
    Note over Server (Game Engine): All humans have acted. State -> PROCESSING.
    Server (Game Engine)->>Client: Pushes `game_state_update` (state: PROCESSING)
    
    loop For Each AI Player
        Server (Game Engine)->>Gemini API: Request AI Actions for Player X
        Gemini API-->>Server (Game Engine): Return AI Actions
    end
    
    Note over Server (Game Engine): All actions collected.
    Server (Game Engine)->>Gemini API: Request Round Consequences (with all human & AI actions)
    Gemini API-->>Server (Game Engine): Return Round Outcome (narrative, score changes)
    
    Server (Game Engine)->>Server (Game Engine): Update Database
    
    Note over Server (Game Engine): Round complete. State -> ACTION (for next round).
    Server (Game Engine)->>Client: Pushes final `game_state_update` with all round results.
```

## 8. Frontend Architecture Details

The React frontend will be refactored to use **Zustand** for clean and performant state management.

### 8.1. Zustand Store (`src/stores/gameStore.ts`)

A central store will be the single source of truth for all game-related data on the client.

```typescript
import { create } from 'zustand';
import { GameState } from '../types'; // Assuming types are defined

interface GameStore {
  gameState: GameState | null;
  setGameState: (newState: GameState) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  gameState: null,
  setGameState: (newState) => set({ gameState: newState }),
}));
```

### 8.2. Service Layer

All communication with the backend is abstracted into services.

`src/services/apiService.ts`: Handles all REST API calls.
```typescript
// Example function
export const submitActions = async (gameId: string, chosenActionIds: string[]) => {
  const response = await fetch(`/api/games/${gameId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chosen_action_ids: chosenActionIds }),
  });
  return response.json();
};
```

`src/services/webSocketService.ts`: Manages the WebSocket connection lifecycle.
```typescript
import { useGameStore } from '../stores/gameStore';

let socket: WebSocket | null = null;

export const connect = (gameId: string) => {
  if (socket) return;
  socket = new WebSocket(`ws://your-server.com/ws/${gameId}`);

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.event === 'game_state_update') {
      useGameStore.getState().setGameState(message.payload);
    }
  };
};

export const disconnect = () => {
  socket?.close();
  socket = null;
};
```

### 8.3. Component Integration

Components become simple consumers of the store and services.

`src/App.tsx`: Manages the WebSocket connection.
```typescript
import { useEffect } from 'react';
import { connect, disconnect } from './services/webSocketService';
import { useGameStore } from './stores/gameStore';

export default function App() {
  const gameId = useGameStore((state) => state.gameState?.id);

  useEffect(() => {
    if (gameId) {
      connect(gameId);
    }
    return () => {
      disconnect();
    };
  }, [gameId]);

  // ... render components based on gameState
}
```

`src/components/ActionSelection.tsx`: A presentational component.
```typescript
import { useGameStore } from '../stores/gameStore';
import { submitActions } from '../services/apiService';

const ActionSelection = () => {
  const gameId = useGameStore((state) => state.gameState?.id);
  const options = useGameStore((state) => state.gameState?.actionOptions);
  const [selected, setSelected] = useState<string[]>([]);

  const handleConfirm = async () => {
    if (!gameId) return;
    await submitActions(gameId, selected);
  };

  // ... render logic for options and button
};