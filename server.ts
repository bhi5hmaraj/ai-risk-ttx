import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { GameRoom } from './game-server/rooms/GameRoom';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Attach Colyseus to the same HTTP server
  const gameServer = new Server({
    transport: new WebSocketTransport({
      server: httpServer,
    }),
  });

  // Define game room
  gameServer.define('game', GameRoom);

  // Start server
  httpServer.listen(port, () => {
    console.log(`> Next.js + Colyseus ready on http://${hostname}:${port}`);
    console.log(`> WebSocket available at ws://${hostname}:${port}`);
  });
});
