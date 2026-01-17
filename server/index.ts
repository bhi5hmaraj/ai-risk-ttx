// IMPORTANT: Sentry must be imported first for proper instrumentation
require('./instrument');

import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Server, matchMaker } from 'colyseus';
import { createServer } from 'http';
import cors from 'cors';
import { monitor } from '@colyseus/monitor';
import { GameRoom } from './rooms/GameRoom';
import { LobbyRoom } from 'colyseus';
import * as Sentry from './instrument';
import { slog, serr, swarn, createReqId } from './lib/logger';
import { loadSecrets } from '../lib/infisical';
import { logRuntimeEnv } from '../lib/envDebug';

// Load secrets from Infisical before starting server
(async () => {
  await loadSecrets();
  logRuntimeEnv('stein');

  startServer();
})();

function startServer() {
const portEnv = process.env.PORT;
if (!portEnv) {
  throw new Error('[server] PORT env var is required. Set PORT (or run via scripts/dev-colyseus.mjs which injects it).');
}
const port = parseInt(portEnv, 10);

const expressApp = express();

expressApp.use(cors({
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'https://simulacra.cc',
            'https://canary.simulacra.cc',
            process.env.NEXT_PUBLIC_APP_URL
        ].filter(Boolean) as string[];

        if (origin.includes('localhost') || origin.endsWith('.a.run.app') || origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        if (allowedOrigins.indexOf(origin) === -1) {
            var msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }
}));
expressApp.use(express.json());

const server = createServer(expressApp);
const gameServer = new Server({
    server,
});

// Proper CORS for Colyseus matchmaker (per docs)
// https://docs.colyseus.io/recipes/custom-cors-headers#custom-cors-headers
(matchMaker as any).controller.getCorsHeaders = function (req: any) {
    const origin = (req.headers && req.headers['origin']) || (req as any).getHeader?.('origin');
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Credentials': 'true',
    };
};

  gameServer.define('lobby', LobbyRoom);

  gameServer.define('game', GameRoom)
      .enableRealtimeListing()
      .filterBy(['gameId']); // Allow filtering rooms by gameId - clients with same gameId join same room

expressApp.use('/colyseus-admin', monitor());

// Cloud Run seems to intercept `/healthz` externally; keep `/healthz` for local checks
// and add `/` as a simple externally curlable probe.
expressApp.get('/', (req: ExpressRequest, res: ExpressResponse) => {
    res.status(200).send('OK');
});

expressApp.get('/healthz', (req: ExpressRequest, res: ExpressResponse) => {
    res.status(200).send('OK');
});

// SSR snapshot route (SSR-only): returns a sanitized snapshot of the live room state
expressApp.get('/games/:gameId/snapshot', async (req: ExpressRequest, res: ExpressResponse) => {
    const { gameId } = req.params as { gameId: string };
    try {
        // Find the room with this gameId via matchmaker query
        const rooms = await matchMaker.query({ name: 'game', gameId });
        if (!rooms || rooms.length === 0) {
            return res.status(404).json({ error: 'game_not_found' });
        }
        const roomId = rooms[0].roomId;
        const snapshot = await (matchMaker as any).remoteRoomCall(roomId, 'getSnapshot');
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(snapshot || {});
    } catch (err) {
        console.error('[snapshot] error', err);
        return res.status(500).json({ error: 'snapshot_failed' });
    }
});

// Sentry error handler (safe no-op if not configured)
if ((Sentry as any)?.Handlers?.errorHandler) {
    expressApp.use((Sentry as any).Handlers.errorHandler());
}

gameServer.listen(port);

// Graceful shutdown on signals
process.on('SIGINT', () => {
    console.log('[server] SIGINT received. Shutting down Colyseus...');
    gameServer.gracefullyShutdown();
});
process.on('SIGTERM', () => {
    console.log('[server] SIGTERM received. Shutting down Colyseus...');
    gameServer.gracefullyShutdown();
});

console.log(`\n🚀 Colyseus server listening on port ${port}`);
console.log(`   🎮 WebSocket (Game): ws://localhost:${port}`);
console.log(`   📊 Colyseus Monitor: http://localhost:${port}/colyseus-admin`);
console.log(`   🏥 Health Check:     http://localhost:${port}/healthz\n`);
}
