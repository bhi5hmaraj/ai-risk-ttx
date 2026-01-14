# Integration Plan v2: CLI-First Approach

## Philosophy

**"Always Working"** — At every checkpoint, you can play a complete game.

**"Observe First"** — CLI shows exactly what server sends. Fix protocol before adding features.

**"Strangle the Old"** — New mechanics wrap around existing ones. Never break current flow.

---

## Current State (What Works Today)

```
LOBBY → ACTION → CONSEQUENCE → END
         │           │
         │           └─ LLM generates consequences
         └─ Human submits action (single choice)
```

**Messages the server sends:**
- `players_init` — Available roles
- `round_start` / `round_result` — Round lifecycle
- `action_options` — Available actions (via some mechanism)
- `game_ended` — Final state

**Messages the server expects:**
- `set_role` — Pick role in lobby
- `start_game` — Host starts
- `submit_action` — Pick an action
- `advance_round` — Move to next round

---

## Revised Checkpoint Plan

### CP0: CLI Skeleton — Connect & Observe (Day 1)

**Goal:** CLI connects to existing server, shows all messages

**No server changes.** Just build a client that logs everything.

```
packages/
  cli/
    package.json
    tsconfig.json
    src/
      index.ts        # Entry point with commander
      client.ts       # Colyseus connection wrapper
      logger.ts       # Pretty-print all messages
      repl.ts         # Interactive command input
```

**Implementation:**

```typescript
// src/client.ts
import { Client, Room } from 'colyseus.js';
import { EventEmitter } from 'events';

export class GameClient extends EventEmitter {
  private client: Client;
  private room?: Room<any>;
  
  constructor(private serverUrl: string = 'ws://localhost:2567') {
    super();
    this.client = new Client(serverUrl);
  }
  
  async create(options: any = {}): Promise<string> {
    this.room = await this.client.create('game_room', options);
    this.setupListeners();
    return this.room.id;
  }
  
  async join(roomId: string, options: any = {}): Promise<void> {
    this.room = await this.client.joinById(roomId, options);
    this.setupListeners();
  }
  
  private setupListeners() {
    if (!this.room) return;
    
    // Log ALL messages
    const originalOnMessage = this.room.onMessage.bind(this.room);
    this.room.onMessage('*', (type: any, message: any) => {
      this.emit('raw_message', { type, message, timestamp: Date.now() });
    });
    
    // State changes
    this.room.onStateChange((state) => {
      this.emit('state_change', this.serializeState(state));
    });
    
    this.room.onLeave((code) => {
      this.emit('disconnected', { code });
    });
    
    this.room.onError((code, message) => {
      this.emit('error', { code, message });
    });
  }
  
  private serializeState(state: any): any {
    // Convert Colyseus schema to plain object
    if (!state) return null;
    return JSON.parse(JSON.stringify(state));
  }
  
  send(type: string, data: any = {}): void {
    if (!this.room) {
      console.error('Not connected');
      return;
    }
    this.emit('sent', { type, data, timestamp: Date.now() });
    this.room.send(type, data);
  }
  
  getState(): any {
    return this.serializeState(this.room?.state);
  }
  
  getSessionId(): string {
    return this.room?.sessionId || '';
  }
  
  getRoomId(): string {
    return this.room?.id || '';
  }
  
  getRoomCode(): string {
    return this.room?.state?.roomCode || this.room?.id || '';
  }
}
```

```typescript
// src/logger.ts
import chalk from 'chalk';

export class MessageLogger {
  private startTime = Date.now();
  
  logReceived(type: string, data: any) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(
      chalk.gray(`[${elapsed}s]`),
      chalk.green('◀ RECV'),
      chalk.cyan(type),
    );
    this.logData(data);
  }
  
  logSent(type: string, data: any) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(
      chalk.gray(`[${elapsed}s]`),
      chalk.yellow('▶ SEND'),
      chalk.cyan(type),
    );
    this.logData(data);
  }
  
  logState(state: any) {
    console.log(chalk.magenta('⬤ STATE'), this.summarizeState(state));
  }
  
  private logData(data: any) {
    if (!data || Object.keys(data).length === 0) return;
    const json = JSON.stringify(data, null, 2);
    const lines = json.split('\n');
    lines.forEach(line => console.log(chalk.gray('  ' + line)));
  }
  
  private summarizeState(state: any): string {
    if (!state) return 'null';
    const parts = [
      `phase=${state.phase}`,
      `round=${state.round}`,
      `score=${state.publicScore}`,
      `players=${state.players ? Object.keys(state.players).length : 0}`,
    ];
    return parts.join(' | ');
  }
}
```

