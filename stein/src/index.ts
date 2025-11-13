import express from 'express';
import { createServer } from 'http';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './rooms/GameRoom.js';

const app = express();
const port = process.env.PORT || 2567;

// Enable CORS for Next.js dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || 'http://localhost:3000');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'stein' });
});

// Create HTTP server
const httpServer = createServer(app);

// Attach Colyseus
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

// Define game room
gameServer.define('game', GameRoom);

httpServer.listen(port, () => {
  console.log(`🎮 Stein server listening on http://localhost:${port}`);
  console.log(`📡 Colyseus WebSocket: ws://localhost:${port}`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
});
