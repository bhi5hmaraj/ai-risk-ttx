# Colyseus Server Debugging Timeline

**Status**: ✅ RESOLVED
**Date**: 2025-11-28
**Issue**: Colyseus server failing to listen on port 3004

## Problem Summary

The Colyseus server was showing "Ready" messages in console but not actually listening on port 3004. The frontend was inaccessible and `curl localhost:3004` returned "Connection refused".

## Root Causes Identified

1. **Next.js blocking server startup** - Server was wrapped in `app.prepare().then()` from old Next.js integration
2. **Incorrect WebSocketTransport pattern** - Using transport wrapper instead of direct server passing
3. **Port configuration mismatch** - Fallback port was 3000 in dev script instead of 3004
4. **ES module import hoisting** - Console.log statements between imports never executed
5. **Old cached code** - tsx cache showing outdated "Ready" messages

## Debugging Steps (Chronological)

### Step 1: Initial Investigation
- Read server/index.ts and found Next.js code still present
- Checked logs showing server printing "Ready" but port not listening
- Ran `lsof -i :3004` → empty (port not bound)

### Step 2: Architecture Review (User Insight)
**User question**: "why dont we serve the FE statically? Do we even need the next server?"

This was the KEY insight. We:
- Fetched Colyseus HTTP routes documentation
- Discovered server was wrapped in `app.prepare().then()` blocking startup
- **Decision**: Remove Next.js completely, serve frontend separately

### Step 3: Remove Next.js Integration
**Changed in `server/index.ts`**:

```typescript
// REMOVED:
const next = require('next');
const app = next({ dev });
app.prepare().then(() => {
  // server code here
});

// NEW: Direct Express setup
const expressApp = express();
const server = createServer(expressApp);
const gameServer = new Server({ server });
```

### Step 4: Fix Server Initialization Pattern
**Changed in `server/index.ts`**:

```typescript
// OLD (incorrect):
const gameServer = new Server({
  transport: new WebSocketTransport({
    server,
    pingInterval: 5000,
    pingMaxRetries: 3,
  }),
});

// NEW (correct):
const server = createServer(expressApp);
const gameServer = new Server({
  server,  // Pass server directly
});
```

### Step 5: Compare with Working Example
**User provided**: `/home/bhishma/Documents/code/llm-reward-hacking-demos/warden_dilemma`

Key finding: Working example used same pattern we were implementing:
```typescript
const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });
gameServer.listen(port);
```

### Step 6: Port Configuration Fix (User Catch)
**User insight**: "are we sure we are defining the port in all the places? Make sure we dont use 3000 in some place and 3004 in another"

**Fixed in `scripts/dev-colyseus.mjs:27`**:
```javascript
// BEFORE (BUG):
const port = commandLinePort || process.env.PORT || '3000';

// AFTER (FIXED):
const port = commandLinePort || process.env.PORT || '3004';
```

### Step 7: Mysterious Hanging Issue
After fixes, running `npx tsx server/index.ts` produced **zero output** - not even first console.log.

**Debug approach**:
1. Added extensive debug logging between imports
2. Cleared tsx cache
3. Created minimal test server

### Step 8: Minimal Test Server (Isolation)
**Created `test-server.ts`**:
```typescript
console.log('Test 1: Starting');
import express from 'express';
console.log('Test 2: Express imported');
import { Server } from 'colyseus';
console.log('Test 3: Colyseus imported');
import { createServer } from 'http';
console.log('Test 4: http imported');

const app = express();
const httpServer = createServer(app);
const gameServer = new Server({ server: httpServer });
console.log('Test 5: Server created');
gameServer.listen(3004);
console.log('Test 6: Listen called');
console.log('✅ Test server started on 3004');
```

**Result**: ✅ This worked perfectly! Server listened on port 3004.

### Step 9: ES Module Import Hoisting Discovery
**Root cause**: In ES modules, ALL imports are hoisted and executed FIRST. Console.log statements between imports never execute.

**Buggy code in `server/index.ts`**:
```typescript
import express from 'express';
console.log('[DEBUG] Express imported');  // ❌ This never prints!
import { Server } from 'colyseus';
console.log('[DEBUG] Colyseus imported');  // ❌ This never prints!
```