```typescript
// src/repl.ts
import * as readline from 'readline';
import { GameClient } from './client';

export class GameREPL {
  private rl: readline.Interface;
  
  constructor(private client: GameClient) {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }
  
  async start() {
    console.log('\nCommands:');
    console.log('  /state         - Show current state');
    console.log('  /send <type> <json> - Send message');
    console.log('  /role <name>   - Set role');
    console.log('  /start         - Start game (host only)');
    console.log('  /action <id> <cost> - Submit action');
    console.log('  /advance       - Advance round');
    console.log('  /quit          - Exit');
    console.log('');
    
    this.prompt();
  }
  
  private prompt() {
    this.rl.question(chalk.gray('> '), (input) => {
      this.handleInput(input.trim());
      this.prompt();
    });
  }
  
  private handleInput(input: string) {
    if (!input) return;
    
    const [cmd, ...args] = input.split(' ');
    
    switch (cmd) {
      case '/state':
        console.log(JSON.stringify(this.client.getState(), null, 2));
        break;
        
      case '/send':
        const type = args[0];
        const data = args.slice(1).join(' ');
        try {
          this.client.send(type, data ? JSON.parse(data) : {});
        } catch (e) {
          console.error('Invalid JSON:', e);
        }
        break;
        
      case '/role':
        this.client.send('set_role', { role: args.join(' '), name: 'CLI-Player' });
        break;
        
      case '/start':
        this.client.send('start_game', {});
        break;
        
      case '/action':
        this.client.send('submit_action', { 
          actionId: args[0] || 'default', 
          cost: parseInt(args[1]) || 1 
        });
        break;
        
      case '/advance':
        this.client.send('advance_round', {});
        break;
        
      case '/quit':
        process.exit(0);
        
      default:
        console.log('Unknown command:', cmd);
    }
  }
}

import chalk from 'chalk';
```

```typescript
// src/index.ts
import { Command } from 'commander';
import { GameClient } from './client';
import { MessageLogger } from './logger';
import { GameREPL } from './repl';

const program = new Command();

program
  .name('sim')
  .description('Simulacra CLI client')
  .version('0.1.0');

program
  .command('create')
  .description('Create a new game room')
  .option('-h, --host <url>', 'Server URL', 'ws://localhost:2567')
  .option('-n, --name <name>', 'Player name', 'CLI-Host')
  .action(async (opts) => {
    const client = new GameClient(opts.host);
    const logger = new MessageLogger();
    
    // Wire up logging
    client.on('raw_message', ({ type, message }) => logger.logReceived(type, message));
    client.on('sent', ({ type, data }) => logger.logSent(type, data));
    client.on('state_change', (state) => logger.logState(state));
    client.on('disconnected', ({ code }) => console.log('Disconnected:', code));
    
    console.log(`Connecting to ${opts.host}...`);
    const roomId = await client.create({ name: opts.name, isHost: true });
    console.log(`\nRoom created! Code: ${client.getRoomCode()}\n`);
    console.log(`Others can join with: sim join ${client.getRoomCode()}\n`);
    
    const repl = new GameREPL(client);
    await repl.start();
  });

program
  .command('join <roomCode>')
  .description('Join an existing game')
  .option('-h, --host <url>', 'Server URL', 'ws://localhost:2567')
  .option('-n, --name <name>', 'Player name', 'CLI-Player')
  .action(async (roomCode, opts) => {
    const client = new GameClient(opts.host);
    const logger = new MessageLogger();
    
    client.on('raw_message', ({ type, message }) => logger.logReceived(type, message));
    client.on('sent', ({ type, data }) => logger.logSent(type, data));
    client.on('state_change', (state) => logger.logState(state));
    client.on('disconnected', ({ code }) => console.log('Disconnected:', code));
    
    console.log(`Connecting to ${opts.host}...`);
    await client.join(roomCode, { name: opts.name });
    console.log(`\nJoined room: ${roomCode}\n`);
    
    const repl = new GameREPL(client);
    await repl.start();
  });

program
  .command('watch <roomCode>')
  .description('Watch messages without interactive mode')
  .option('-h, --host <url>', 'Server URL', 'ws://localhost:2567')
  .action(async (roomCode, opts) => {
    const client = new GameClient(opts.host);
    const logger = new MessageLogger();
    
    client.on('raw_message', ({ type, message }) => logger.logReceived(type, message));
    client.on('state_change', (state) => logger.logState(state));
    client.on('disconnected', ({ code }) => {
      console.log('Disconnected:', code);
      process.exit(0);
    });
    
    console.log(`Watching ${roomCode}...`);
    await client.join(roomCode, { spectator: true });
    
    // Just wait
    await new Promise(() => {});
  });

program.parse();
```

