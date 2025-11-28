// IMPORTANT: Sentry must be imported first for proper instrumentation
require('./instrument');

import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Server, matchMaker } from 'colyseus';
import { createServer } from 'http';
import cors from 'cors';
import { monitor } from '@colyseus/monitor';
import { GameRoom } from './rooms/GameRoom';
import * as Sentry from './instrument';

console.log('[DEBUG] All imports complete');

const portEnv = process.env.PORT;
if (!portEnv) {
  throw new Error('[server] PORT env var is required. Set PORT (or run via scripts/dev-colyseus.mjs which injects it).');
}
const port = parseInt(portEnv, 10);
const dev = process.env.NODE_ENV !== 'production';
console.log(`[DEBUG] Port: ${port}, Dev: ${dev}`);

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

        if (origin.includes('localhost') || origin.endsWith('.a.run.app')) {
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
    server,  // Pass server directly to Server constructor
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

gameServer.define('game', GameRoom)
    .enableRealtimeListing()
    .filterBy(['mode']); // Allow filtering rooms by game mode

expressApp.use('/colyseus-admin', monitor());

expressApp.get('/healthz', (req: ExpressRequest, res: ExpressResponse) => {
    res.status(200).send('OK');
});

// Debug endpoint to test Sentry (remove in production or protect with auth)
if (dev) {
    expressApp.get('/debug-sentry', (req: ExpressRequest, res: ExpressResponse) => {
        throw new Error('Sentry test error from /debug-sentry');
    });
}

// Sentry error handler (safe no-op if not configured)
if ((Sentry as any)?.Handlers?.errorHandler) {
    expressApp.use((Sentry as any).Handlers.errorHandler());
}

// When passing server directly to Server constructor, use gameServer.listen()
console.log(`[DEBUG] About to call gameServer.listen(${port})`);
gameServer.listen(port);
console.log('[DEBUG] gameServer.listen() returned');

// Graceful shutdown on signals
process.on('SIGINT', () => {
    console.log('[DEBUG] SIGINT received. Shutting down Colyseus...');
    gameServer.gracefullyShutdown();
});
process.on('SIGTERM', () => {
    console.log('[DEBUG] SIGTERM received. Shutting down Colyseus...');
    gameServer.gracefullyShutdown();
});

console.log(`🎮 Colyseus server ready on http://localhost:${port}`);
console.log(`📊 Monitor: http://localhost:${port}/colyseus-admin`);
console.log(`🏥 Health: http://localhost:${port}/healthz`);