**Fix**: Move ALL console.log to AFTER all imports:
```typescript
// IMPORTANT: Sentry must be imported first for proper instrumentation
require('./instrument');

import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import cors from 'cors';
import { monitor } from '@colyseus/monitor';
import { GameRoom } from './rooms/GameRoom';
import * as Sentry from './instrument';

console.log('[DEBUG] All imports complete');  // ✅ NOW it prints!

const port = parseInt(process.env.PORT || '3004', 10);
const dev = process.env.NODE_ENV !== 'production';
console.log(`[DEBUG] Port: ${port}, Dev: ${dev}`);
```

## Final Solution

### File: `server/index.ts`
```typescript
// IMPORTANT: Sentry must be imported first for proper instrumentation
require('./instrument');

import express, { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import cors from 'cors';
import { monitor } from '@colyseus/monitor';
import { GameRoom } from './rooms/GameRoom';
import * as Sentry from './instrument';

console.log('[DEBUG] All imports complete');

const port = parseInt(process.env.PORT || '3004', 10);
const dev = process.env.NODE_ENV !== 'production';
console.log(`[DEBUG] Port: ${port}, Dev: ${dev}`);

const expressApp = express();

expressApp.use(cors({
    origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
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

gameServer.define('game', GameRoom)
    .enableRealtimeListing()
    .filterBy(['mode']);

gameServer.gracefullyShutdown(false);

expressApp.use('/colyseus-admin', monitor());

expressApp.get('/healthz', (req: ExpressRequest, res: ExpressResponse) => {
    res.status(200).send('OK');
});

if (dev) {
    expressApp.get('/debug-sentry', (req: ExpressRequest, res: ExpressResponse) => {
        throw new Error('Sentry test error from /debug-sentry');
    });
}

Sentry.setupExpressErrorHandler(expressApp);

console.log(`[DEBUG] About to call gameServer.listen(${port})`);
gameServer.listen(port);
console.log('[DEBUG] gameServer.listen() returned');

console.log(`🎮 Colyseus server ready on http://localhost:${port}`);
console.log(`📊 Monitor: http://localhost:${port}/colyseus-admin`);
console.log(`🏥 Health: http://localhost:${port}/healthz`);
```

### File: `scripts/dev-colyseus.mjs` (line 27)
```javascript
const port = commandLinePort || process.env.PORT || '3004';  // Fixed from '3000'
```

## Success Verification

After all fixes, running `PORT=3004 pnpm run dev:colyseus` produces:

```
[dev-colyseus] Loaded .env.local
[dev-colyseus] Using port: 3004
[dev-colyseus] Starting Colyseus server on port 3004...
[DEBUG] All imports complete
[DEBUG] Port: 3004, Dev: true
[DEBUG] About to call gameServer.listen(3004)
[DEBUG] gameServer.listen() returned
🎮 Colyseus server ready on http://localhost:3004
📊 Monitor: http://localhost:3004/colyseus-admin
🏥 Health: http://localhost:3004/healthz

       ___      _
      / __\___ | |_   _ ___  ___ _   _ ___
     / /  / _ \| | | | / __|/ _ \ | | / __|
    / /__| (_) | | |_| \__ \  __/ |_| \__ \
    \____/\___/|_|\__, |___/\___|\__,_|___/
                  |___/

     · Multiplayer Framework for Node.js ·
```

**Verification commands**:
```bash
lsof -i :3004              # Shows node process listening
curl localhost:3004/healthz # Returns "OK"
```

## Key Learnings

1. **Next.js removal was necessary** - Server-side rendering framework was blocking the Colyseus server
2. **Colyseus Server constructor patterns** - Direct server passing vs WebSocketTransport wrapper
3. **ES module import hoisting** - All imports execute before any other code, including console.log
4. **Port consistency matters** - Check all configuration files for hardcoded ports
5. **User insights are valuable** - User questioning architecture led to the main fix
6. **Minimal test cases** - Creating `test-server.ts` helped isolate the ES module issue

## Remaining Warnings (Non-blocking)

1. **Sentry warning**: `[Sentry] express is not instrumented. This is likely because you required/imported express before calling Sentry.init()`
   - Non-critical, Sentry still works
   - Could be fixed by restructuring imports

2. **Deprecation warning**: WebSocketTransport options will move to transport in v0.15
   - No action needed yet, current code works
   - Will need update when upgrading to Colyseus v0.15

## References

- Working example: `/home/bhishma/Documents/code/llm-reward-hacking-demos/warden_dilemma`
- Colyseus docs: https://docs.colyseus.io/server/http-routes
- Test files created: `test-server.ts`, `test-gameroom.ts`