**Tasks:**
- [ ] Create `packages/cli` directory
- [ ] `npm init` and add dependencies: `colyseus.js`, `commander`, `chalk`
- [ ] Add scripts to package.json: `"sim": "npx tsx src/index.ts"`
- [ ] Implement client.ts, logger.ts, repl.ts, index.ts
- [ ] Test: `npm run sim create`, see messages

**Test:**
```bash
# Terminal 1
cd packages/cli
npm run sim create

# Terminal 2 (once you see room code)
npm run sim join ABCD1234
```

**Success criteria:** See all server messages logged. Can send commands. Game plays through existing flow.

---

### CP1: CLI Plays Full Game (Day 2)

**Goal:** CLI can play through entire existing game loop

**Still no server changes.** Just make CLI handle all current phases.

**Add phase-aware rendering:**

```typescript
// src/phases.ts
import chalk from 'chalk';
import inquirer from 'inquirer';
import { GameClient } from './client';

export async function handlePhase(client: GameClient, phase: string, state: any) {
  console.log(chalk.bold(`\n--- ${phase.toUpperCase()} ---\n`));
  
  switch (phase) {
    case 'lobby':
      await handleLobby(client, state);
      break;
    case 'action':
      await handleAction(client, state);
      break;
    case 'consequence':
      await handleConsequence(client, state);
      break;
    case 'end':
      handleEnd(state);
      break;
  }
}

async function handleLobby(client: GameClient, state: any) {
  // Show players
  console.log('Players:');
  const players = state.players ? Object.values(state.players) : [];
  players.forEach((p: any) => {
    const you = p.sessionId === client.getSessionId() ? chalk.yellow(' (you)') : '';
    const role = p.role || 'No role';
    console.log(`  ${p.name} - ${role}${you}`);
  });
  
  // Check if we have a role
  const me = players.find((p: any) => p.sessionId === client.getSessionId());
  if (!me?.role) {
    console.log(chalk.gray('\nYou need to select a role. Use /role <name>'));
  }
  
  // Check if we're host
  if (state.hostId === client.getSessionId()) {
    console.log(chalk.yellow('\nYou are the host. Use /start when ready.'));
  }
}

async function handleAction(client: GameClient, state: any) {
  console.log(`Round ${state.round}/${state.maxRounds}`);
  console.log(`Public Score: ${state.publicScore}`);
  
  const me = state.players?.[client.getSessionId()];
  if (me) {
    console.log(`Your AP: ${me.actionPoints}`);
    console.log(`Submitted: ${me.hasSubmitted ? 'Yes' : 'No'}`);
  }
  
  if (!me?.hasSubmitted) {
    console.log(chalk.gray('\nUse /action <id> <cost> to submit an action'));
  } else {
    console.log(chalk.gray('\nWaiting for other players...'));
  }
}

async function handleConsequence(client: GameClient, state: any) {
  console.log('Processing consequences...');
  console.log(chalk.gray('Use /advance to continue to next round'));
}

function handleEnd(state: any) {
  console.log(chalk.bold.green('\n=== GAME OVER ===\n'));
  console.log(`Final Score: ${state.publicScore}`);
  console.log(`Rounds Played: ${state.round}`);
}
```

