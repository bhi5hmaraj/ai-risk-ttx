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

const portEnv = process.env.PORT;
if (!portEnv) {
  throw new Error('Set PORT to run test-server.ts (e.g., PORT=3004 tsx test-server.ts)');
}
const port = parseInt(portEnv, 10);
gameServer.listen(port);
console.log('Test 6: Listen called');

console.log(`✅ Test server started on ${port}`);
