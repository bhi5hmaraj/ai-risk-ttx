// IMPORTANT: Sentry must be imported first for proper instrumentation
require('./instrument');

import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import next from 'next';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import cors from 'cors';
import { monitor } from '@colyseus/monitor';
import { GameRoom } from './rooms/GameRoom';
import * as Sentry from './instrument';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
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
        transport: new WebSocketTransport({
            server,
            pingInterval: 5000,
            pingMaxRetries: 3,
        }),
    });

    gameServer.define('game', GameRoom)
        .enableRealtimeListing()
        // Increase seat reservation time to 30 seconds (default is 3s)
        // This gives clients more time to establish WebSocket connection
        // especially important when Next.js dev server is slow or network is laggy
        .filterBy(['mode']); // Allow filtering rooms by game mode

    // Configure seat reservation timeout
    // Default is 3 seconds which is too short for Next.js dev mode
    gameServer.gracefullyShutdown(false);

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

    // Sentry error handler MUST be before Next.js fallback handler
    Sentry.setupExpressErrorHandler(expressApp);

    // Next.js fallback handler (MUST be last)
    expressApp.use((req: ExpressRequest, res: ExpressResponse) => {
        return handle(req as any, res as any);
    });

    // Try to start on specified port, increment if in use
    let currentPort = port;
    const maxAttempts = 10;

    function startServer(attemptPort: number, attempt: number = 0): void {
        if (attempt >= maxAttempts) {
            console.error(`Failed to start server after ${maxAttempts} attempts`);
            process.exit(1);
        }

        try {
            gameServer.listen(attemptPort);
            console.log(`> Ready on http://localhost:${attemptPort}`);
            console.log(`> Colyseus monitor: http://localhost:${attemptPort}/colyseus-admin`);
        } catch (err: any) {
            if (err.code === 'EADDRINUSE') {
                console.warn(`Port ${attemptPort} is in use, trying ${attemptPort + 1}...`);
                startServer(attemptPort + 1, attempt + 1);
            } else {
                throw err;
            }
        }
    }

    startServer(currentPort);
});