**Wire into main loop:**

```typescript
// Update src/index.ts to use phase handlers
client.on('state_change', async (state) => {
  logger.logState(state);
  if (state.phase !== lastPhase) {
    lastPhase = state.phase;
    await handlePhase(client, state.phase, state);
  }
});
```

**Tasks:**
- [ ] Add `inquirer` dependency for interactive prompts
- [ ] Create phases.ts with handlers for each existing phase
- [ ] Track phase changes, trigger handlers
- [ ] Test: play full game via CLI

**Test:**
```bash
# Terminal 1: Create game
npm run sim create
/role "Election Commissioner"
/start

# Terminal 2: Join
npm run sim join XXXX
/role "Tech CEO"

# Play through:
/action "some-action" 2
/advance
# ... continue until END
```

**Success criteria:** Can play entire game via CLI. See all messages. Game reaches END.

---

### CP2: CLI Auto-Mode (Day 3)

**Goal:** CLI can run automated/scripted games for testing

```typescript
// src/auto.ts
import { GameClient } from './client';

export interface AutoConfig {
  autoSelectRole?: boolean;
  autoSubmitAction?: boolean;
  autoAdvance?: boolean;
  delayMs?: number;
}

export class AutoPlayer {
  constructor(
    private client: GameClient,
    private config: AutoConfig = {}
  ) {}
  
  async handlePhase(phase: string, state: any) {
    const delay = this.config.delayMs || 500;
    
    switch (phase) {
      case 'lobby':
        if (this.config.autoSelectRole && !this.hasRole(state)) {
          await this.sleep(delay);
          const availableRole = this.findAvailableRole(state);
          if (availableRole) {
            this.client.send('set_role', { role: availableRole, name: 'AutoBot' });
          }
        }
        break;
        
      case 'action':
        if (this.config.autoSubmitAction && !this.hasSubmitted(state)) {
          await this.sleep(delay);
          this.client.send('submit_action', { actionId: 'auto', cost: 1 });
        }
        break;
        
      case 'consequence':
        if (this.config.autoAdvance) {
          await this.sleep(delay);
          this.client.send('advance_round', {});
        }
        break;
    }
  }
  
  private hasRole(state: any): boolean {
    const me = state.players?.[this.client.getSessionId()];
    return !!me?.role;
  }
  
  private hasSubmitted(state: any): boolean {
    const me = state.players?.[this.client.getSessionId()];
    return !!me?.hasSubmitted;
  }
  
  private findAvailableRole(state: any): string | null {
    // This depends on how your server exposes available roles
    // For now, just return a default
    return 'Tech CEO';
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Add auto command:**

```typescript
// In src/index.ts
program
  .command('auto <roomCode>')
  .description('Join and auto-play')
  .option('-h, --host <url>', 'Server URL', 'ws://localhost:2567')
  .action(async (roomCode, opts) => {
    const client = new GameClient(opts.host);
    const logger = new MessageLogger();
    const auto = new AutoPlayer(client, {
      autoSelectRole: true,
      autoSubmitAction: true,
      autoAdvance: false,  // Let human control pacing
      delayMs: 1000,
    });
    
    client.on('raw_message', ({ type, message }) => logger.logReceived(type, message));
    client.on('state_change', async (state) => {
      logger.logState(state);
      await auto.handlePhase(state.phase, state);
    });
    
    await client.join(roomCode, { name: 'AutoBot' });
    await new Promise(() => {});
  });
```

**Add test script:**

```typescript
// scripts/test-game.ts
import { GameClient } from '../src/client';

