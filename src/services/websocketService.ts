// websocketService.ts - Server-based version

let ws: WebSocket | null = null;
let gameId: string | null = null;
let reconnectAttempts = 0;
let gameStateUpdateCallback: ((gameState: any) => void) | null = null;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000;

export const setGameStateCallback = (callback: (gameState: any) => void) => {
  gameStateUpdateCallback = callback;
};

export const connect = (newGameId: string) => {
  // Don't reconnect if we're already connected to the same game
  if (ws && ws.readyState === WebSocket.OPEN && gameId === newGameId) {
    console.log('WebSocket already connected to game:', newGameId);
    return;
  }

  // Clean up existing connection
  if (ws) {
    disconnect();
  }

  gameId = newGameId;
  
  // Use the correct WebSocket URL - adjust this to match your backend
  const wsUrl = `ws://localhost:8000/ws/${gameId}`;
  // For production, use: `wss://your-domain.com/ws/${gameId}`
  
  console.log('Connecting to WebSocket:', wsUrl);
  
  try {
    ws = new WebSocket(wsUrl);
    
    ws.onopen = (event) => {
      console.log('WebSocket connected successfully to game:', gameId);
      reconnectAttempts = 0;
      
      // Send a ping to complete the handshake
      if (ws && ws.readyState === WebSocket.OPEN) {
        console.log('Sending ping to establish connection...');
        ws.send(JSON.stringify({ type: 'ping', gameId }));
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        
        // Handle different message types based on the backend structure
        if (data.event === 'game_state_update' && data.payload) {
          // Backend sends: {"event": "game_state_update", "payload": gameState}
          console.log('Updating game state:', data.payload);
          if (gameStateUpdateCallback) {
            gameStateUpdateCallback(data.payload);
          }
        } else if (data.type) {
          // Handle direct type messages
          switch (data.type) {
            case 'game_state_update':
              if (data.gameState) {
                if (gameStateUpdateCallback) {
                  gameStateUpdateCallback(data.gameState);
                }
              }
              break;
            case 'error':
              console.error('WebSocket error message:', data.message);
              break;
            case 'pong':
              console.log('WebSocket pong received');
              break;
            default:
              console.log('Unknown message type:', data.type);
          }
        } else {
          console.log('Unhandled WebSocket message:', data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error, event.data);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);
      ws = null;
      
      // Only attempt to reconnect if it wasn't a clean close and we haven't exceeded max attempts
      if (!event.wasClean && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        
        setTimeout(() => {
          if (gameId) {
            connect(gameId);
          }
        }, RECONNECT_DELAY);
      } else if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached');
      }
    };
    
  } catch (error) {
    console.error('Error creating WebSocket connection:', error);
  }
};

export const disconnect = () => {
  if (ws) {
    console.log('Disconnecting WebSocket');
    ws.close(1000, 'Client disconnect');
    ws = null;
  }
  gameId = null;
  reconnectAttempts = 0;
};

export const sendMessage = (message: any) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    return true;
  } else {
    console.warn('WebSocket not connected, cannot send message:', message);
    return false;
  }
};

// Get current connection status
export const getConnectionStatus = () => {
  if (!ws) return 'disconnected';
  
  switch (ws.readyState) {
    case WebSocket.CONNECTING:
      return 'connecting';
    case WebSocket.OPEN:
      return 'connected';
    case WebSocket.CLOSING:
      return 'closing';
    case WebSocket.CLOSED:
      return 'disconnected';
    default:
      return 'unknown';
  }
};