async function runTest() {
  const host = new GameClient();
  const bot = new GameClient();
  
  // Host creates
  await host.create({ name: 'TestHost', isHost: true });
  const roomCode = host.getRoomCode();
  console.log('Room:', roomCode);
  
  // Bot joins
  await bot.join(roomCode, { name: 'TestBot' });
  
  // Wait for both connected
  await sleep(500);
  
  // Set roles
  host.send('set_role', { role: 'Election Commissioner', name: 'Host' });
  bot.send('set_role', { role: 'Tech CEO', name: 'Bot' });
  await sleep(500);
  
  // Start
  host.send('start_game', {});
  
  // Track phases
  let round = 0;
  host.on('state_change', (state) => {
    if (state.phase === 'action' && state.round !== round) {
      round = state.round;
      console.log(`\n=== ROUND ${round} ===`);
      
      // Both submit
      host.send('submit_action', { actionId: 'test', cost: 1 });
      bot.send('submit_action', { actionId: 'test', cost: 1 });
    }
    
    if (state.phase === 'consequence') {
      host.send('advance_round', {});
    }
    
    if (state.phase === 'end') {
      console.log('\n=== TEST PASSED ===');
      console.log('Final score:', state.publicScore);
      process.exit(0);
    }
  });
  
  // Timeout
  setTimeout(() => {
    console.error('TEST TIMEOUT');
    process.exit(1);
  }, 60000);
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
});
```

**Tasks:**
- [ ] Create AutoPlayer class
- [ ] Add `auto` command
- [ ] Create test script
- [ ] Run: `npx tsx scripts/test-game.ts`

**Success criteria:** Automated test plays full game, exits with success.

---

### CP3: Add Resources to Server (Day 4)

**Goal:** Server tracks resources, CLI displays them

**NOW we touch the server.** But minimally — just add fields, don't change flow.

**Server changes:**

```typescript
// packages/backend/src/room/schema/GameState.ts
// Add to Player class:
@type("number") resourceM: number = 50;
@type("number") resourceI: number = 50;
@type("number") resourceN: number = 50;

// packages/backend/src/room/adapters/stateManager.ts
// Add to CorePlayer interface (or create new one):
interface CorePlayerResources {
  M: number;
  I: number;
  N: number;
}

// In StateManager, initialize from role:
addPlayer(player: CorePlayer): void {
  // Set initial resources based on role
  player.resources = player.role?.initialResources || { M: 50, I: 50, N: 50 };
  this.corePlayers.set(player.id, player);
}
```

**CLI changes:**

```typescript
// src/phases.ts - Update handleAction
async function handleAction(client: GameClient, state: any) {
  console.log(`Round ${state.round}/${state.maxRounds}`);
  console.log(`Public Score: ${state.publicScore}`);
  
  const me = state.players?.[client.getSessionId()];
  if (me) {
    console.log(`\nYour Resources:`);
    console.log(`  Material (M):     ${progressBar(me.resourceM, 100)}`);
    console.log(`  Institutional (I): ${progressBar(me.resourceI, 100)}`);
    console.log(`  Narrative (N):    ${progressBar(me.resourceN, 100)}`);
    console.log(`\nAP: ${me.actionPoints}`);
  }
}

function progressBar(value: number, max: number): string {
  const width = 20;
  const filled = Math.round((value / max) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled) + ` ${value}`;
}
```

**Tasks:**
- [ ] Add resource fields to Player schema
- [ ] Initialize resources in StateManager
- [ ] Update stateAdapter to project resources
- [ ] Update CLI to display resources
- [ ] Test: resources show in CLI

**Success criteria:** CLI shows M/I/N resources. Values initialize from role. Game still plays.

---

### CP4: Add Policy to Server (Day 5)

**Goal:** Players can set policy, server stores it

**Server changes:**

```typescript
// packages/backend/src/room/handlers/PolicyHandler.ts (new file)
export class PolicyHandler {
  constructor(private deps: HandlerDeps) {}
  
  handleUpdatePolicy(client: Client, data: any) {
    const player = this.deps.stateManager.getCorePlayer(client.sessionId);
    if (!player) return;
    
    // Store policy (just data for now, doesn't affect anything)
    player.policy = {
      goals: data.policy?.goals || [],
      priority: data.policy?.priority || 'balanced',
      stances: data.policy?.stances || {},
    };
    
    this.deps.logger.info(this.deps.rid, 'Policy updated', {
      playerId: client.sessionId,
      policy: player.policy,
    });
    
    // Broadcast to all
    this.deps.broadcast('policy_updated', {
      playerId: client.sessionId,
      policy: player.policy,
    });
  }
}

// In GameRoom.ts - register message
this.onMessage('update_policy', (client, data) => {
  this.policyHandler.handleUpdatePolicy(client, data);
});
```

**CLI changes:**

```typescript
// src/repl.ts - add policy command
case '/policy':
  const goals = args.join(' ') || 'Survive';
  client.send('update_policy', {
    policy: {
      goals: [goals],
      priority: 'balanced',
      stances: {},
    }
  });
  break;
```

**Tasks:**
- [ ] Create PolicyHandler
- [ ] Register `update_policy` message
- [ ] Store policy in CorePlayer
- [ ] Broadcast `policy_updated`
- [ ] Add `/policy` command to CLI
- [ ] Test: set policy, see broadcast

**Success criteria:** Can set policy via CLI. Other clients see `policy_updated` message. Game still works.

---

### CP5: Intent Data Structure (Day 6)

**Goal:** Server generates intent objects (but selection still uses old flow)

**Server changes:**

```typescript
// packages/backend/src/services/intentGenerator.ts (new file)
export interface Intent {
  id: string;
  source: string;
  target: string;
  cost: number;
  deltas: {
    targetResources?: { M?: number; I?: number; N?: number };
    sourceResources?: { M?: number; I?: number; N?: number };
    coreMetric?: number;
  };
  title: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
}

// Convert existing action options to intents
export function actionOptionsToIntents(
  options: ActionOption[],
  playerId: string
): Intent[] {
  return options.map((opt, i) => ({
    id: `${playerId}-intent-${i}`,
    source: playerId,
    target: 'GLOBAL',  // Default, can be refined
    cost: opt.cost,
    deltas: {
      coreMetric: estimateCoreMetricDelta(opt),  // Heuristic
    },
    title: opt.title,
    description: opt.description,
    risk: 'medium',
  }));
}

function estimateCoreMetricDelta(opt: ActionOption): number {
  // Simple heuristic based on action type
  // This will be replaced by LLM generation later
  return 0;
}
```

**Broadcast intents alongside action_options:**

```typescript
// When generating action options, also send intents
const options = await generateActionOptions(...);
const intents = actionOptionsToIntents(options, playerId);

// Send both (backwards compat)
client.send('action_options', { options });
client.send('intents_available', { intents });
```

**CLI changes:**

```typescript
// Listen for intents_available
client.on('raw_message', ({ type, message }) => {
  if (type === 'intents_available') {
    console.log('\nAvailable Intents:');
    message.intents.forEach((intent: any, i: number) => {
      console.log(`  ${i + 1}. [${intent.cost} AP] ${intent.title}`);
      console.log(`     → ${intent.target}`);
      if (intent.deltas.coreMetric) {
        console.log(`     G: ${intent.deltas.coreMetric > 0 ? '+' : ''}${intent.deltas.coreMetric}`);
      }
    });
  }
});
```

**Tasks:**
- [ ] Create Intent interface
- [ ] Create actionOptionsToIntents converter
- [ ] Send `intents_available` alongside `action_options`
- [ ] CLI displays intents
- [ ] Old flow still works (submit_action unchanged)

**Success criteria:** CLI shows intent format. Old action submission still works. Game plays through.

---

### CP6: Intent Selection (Day 7)

**Goal:** Can select intents instead of actions (both work)

**Server changes:**

```typescript
// packages/backend/src/room/handlers/IntentSelectionHandler.ts
export class IntentSelectionHandler {
  handleSelectIntents(client: Client, data: { intentIds: string[] }) {
    const player = this.deps.stateManager.getCorePlayer(client.sessionId);
    if (!player) return;
    
    // Find matching intents
    const selected = data.intentIds
      .map(id => player.availableIntents?.find(i => i.id === id))
      .filter(Boolean);
    
    // Validate AP
    const totalCost = selected.reduce((sum, i) => sum + i.cost, 0);
    if (totalCost > player.actionPoints) {
      client.send('error', { message: 'Exceeds AP' });
      return;
    }
    
    // Store selection
    player.selectedIntentIds = data.intentIds;
    
    // Convert to old format for existing flow
    player.actions = selected.map(i => ({
      title: i.title,
      description: i.description,
      cost: i.cost,
    }));
    player.hasSubmittedActions = true;
    
    // Update schema
    const schemaPlayer = this.deps.state.players.get(client.sessionId);
    if (schemaPlayer) {
      schemaPlayer.hasSubmitted = true;
      schemaPlayer.actionPoints -= totalCost;
    }
    
    this.deps.broadcast('player_ready', { playerId: client.sessionId });
    
    // Check all submitted (existing logic)
    if (this.deps.state.allSubmitted()) {
      this.deps.onAllSubmitted(client);
    }
  }
}

// Register message
this.onMessage('select_intents', (client, data) => {
  this.intentSelectionHandler.handleSelectIntents(client, data);
});
```

**CLI changes:**

```typescript
// Add /select command
case '/select':
  const ids = args;  // e.g., /select intent-0 intent-2
  client.send('select_intents', { intentIds: ids });
  break;
```

**Tasks:**
- [ ] Create IntentSelectionHandler
- [ ] Register `select_intents` message
- [ ] Convert selected intents to old action format (bridge)
- [ ] Trigger existing submission flow
- [ ] Add `/select` command to CLI
- [ ] Test: both /action and /select work

**Success criteria:** Can use either `submit_action` (old) or `select_intents` (new). Both complete the round.

---

### CP7-10: Continue Adding Phases

**CP7 (Day 8):** Add COUNTER phase
- Server: After reveal, send `incoming_intents` per player
- Server: Handle `submit_counters` message
- CLI: Show incoming, `/counter <id>` command

**CP8 (Day 9):** Add resolution math
- Server: Apply contested/uncontested effectiveness
- Server: Update resources based on deltas
- CLI: Show resolution breakdown

**CP9 (Day 10):** Add ENV agent
- Server: ENV generates intents when G is low
- Server: ENV intents included in reveal
- CLI: Show ENV actions distinctly

**CP10 (Day 11):** Full debrief
- Server: Generate rich RoundDebrief
- Server: LLM narrative
- CLI: Pretty-print debrief

---

## Message Evolution

| Checkpoint | Old Messages (keep working) | New Messages (add) |
|------------|-----------------------------|--------------------|
| CP0-CP2 | All existing | None |
| CP3 | All existing | None (just schema fields) |
| CP4 | All existing | `update_policy`, `policy_updated` |
| CP5 | All existing | `intents_available` |
| CP6 | `submit_action` | `select_intents`, `player_ready` |
| CP7 | All above | `incoming_intents`, `submit_counters` |
| CP8 | All above | `resolution_complete` |
| CP9 | All above | (ENV intents in existing messages) |
| CP10 | All above | `round_debrief` |

---

## Testing Strategy

After each checkpoint:

```bash
# 1. Manual test with CLI
npm run sim create
# Play through game manually

# 2. Automated test
npm run test:game
# Should complete without errors

# 3. Existing UI test (if you have one)
# Open browser, play through existing UI
# Should still work
```

---

## Summary

**Days 1-3:** CLI only, no server changes
**Days 4-6:** Add data structures, keep old flow
**Days 7-10:** Add new phases incrementally

At every step, both old flow AND new features work. CLI shows exactly what's happening. You can always play a game.
